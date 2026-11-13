import { and, eq, isNull, or, sql, type SQL } from "drizzle-orm";
import { ticketRequesterProfiles } from "$lib/server/db/ticketRequesterSchema";
import { customerContacts, tickets } from "$lib/server/db/supportSchema";

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
    or(
      isNull(tickets.customerContactId),
      sql`EXISTS (
        SELECT 1 FROM ${customerContacts} contact
        WHERE contact.id = ${tickets.customerContactId}
          AND lower(contact.email) = ${verifiedEmail}
      )`,
    ),
    sql`EXISTS (
      SELECT 1 FROM ticket_events original
      WHERE original.ticket_id = ${tickets.id}
        AND original.event_type = 'ticket.created'
        AND original.metadata->>'channel' = 'email'
        AND lower(original.metadata->>'senderEmail') = ${verifiedEmail}
    )`,
  ) ?? sql`false`;
}

function contactOrMergedSourceCondition(column: SQL, contactId: string): SQL {
  return sql`${column} IN (
    SELECT ${contactId}::uuid
    UNION ALL
    SELECT merge.source_contact_id FROM customer_contact_merges merge
    WHERE merge.target_contact_id = ${contactId}::uuid
  )`;
}

function authorizedContractScope(contactId: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ticket_contract_links link
    WHERE link.ticket_id = ${tickets.id}
  ) AND NOT EXISTS (
    SELECT 1 FROM ticket_contract_links link
    WHERE link.ticket_id = ${tickets.id}
      AND NOT EXISTS (
        SELECT 1 FROM customer_contract_access access
        WHERE access.customer_contact_id = ${contactId}::uuid
          AND access.unit_id = link.unit_id
          AND access.contract_id = link.contract_id
      )
  )`;
}

export function explicitTicketRequesterCondition(contactId: string): SQL {
  return sql`EXISTS (
    SELECT 1 FROM ${ticketRequesterProfiles} requester
    WHERE requester.ticket_id = ${tickets.id}
      AND ${contactOrMergedSourceCondition(
        sql`requester.customer_contact_id`, contactId,
      )}
  )`;
}

export function customerTicketOwnershipCondition(
  contactId: string,
  verifiedEmail: string | null,
): SQL {
  const noOtherExplicitRequester = sql`NOT EXISTS (
    SELECT 1 FROM ${ticketRequesterProfiles} requester
    WHERE requester.ticket_id = ${tickets.id}
      AND requester.customer_contact_id IS NOT NULL
  )`;

  const requester = or(
    explicitTicketRequesterCondition(contactId),
    and(
      noOtherExplicitRequester,
      or(
        eq(tickets.customerContactId, contactId),
        contactOrMergedSourceCondition(sql`${tickets.customerContactId}`, contactId),
        originalEmailSenderCondition(verifiedEmail),
      ),
    ),
  );

  const strictSupportTicket = sql`EXISTS (
    SELECT 1 FROM ticket_events created
    WHERE created.ticket_id = ${tickets.id}
      AND created.event_type = 'ticket.created'
      AND jsonb_typeof(created.metadata->'contractIds') = 'array'
      AND jsonb_array_length(created.metadata->'contractIds') > 0
  )`;

  const participant = sql`EXISTS (
    SELECT 1 FROM ticket_participants participant
    WHERE participant.ticket_id = ${tickets.id}
      AND participant.customer_contact_id = ${contactId}::uuid
      AND participant.participant_type = 'customer'
      AND participant.portal_access_enabled = true
  )`;

  return or(
    and(requester, or(sql`NOT (${strictSupportTicket})`, authorizedContractScope(contactId))),
    and(participant, authorizedContractScope(contactId)),
  ) ?? sql`false`;
}
