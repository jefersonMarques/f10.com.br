import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketCreationNotifications } from "$lib/server/db/ticketCreationNotificationSchema";
import { customerContacts, tickets } from "$lib/server/db/supportSchema";
import { sendNewNonEmailTicketAcknowledgement } from "$lib/server/support/ticketEmailService";

type NotificationOrigin = "manual" | "portal" | "web_chat";

type TicketCreationNotificationInput = {
  ticketId: string;
  origin: NotificationOrigin;
  messageBody: string;
  expectedContactId?: string;
  verifiedPortalEmail?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function notifyNewTicketCustomer(
  input: TicketCreationNotificationInput,
): Promise<void> {
  const db = getDatabase();
  const [ticket] = await db.select({
    id: tickets.id,
    contactId: tickets.customerContactId,
    channel: tickets.channel,
    email: customerContacts.email,
    name: customerContacts.name,
  })
    .from(tickets)
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .where(eq(tickets.id, input.ticketId))
    .limit(1);

  if (!ticket || ticket.channel !== input.origin || !ticket.contactId) return;
  if (input.expectedContactId && input.expectedContactId !== ticket.contactId) return;

  const email = (input.verifiedPortalEmail || ticket.email || "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return;

  const [claim] = await db.insert(ticketCreationNotifications).values({
    ticketId: ticket.id,
    recipientEmail: email,
    status: "sending",
    attemptedAt: new Date(),
  })
    .onConflictDoNothing()
    .returning({ ticketId: ticketCreationNotifications.ticketId });
  if (!claim) return;

  try {
    const sent = await sendNewNonEmailTicketAcknowledgement({
      ticketId: ticket.id,
      sender: { email, name: ticket.name },
      messageBody: input.messageBody,
    });

    await db.update(ticketCreationNotifications)
      .set({
        status: sent ? "sent" : "skipped",
        ...(sent ? { sentAt: new Date() } : {}),
      })
      .where(and(
        eq(ticketCreationNotifications.ticketId, ticket.id),
        eq(ticketCreationNotifications.status, "sending"),
      ));
  } catch (cause) {
    const errorCode = cause instanceof Error && /^BREVO_[A-Z_]+(?::\d{3})?$/.test(cause.message)
      ? cause.message
      : "TICKET_CREATION_EMAIL_FAILED";

    await db.update(ticketCreationNotifications)
      .set({ status: "failed", errorCode })
      .where(and(
        eq(ticketCreationNotifications.ticketId, ticket.id),
        eq(ticketCreationNotifications.status, "sending"),
      ))
      .catch(() => undefined);

    console.error("[ticket.creation.email_failed]", {
      ticketId: ticket.id,
      origin: input.origin,
      errorCode,
      errorType: cause instanceof Error ? cause.name : typeof cause,
    });
  }
}
