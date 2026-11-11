import { and, eq, or, sql, type SQL } from "drizzle-orm";
import { ticketRequesterProfiles } from "$lib/server/db/ticketRequesterSchema";
import { tickets } from "$lib/server/db/supportSchema";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizedVerifiedEmail(email: string | null): string | null {
  const normalized = email?.trim().toLowerCase() ?? "";
  return EMAIL_PATTERN.test(normalized) ? normalized : null;
}

export function originalEmailSenderCondition(email: string | null): SQL {
  const verifiedEmail = normalizedVerifiedEmail(email);
  if (!verifiedEmail) return sql`false`;

  return and(
    eq(tickets.channel, "email"),
    sql`EXISTS (
      SELECT 1 FROM ticket_events original
      WHERE original.ticket_id = ${tickets.id}
        AND original.event_type = 'ticket.created'
        AND original.metadata->>'channel' = 'email'
        AND lower(original.metadata->>'senderEmail') = ${verifiedEmail}
    )`,
  ) ?? sql`false`;
}

export function customerTicketOwnershipCondition(
  contactId: string,
  verifiedEmail: string | null,
): SQL {
  return or(
    eq(tickets.customerContactId, contactId),
    sql`EXISTS (
      SELECT 1 FROM ${ticketRequesterProfiles} requester
      WHERE requester.ticket_id = ${tickets.id}
        AND requester.customer_contact_id = ${contactId}::uuid
    )`,
    originalEmailSenderCondition(verifiedEmail),
  ) ?? sql`false`;
}
