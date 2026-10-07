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
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";

const PROVIDER = "brevo";

type TicketEmailRoute = {
  code: "financeiro" | "sucesso";
  email: string;
  name: string;
};

function publicEmailRoutes(): TicketEmailRoute[] {
  return [
    {
      code: "financeiro",
      email: (env.BREVO_FINANCE_INBOX_EMAIL || "financeiro@f10.com.br").trim().toLowerCase(),
      name: "Financeiro F10",
    },
    {
      code: "sucesso",
      email: (env.BREVO_SUCCESS_INBOX_EMAIL || "sucesso@f10.com.br").trim().toLowerCase(),
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

  if (!ticket || ticket.channel !== "email") return false;

  const [thread] = await db
    .select({
      senderName: supportEmailThreads.senderName,
      senderEmail: supportEmailThreads.senderEmail,
      inboxCode: supportEmailThreads.inboxCode,
    })
    .from(supportEmailThreads)
    .where(eq(supportEmailThreads.ticketId, ticketId))
    .limit(1);

  const recipientEmail = (thread?.senderEmail || ticket.customerEmail || "").trim().toLowerCase();
  if (!recipientEmail || !recipientEmail.includes("@")) return false;

  const recipientName = thread?.senderName || ticket.customerName || undefined;
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
    textContent: [
      body.trim(),
      "",
      `Ticket #${ticket.ticketNumber}`,
      "Você pode responder diretamente a este e-mail para continuar o atendimento.",
    ].join("\n"),
    htmlContent: buildEmailHtml({
      eyebrow: `Ticket #${ticket.ticketNumber}`,
      title: ticket.subject,
      ...(recipientName ? { greeting: `Olá, ${recipientName}.` } : {}),
      body: emailParagraphs(body),
      footer: "Responda diretamente a este e-mail para continuar o atendimento no mesmo ticket.",
    }),
  });

  return true;
}
