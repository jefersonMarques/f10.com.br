import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import { customerContacts, tickets } from "$lib/server/db/supportSchema";
import { serviceRequestEmailRecipients, serviceRequests } from "$lib/server/db/serviceRequestSchema";
import { buildEmailHtml } from "$lib/server/email/emailTemplate";
import { sendTransactionalEmail } from "$lib/server/email/transactionalEmail";
import { getTicketOperatorEmailSettings } from "$lib/server/settings/ticketOperatorEmailSettings";
import { listEligibleTicketResponders } from "$lib/server/support/supportRoutingRepository";

export async function notifyTicketOperatorsByEmail(ticketId: string): Promise<void> {
  const settings = await getTicketOperatorEmailSettings();
  if (!settings.enabled || settings.recipientUserIds.length === 0) return;

  const eligible = await listEligibleTicketResponders();
  const recipientIds = new Set(settings.recipientUserIds);

  const [serviceRequest] = await getDatabase()
    .select({ type: serviceRequests.requestType })
    .from(serviceRequests)
    .where(eq(serviceRequests.ticketId, ticketId))
    .limit(1);

  if (serviceRequest) {
    const alreadyNotified = await getDatabase()
      .select({ userId: serviceRequestEmailRecipients.recipientUserId })
      .from(serviceRequestEmailRecipients)
      .where(eq(serviceRequestEmailRecipients.requestType, serviceRequest.type));

    for (const entry of alreadyNotified) recipientIds.delete(entry.userId);
  }

  const recipients = eligible.filter((user) => recipientIds.has(user.id));
  if (recipients.length === 0) return;

  const [ticket] = await getDatabase()
    .select({
      number: tickets.ticketNumber,
      subject: tickets.subject,
      customerName: customerContacts.name,
      createdBy: users.name,
    })
    .from(tickets)
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .leftJoin(users, eq(tickets.createdByUserId, users.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) return;

  const ticketUrl = `https://f10.com.br/app/tickets/${encodeURIComponent(ticketId)}`;
  const title = `Novo ticket #${ticket.number}`;
  const message = ticket.subject.trim().slice(0, 180);

  const outcomes = await Promise.allSettled(recipients.map(async (recipient) => {
    await sendTransactionalEmail({
      to: { email: recipient.email, name: recipient.name },
      subject: `[F10] ${title} · ${message}`,
      textContent: [
        title,
        `Assunto: ${message}`,
        `Cliente: ${ticket.customerName ?? "Não identificado"}`,
        `Criado por: ${ticket.createdBy ?? "Cliente"}`,
        "",
        `Abrir atendimento: ${ticketUrl}`,
      ].join("\n"),
      htmlContent: buildEmailHtml({
        eyebrow: "Novo atendimento",
        title,
        greeting: `Olá, ${recipient.name}.`,
        body: [
          `Assunto: ${message}`,
          `Cliente: ${ticket.customerName ?? "Não identificado"}`,
          `Criado por: ${ticket.createdBy ?? "Cliente"}`,
        ],
        action: { label: "Abrir ticket", href: ticketUrl },
        footer: "Aviso automático do F10 Operations.",
      }),
      tags: ["ticket-created"],
    });
  }));

  outcomes.forEach((outcome, index) => {
    if (outcome.status === "rejected") {
      console.error("[ticket.operator_email.failed]", {
        ticketId,
        recipientUserId: recipients[index]?.id,
        errorCode: outcome.reason instanceof Error ? outcome.reason.message : "SEND_FAILED",
      });
    }
  });
}
