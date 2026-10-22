import { randomBytes } from "node:crypto";
import { env } from "$env/dynamic/private";
import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { supportEmailThreads } from "$lib/server/db/supportEmailSchema";
import {
  customerContacts,
  supportQueues,
  tickets,
} from "$lib/server/db/supportSchema";
import { buildEmailHtml } from "$lib/server/email/emailTemplate";
import { getCustomerPortalBaseUrl } from "$lib/server/customerPortal/customerPortalMailer";
import { requestTicketSatisfaction } from "$lib/server/support/ticketSatisfactionService";
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";

const PROVIDER = "brevo";

type TicketEmailRoute = {
  code: "financeiro" | "sucesso";
  email: string;
  name: string;
};

function publicEmailRoutes(): TicketEmailRoute[] {
  const domain = replyDomain();
  return [
    {
      code: "financeiro",
      email: `financeiro@${domain}`,
      name: "Financeiro F10",
    },
    {
      code: "sucesso",
      email: `sucesso@${domain}`,
      name: "Sucesso F10",
    },
  ];
}

function resolveEmailRoute(code: string | null | undefined): TicketEmailRoute | null {
  return publicEmailRoutes().find((route) => route.code === code) ?? null;
}

function replyDomain(): string {
  return (env.BREVO_INBOUND_DOMAIN?.trim().toLowerCase() || "reply.f10.com.br")
    .replace(/^@+/, "");
}

function createReplyToken(): string {
  return randomBytes(24).toString("hex");
}

function replyAddress(token: string): string {
  return `ticket+${token}@${replyDomain()}`;
}

async function ensureReplyToken(input: {
  ticketId: string;
  recipientEmail: string;
  recipientName: string | null;
  inboxCode: string;
}): Promise<string> {
  const db = getDatabase();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const [current] = await db
      .select()
      .from(supportEmailThreads)
      .where(eq(supportEmailThreads.ticketId, input.ticketId))
      .limit(1);

    if (current?.replyToken) return current.replyToken;

    const token = createReplyToken();

    if (current) {
      const [updated] = await db
        .update(supportEmailThreads)
        .set({ replyToken: token, updatedAt: new Date() })
        .where(eq(supportEmailThreads.id, current.id))
        .returning({ replyToken: supportEmailThreads.replyToken });
      if (updated?.replyToken) return updated.replyToken;
      continue;
    }

    const [created] = await db
      .insert(supportEmailThreads)
      .values({
        provider: PROVIDER,
        conversationId: `ticket:${input.ticketId}`,
        ticketId: input.ticketId,
        inboxCode: input.inboxCode,
        senderName: input.recipientName,
        senderEmail: input.recipientEmail,
        recipientEmail: replyAddress(token),
        replyToken: token,
      })
      .onConflictDoNothing()
      .returning({ replyToken: supportEmailThreads.replyToken });

    if (created?.replyToken) return created.replyToken;
  }

  throw new Error("TICKET_EMAIL_REPLY_ROUTE_NOT_CREATED");
}

function emailParagraphs(body: string): string[] {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((item) => item.replace(/\n+/g, " ").trim())
    .filter(Boolean);
  return paragraphs.length ? paragraphs : [body.trim()];
}

export async function sendTicketPublicReplyEmail(
  ticketId: string,
  body: string,
  attachments: Array<{ name: string; content: string }> = [],
): Promise<boolean> {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      channel: tickets.channel,
      queueCode: supportQueues.code,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
    })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) return false;

  const [thread] = await db
    .select({
      senderName: supportEmailThreads.senderName,
      senderEmail: supportEmailThreads.senderEmail,
      inboxCode: supportEmailThreads.inboxCode,
    })
    .from(supportEmailThreads)
    .where(eq(supportEmailThreads.ticketId, ticketId))
    .limit(1);

  const recipientEmail = (ticket.customerEmail || thread?.senderEmail || "").trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes("@")) return false;

  const recipientName = ticket.customerName || thread?.senderName || undefined;
  const emailRoute =
    resolveEmailRoute(thread?.inboxCode)
    || resolveEmailRoute(ticket.queueCode);
  const token = await ensureReplyToken({
    ticketId,
    recipientEmail,
    recipientName: recipientName ?? null,
    inboxCode: emailRoute?.code ?? "ticket-reply",
  });
  const address = replyAddress(token);
  const ticketUrl = `${getCustomerPortalBaseUrl("https://f10.com.br")}/cliente/chamados/${encodeURIComponent(ticketId)}`;
  const subject = `[#${ticket.ticketNumber}] ${ticket.subject}`;

  await sendTransactionalEmail({
    to: {
      email: recipientEmail,
      ...(recipientName ? { name: recipientName } : {}),
    },
    ...(emailRoute
      ? { sender: { email: emailRoute.email, name: emailRoute.name } }
      : {}),
    replyTo: { email: address, name: "F10 Suporte" },
    subject,
    ...(attachments.length ? { attachments } : {}),
    textContent: [
      body.trim(),
      "",
      `Ticket #${ticket.ticketNumber}`,
      "Você pode responder diretamente a este e-mail para continuar o atendimento.",
      `Acompanhe seu chamado no painel: ${ticketUrl}`,
    ].join("\n"),
    htmlContent: buildEmailHtml({
      eyebrow: `Ticket #${ticket.ticketNumber}`,
      title: ticket.subject,
      ...(recipientName ? { greeting: `Olá, ${recipientName}.` } : {}),
      body: emailParagraphs(body),
      action: { label: "Ver chamado no painel", href: ticketUrl },
      footer: "Responda diretamente a este e-mail para continuar o atendimento no mesmo ticket.",
    }),
  });

  return true;
}

/** Called only after a persisted status transition, including workflow moves. */
export async function notifyCustomerOfTicketStatus(
  ticketId: string,
  previousStatus: string | null,
): Promise<void> {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      status: tickets.status,
      number: tickets.ticketNumber,
      subject: tickets.subject,
      queueCode: supportQueues.code,
      name: customerContacts.name,
      email: customerContacts.email,
    })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket || ticket.status === previousStatus) return;
  if (!["waiting_customer", "resolved", "closed"].includes(ticket.status)) return;

  // The existing survey sends the resolution email and an evaluation link.
  // It is unique per ticket; never send a second satisfaction survey.
  if (ticket.status === "resolved" || ticket.status === "closed") {
    const sentSurvey = await requestTicketSatisfaction(ticketId);
    if (sentSurvey || ticket.status === "closed") return;
  }

  const [thread] = await db
    .select({
      name: supportEmailThreads.senderName,
      email: supportEmailThreads.senderEmail,
      inboxCode: supportEmailThreads.inboxCode,
    })
    .from(supportEmailThreads)
    .where(eq(supportEmailThreads.ticketId, ticketId))
    .limit(1);
  const recipient = (ticket.email?.trim() || thread?.email?.trim() || "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return;
  const name = ticket.name?.trim() || thread?.name?.trim() || undefined;
  const route = resolveEmailRoute(thread?.inboxCode) || resolveEmailRoute(ticket.queueCode);
  const portalUrl = `${getCustomerPortalBaseUrl("https://f10.com.br")}/cliente/chamados/${encodeURIComponent(ticketId)}`;
  const waiting = ticket.status === "waiting_customer";
  const headline = waiting ? "Seu atendimento aguarda uma resposta" : "Seu atendimento foi resolvido";
  const description = waiting
    ? "Precisamos da sua resposta para continuar o atendimento. Você pode responder a este e-mail ou acessar o chamado no painel."
    : "Concluímos seu atendimento. Você pode consultar os detalhes no painel de chamados.";
  const token = await ensureReplyToken({
    ticketId,
    recipientEmail: recipient,
    recipientName: name ?? null,
    inboxCode: route?.code ?? "ticket-reply",
  });
  await sendTransactionalEmail({
    to: { email: recipient, ...(name ? { name } : {}) },
    ...(route ? { sender: { email: route.email, name: route.name } } : {}),
    replyTo: { email: replyAddress(token), name: "F10 Suporte" },
    subject: `[#${ticket.number}] ${headline}`,
    textContent: [
      `Olá${name ? `, ${name}` : ""}.`,
      "", description,
      `Ticket #${ticket.number} — ${ticket.subject}`,
      `Acesse seu chamado: ${portalUrl}`,
    ].join("\n"),
    htmlContent: buildEmailHtml({
      eyebrow: `Ticket #${ticket.number}`,
      title: headline,
      ...(name ? { greeting: `Olá, ${name}.` } : {}),
      body: [description, ticket.subject],
      action: { label: "Acompanhar chamado", href: portalUrl },
      footer: "A consulta no painel exige acesso à área do cliente.",
    }),
  });
}
