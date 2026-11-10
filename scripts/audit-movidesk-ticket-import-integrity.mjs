import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
const FOCUS_TICKETS = ["43178", "5940", "25439"];

if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");
if (process.argv.length > 2) throw new Error("UNKNOWN_ARGUMENT");

const db = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
  idle_timeout: 5,
});

async function audit(tx) {
  const [summary] = await tx.unsafe(`
    SELECT
      (SELECT count(*)::integer FROM movidesk_ticket_imports) AS imported_tickets,
      (SELECT count(*)::integer FROM movidesk_ticket_action_imports) AS imported_actions,
      (SELECT count(*)::integer FROM ticket_participants
       WHERE source_system = 'movidesk') AS imported_participants,
      (SELECT count(*)::integer FROM ticket_participants
       WHERE source_system = 'movidesk' AND portal_access_enabled) AS portal_access_enabled,
      (SELECT count(*)::integer FROM ticket_participants
       WHERE source_system = 'movidesk' AND notifications_enabled) AS notifications_enabled,
      (SELECT count(*)::integer FROM ticket_messages
       WHERE external_message_id LIKE 'movidesk:%'
         AND visibility != 'internal') AS non_internal_historical_messages,
      (SELECT count(*)::integer FROM movidesk_ticket_action_imports a
       LEFT JOIN ticket_messages m ON m.id = a.message_id
       WHERE m.id IS NULL) AS missing_imported_messages,
      (SELECT count(*)::integer FROM movidesk_ticket_imports i
       LEFT JOIN tickets t ON t.id = i.ticket_id
       WHERE t.id IS NULL) AS missing_destination_tickets,
      (SELECT count(*)::integer FROM ticket_messages m
       JOIN movidesk_ticket_action_imports a ON a.message_id = m.id
       WHERE m.ticket_id != (
         SELECT i.ticket_id FROM movidesk_ticket_imports i
         WHERE i.source_ticket_id = a.source_ticket_id
       )) AS mismatched_message_tickets,
      (SELECT count(*)::integer FROM ticket_participants p
       JOIN movidesk_ticket_imports i ON i.ticket_id = p.ticket_id
       WHERE p.source_system = 'movidesk'
         AND ((p.participant_type = 'customer' AND p.customer_contact_id IS NULL)
           OR (p.participant_type = 'operator' AND p.user_id IS NULL))) AS invalid_imported_participants
  `);

  const ticketRows = await tx.unsafe(`
    SELECT
      i.source_ticket_id,
      t.ticket_number,
      t.status,
      (t.customer_contact_id IS NOT NULL) AS has_primary_contact,
      count(DISTINCT a.source_action_id)::integer AS historical_actions,
      count(DISTINCT p.id) FILTER (
        WHERE p.participant_type = 'customer'
      )::integer AS customer_participants,
      count(DISTINCT p.id) FILTER (
        WHERE p.participant_type = 'operator'
      )::integer AS operator_participants,
      count(DISTINCT p.id) FILTER (
        WHERE p.portal_access_enabled OR p.notifications_enabled
      )::integer AS enabled_participants,
      count(DISTINCT p.id) FILTER (
        WHERE p.participant_type = 'customer'
          AND p.customer_contact_id = t.customer_contact_id
      )::integer AS matching_primary_participants,
      count(DISTINCT m.id) FILTER (
        WHERE m.author_type = 'customer'
          AND m.customer_contact_id IS NULL
      )::integer AS customer_messages_missing_author
    FROM movidesk_ticket_imports i
    JOIN tickets t ON t.id = i.ticket_id
    LEFT JOIN movidesk_ticket_action_imports a
      ON a.source_ticket_id = i.source_ticket_id
    LEFT JOIN ticket_participants p
      ON p.ticket_id = i.ticket_id AND p.source_system = 'movidesk'
    LEFT JOIN ticket_messages m
      ON m.ticket_id = i.ticket_id AND m.id = a.message_id
    GROUP BY i.source_ticket_id, t.ticket_number, t.status, t.customer_contact_id
    ORDER BY i.source_ticket_id::bigint
  `);

  const actionAuthors = await tx.unsafe(`
    SELECT
      a.source_ticket_id,
      a.source_action_id,
      m.author_type,
      (m.author_type = 'customer' AND m.customer_contact_id IS NULL) AS missing_customer_author,
      (m.author_type = 'user' AND m.author_user_id IS NULL) AS missing_operator_author,
      (m.visibility = 'internal') AS internal_visibility
    FROM movidesk_ticket_action_imports a
    JOIN ticket_messages m ON m.id = a.message_id
    WHERE (m.author_type = 'customer' AND m.customer_contact_id IS NULL)
      OR (m.author_type = 'user' AND m.author_user_id IS NULL)
      OR m.visibility != 'internal'
    ORDER BY a.source_ticket_id::bigint, a.source_action_id
    LIMIT 100
  `);

  const anomalies = ticketRows.filter((row) =>
    row.customer_participants === 0 ||
    row.enabled_participants > 0 ||
    row.customer_messages_missing_author > 0 ||
    (row.has_primary_contact && row.matching_primary_participants === 0)
  );

  const focus = ticketRows.filter((row) =>
    FOCUS_TICKETS.includes(row.source_ticket_id)
  );

  const passed = [
    summary.portal_access_enabled === 0,
    summary.notifications_enabled === 0,
    summary.non_internal_historical_messages === 0,
    summary.missing_imported_messages === 0,
    summary.missing_destination_tickets === 0,
    summary.mismatched_message_tickets === 0,
    summary.invalid_imported_participants === 0,
    actionAuthors.length === 0,
    anomalies.length === 0,
  ].every(Boolean);

  return {
    state: passed ? "passed" : "requires_review",
    readOnly: true,
    sourceScope: "imported_movidesk_tickets",
    counts: summary,
    ticketCoverage: ticketRows.map((row) => ({
      sourceTicketId: row.source_ticket_id,
      ticketNumber: row.ticket_number,
      status: row.status,
      hasPrimaryContact: row.has_primary_contact,
      historicalActions: row.historical_actions,
      customerParticipants: row.customer_participants,
      operatorParticipants: row.operator_participants,
    })),
    focus,
    anomalies,
    actionAuthorAnomalies: actionAuthors,
    limitations: [
      "Validates F10 database integrity only; source Movidesk history is not re-fetched.",
      "Matching operators not found in F10 cannot be reconstructed by this audit.",
      "Historic attachments were not included in the standard ticket migration.",
      "Participant access flags are verified; other portal authorization paths require separate tests.",
      "All historical ticket messages remain internal pending explicit portal review.",
    ],
  };
}

try {
  const result = await db.begin(async (tx) => {
    await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    return audit(tx);
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.state !== "passed") process.exitCode = 2;
} finally {
  await db.end({ timeout: 5 });
}
