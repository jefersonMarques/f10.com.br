import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
const args = process.argv.slice(2);
const apply = args.includes("--apply");

if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");
if (args.some((argument) => argument !== "--apply") || args.length > 1) {
  throw new Error("INVALID_ARGUMENTS");
}

const db = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  connect_timeout: 10,
});

async function inspect(tx) {
  return tx.unsafe(`
    SELECT
      a.source_ticket_id,
      count(*)::integer AS total_actions,
      count(*) FILTER (WHERE a.source_visibility = 'public')::integer AS source_public,
      count(*) FILTER (WHERE a.source_visibility = 'internal')::integer AS source_internal,
      count(*) FILTER (
        WHERE a.source_visibility = 'public' AND m.visibility = 'internal'
      )::integer AS to_restore,
      count(*) FILTER (
        WHERE a.source_visibility = 'public' AND m.visibility = 'public'
      )::integer AS already_public,
      count(*) FILTER (
        WHERE a.source_visibility = 'internal' AND m.visibility != 'internal'
      )::integer AS private_visibility_mismatches,
      count(*) FILTER (
        WHERE a.source_visibility NOT IN ('public', 'internal')
          OR m.visibility NOT IN ('public', 'internal')
          OR m.external_message_id IS DISTINCT FROM
             ('movidesk:' || a.source_ticket_id || ':' || a.source_action_id)
          OR m.ticket_id != i.ticket_id
          OR m.external_metadata->>'sourceVisibility' IS DISTINCT FROM a.source_visibility
          OR m.external_metadata->>'sourceTicketId' IS DISTINCT FROM a.source_ticket_id
          OR m.external_metadata->>'sourceActionId' IS DISTINCT FROM a.source_action_id::text
      )::integer AS invalid_source_mappings,
      count(*) FILTER (
        WHERE a.source_visibility = 'public'
          AND m.external_metadata->>'portalAccessApproved' IS DISTINCT FROM 'false'
      )::integer AS missing_portal_protection
    FROM movidesk_ticket_action_imports a
    JOIN movidesk_ticket_imports i ON i.source_ticket_id = a.source_ticket_id
    JOIN ticket_messages m ON m.id = a.message_id
    GROUP BY a.source_ticket_id
    ORDER BY a.source_ticket_id::bigint
  `);
}

function summarize(rows) {
  const totals = {
    tickets: rows.length,
    actions: 0,
    sourcePublic: 0,
    sourceInternal: 0,
    toRestore: 0,
    alreadyPublic: 0,
    privateVisibilityMismatches: 0,
    invalidSourceMappings: 0,
    missingPortalProtection: 0,
  };
  const keys = [
    ["total_actions", "actions"],
    ["source_public", "sourcePublic"],
    ["source_internal", "sourceInternal"],
    ["to_restore", "toRestore"],
    ["already_public", "alreadyPublic"],
    ["private_visibility_mismatches", "privateVisibilityMismatches"],
    ["invalid_source_mappings", "invalidSourceMappings"],
    ["missing_portal_protection", "missingPortalProtection"],
  ];
  for (const row of rows) {
    for (const [source, target] of keys) totals[target] += row[source];
  }
  return totals;
}

async function restore(tx) {
  const rows = await inspect(tx);
  const totals = summarize(rows);
  const invalid = totals.privateVisibilityMismatches > 0 ||
    totals.invalidSourceMappings > 0 ||
    totals.actions !== totals.sourcePublic + totals.sourceInternal;
  if (invalid) {
    return { state: "blocked_invalid_source_data", readOnly: true, totals, tickets: rows };
  }

  if (!apply) {
    return { state: "preview", readOnly: true, totals, tickets: rows };
  }

  const updated = await tx.unsafe(`
    UPDATE ticket_messages m
    SET visibility = 'public',
        external_metadata = jsonb_set(
          CASE WHEN jsonb_typeof(m.external_metadata) = 'object'
            THEN m.external_metadata ELSE '{}'::jsonb END,
          '{portalAccessApproved}',
          'false'::jsonb,
          true
        )
    FROM movidesk_ticket_action_imports a
    JOIN movidesk_ticket_imports i ON i.source_ticket_id = a.source_ticket_id
    WHERE a.message_id = m.id
      AND m.ticket_id = i.ticket_id
      AND a.source_visibility = 'public'
      AND m.visibility = 'internal'
    RETURNING m.id
  `);
  if (updated.length !== totals.toRestore) {
    throw new Error("VISIBILITY_UPDATE_COUNT_MISMATCH");
  }

  const repaired = await tx.unsafe(`
    UPDATE ticket_messages m
    SET external_metadata = jsonb_set(
      CASE WHEN jsonb_typeof(m.external_metadata) = 'object'
        THEN m.external_metadata ELSE '{}'::jsonb END,
      '{portalAccessApproved}',
      'false'::jsonb,
      true
    )
    FROM movidesk_ticket_action_imports a
    JOIN movidesk_ticket_imports i ON i.source_ticket_id = a.source_ticket_id
    WHERE a.message_id = m.id
      AND m.ticket_id = i.ticket_id
      AND a.source_visibility = 'public'
      AND m.visibility = 'public'
      AND m.external_metadata->>'portalAccessApproved' IS DISTINCT FROM 'false'
    RETURNING m.id
  `);

  const after = summarize(await inspect(tx));
  if (after.toRestore !== 0 || after.privateVisibilityMismatches !== 0 ||
      after.invalidSourceMappings !== 0 || after.missingPortalProtection !== 0) {
    throw new Error("VISIBILITY_POSTCHECK_FAILED");
  }

  return {
    state: "updated",
    readOnly: false,
    updatedMessages: updated.length,
    repairedProtection: repaired.length,
    notificationsSent: 0,
    totals: after,
  };
}

async function main() {
  try {
    const result = await db.begin(async (tx) => {
      if (apply) {
        await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext('movidesk:visibility:restore'))");
      } else {
        await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      }
      return restore(tx);
    });
    console.log(JSON.stringify(result, null, 2));
    if (result.state === "blocked_invalid_source_data") process.exitCode = 2;
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : "UNEXPECTED_ERROR");
  process.exitCode = 1;
});
