import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  iterateSnapshotLines,
  mapSnapshotChannel,
  mapSnapshotStatus,
  parseSnapshotOptions,
  splitMovideskChatTranscript,
  validateSnapshotRecord,
} from "./lib/movideskSnapshot.mjs";
import {
  activeSnapshotActions,
  duplicateActionOccurrences,
} from "./lib/movideskActionRecovery.mjs";

function occurrenceKey(sourceTicketId, sourceActionId, occurrenceIndex) {
  return [sourceTicketId, sourceActionId, occurrenceIndex].join(":");
}

async function expectedInventory(directory) {
  const inventoryData = JSON.parse(
    readFileSync(resolve(directory, "inventory.json"), "utf8"),
  );
  const summary = JSON.parse(
    readFileSync(resolve(directory, "summary.json"), "utf8"),
  );
  const expected = new Map(inventoryData.tickets.map((item) => [
    String(item.sourceId),
    { route: item.route, status: item.status },
  ]));
  if (summary.state !== "completed" ||
      summary.total !== inventoryData.tickets.length ||
      summary.exported !== inventoryData.tickets.length ||
      expected.size !== inventoryData.tickets.length) {
    throw new Error("INCOMPLETE_SNAPSHOT_INVENTORY");
  }

  const snapshotRecords = new Map();
  const expectedOccurrences = new Map();

  for await (const { record } of iterateSnapshotLines(
    resolve(directory, "tickets.jsonl"),
  )) {
    const id = validateSnapshotRecord(record, expected);
    if (snapshotRecords.has(id)) throw new Error("DUPLICATE_SNAPSHOT_ID");

    const actions = activeSnapshotActions(record.ticket);
    const actionIds = new Set(actions.map((action) => String(action.id)));
    const duplicates = duplicateActionOccurrences(record.ticket);
    const chatAction = Number(record.ticket.origin) === 5
      ? actions.find((action) => Number(action?.origin) === 5)
      : null;

    for (const duplicate of duplicates) {
      const key = occurrenceKey(id, duplicate.sourceActionId, duplicate.occurrenceIndex);
      expectedOccurrences.set(key, duplicate);
    }

    snapshotRecords.set(id, {
      status: mapSnapshotStatus(record.ticket.baseStatus),
      sourceStatus: record.ticket.baseStatus,
      channel: mapSnapshotChannel(record.ticket.origin),
      actionIds,
      actionOccurrences: actions.length,
      duplicates,
      parsableChat: Boolean(chatAction && splitMovideskChatTranscript(chatAction.description)),
    });
  }
  if (snapshotRecords.size !== expected.size) throw new Error("SNAPSHOT_COUNT_MISMATCH");
  return { snapshotRecords, expectedOccurrences };
}

function addIssue(summary, id, issues) {
  if (issues.length > 0 && summary.examplesRequiringReview.length < 30) {
    summary.examplesRequiringReview.push({ id, issues });
  }
}

async function readDatabase(db) {
  return db.begin(async (tx) => {
    await tx.unsafe("SET TRANSACTION READ ONLY");

    const [migration] = await tx.unsafe(
      "SELECT to_regclass('public.movidesk_ticket_action_occurrences')::text AS relation",
    );

    const tickets = await tx.unsafe(
      "SELECT imports.source_ticket_id, imports.source_base_status, " +
        "tickets.status, tickets.channel, " +
        "(SELECT count(*)::int FROM movidesk_chat_transcript_archives archives " +
        "WHERE archives.source_ticket_id = imports.source_ticket_id) AS chat_archives " +
        "FROM movidesk_ticket_imports imports " +
        "JOIN tickets ON tickets.id = imports.ticket_id",
    );

    const actions = await tx.unsafe(
      "SELECT source_ticket_id, source_action_id::text AS action_id " +
        "FROM movidesk_ticket_action_imports",
    );

    const recovered = migration?.relation
      ? await tx.unsafe(
        "SELECT occurrence.source_ticket_id, " +
          "occurrence.source_action_id::text AS action_id, " +
          "occurrence.occurrence_index, occurrence.source_action_json, " +
          "occurrence.source_sha256, occurrence.recovered_message_id::text AS message_id, " +
          "occurrence.needs_chat_review, " +
          "message.visibility, " +
          "message.external_metadata->>'portalAccessApproved' AS portal_access, " +
          "message.external_metadata->>'sourceSha256' AS message_sha256 " +
          "FROM movidesk_ticket_action_occurrences occurrence " +
          "LEFT JOIN ticket_messages message ON message.id = occurrence.recovered_message_id",
      )
      : [];

    return { tickets, actions, recovered, recoveryMigrationApplied: Boolean(migration?.relation) };
  });
}

async function main() {
  const options = parseSnapshotOptions(process.argv.slice(2));
  if (options.apply || options.limit !== null || options.offset !== 0 || options.all) {
    throw new Error("AUDIT_IS_READ_ONLY");
  }

  const { snapshotRecords, expectedOccurrences } = await expectedInventory(options.directory);
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");

  const db = postgres(databaseUrl, {
    max: 1, prepare: false, connect_timeout: 10, idle_timeout: 10,
  });

  let databaseRecords;
  try {
    databaseRecords = await readDatabase(db);
  } finally {
    await db.end({ timeout: 5 });
  }

  const mapped = new Map(databaseRecords.tickets.map((row) =>
    [row.source_ticket_id, row]));
  const importedActions = new Map();

  for (const action of databaseRecords.actions) {
    const current = importedActions.get(action.source_ticket_id) ?? new Set();
    current.add(action.action_id);
    importedActions.set(action.source_ticket_id, current);
  }

  const recovered = new Map(databaseRecords.recovered.map((row) =>
    [occurrenceKey(row.source_ticket_id, row.action_id, row.occurrence_index), row]));
  const summary = {
    snapshotTickets: snapshotRecords.size,
    mappedSnapshotTickets: 0,
    missing: 0,
    wrongStatus: 0,
    wrongChannel: 0,
    wrongSourceStatus: 0,
    expectedSourceActions: 0,
    importedDistinctActions: 0,
    sourceDuplicateOccurrences: expectedOccurrences.size,
    recoveredDuplicateOccurrences: 0,
    missingActions: 0,
    missingActionIds: 0,
    unexpectedActionIds: 0,
    missingDuplicateOccurrences: 0,
    duplicateArchiveMismatches: 0,
    unexpectedRecoveredOccurrences: 0,
    recoveredMessages: 0,
    recoveredMessageAccessIssues: 0,
    duplicateChatTranscriptsForReview: 0,
    recoveryMigrationApplied: databaseRecords.recoveryMigrationApplied,
    parsableChats: 0,
    chatArchives: 0,
    parsableChatsNotReconstructed: 0,
    examplesRequiringReview: [],
  };

  for (const [id, source] of snapshotRecords) {
    const actual = mapped.get(id);
    if (!actual) {
      summary.missing += 1;
      addIssue(summary, id, ["missing_ticket"]);
      continue;
    }

    summary.mappedSnapshotTickets += 1;
    summary.expectedSourceActions += source.actionOccurrences;
    const issues = [];

    if (source.sourceStatus !== actual.source_base_status) {
      summary.wrongSourceStatus += 1;
      issues.push("source_status_mismatch");
    }
    if (source.status !== actual.status) {
      summary.wrongStatus += 1;
      issues.push("destination_status_differs");
    }
    if (source.channel !== actual.channel) {
      summary.wrongChannel += 1;
      issues.push("destination_channel_differs");
    }

    const actualIds = importedActions.get(id) ?? new Set();
    summary.importedDistinctActions += actualIds.size;
    const missingIds = [...source.actionIds].filter((actionId) => !actualIds.has(actionId));
    const unexpectedIds = [...actualIds].filter((actionId) => !source.actionIds.has(actionId));
    summary.missingActionIds += missingIds.length;
    summary.unexpectedActionIds += unexpectedIds.length;

    if (missingIds.length || unexpectedIds.length) {
      issues.push("source_action_identity_mismatch");
    }

    for (const duplicate of source.duplicates) {
      const key = occurrenceKey(id, duplicate.sourceActionId, duplicate.occurrenceIndex);
      const archive = recovered.get(key);
      if (!archive) {
        summary.missingDuplicateOccurrences += 1;
        issues.push("missing_duplicate_occurrence");
        continue;
      }

      summary.recoveredDuplicateOccurrences += 1;
      const archiveCorrect =
        archive.source_sha256 === duplicate.sourceSha256 &&
        archive.source_action_json === duplicate.sourceActionJson &&
        Boolean(archive.message_id) === duplicate.recoverMessage &&
        archive.needs_chat_review === duplicate.needsChatReview;
      if (!archiveCorrect) {
        summary.duplicateArchiveMismatches += 1;
        issues.push("duplicate_archive_mismatch");
      }

      if (archive.message_id) {
        summary.recoveredMessages += 1;
        if (archive.visibility !== "internal" ||
            archive.portal_access !== "false" ||
            archive.message_sha256 !== duplicate.sourceSha256) {
          summary.recoveredMessageAccessIssues += 1;
          issues.push("recovered_message_access_invalid");
        }
      }
      if (archive.needs_chat_review) {
        summary.duplicateChatTranscriptsForReview += 1;
      }
    }

    if (missingIds.length || unexpectedIds.length ||
        issues.some((issue) => issue.startsWith("missing_duplicate") ||
          issue.startsWith("duplicate_archive") ||
          issue.startsWith("recovered_message"))) {
      summary.missingActions += 1;
    }

    if (source.parsableChat) {
      summary.parsableChats += 1;
      if (actual.chat_archives > 0) summary.chatArchives += 1;
      else {
        summary.parsableChatsNotReconstructed += 1;
        issues.push("chat_pending_reconstruction");
      }
    }

    addIssue(summary, id, [...new Set(issues)]);
  }

  for (const key of recovered.keys()) {
    if (!expectedOccurrences.has(key)) summary.unexpectedRecoveredOccurrences += 1;
  }

  const anomalies = summary.missing + summary.wrongSourceStatus +
    summary.missingActions + summary.parsableChatsNotReconstructed +
    summary.unexpectedRecoveredOccurrences;

  console.log(JSON.stringify({
    phase: "audit",
    state: anomalies ? "requires_review" : "passed",
    readOnly: true,
    ...summary,
    notes: [
      "Duplicate Movidesk action IDs are audited by occurrence index and SHA-256 of the full source JSON.",
      "Additional full chat transcripts are archived for manual comparison, without generating duplicated chat messages.",
      "Destination status and channel can differ for tickets modified by F10 operators.",
      "Chat archive counts exclude transcripts whose format cannot be parsed without manual review.",
      "Media attachment binaries are not transferred by the importer or recovery.",
    ],
  }, null, 2));

  if (anomalies) process.exitCode = 2;
}

main().catch((error) => {
  console.error("SNAPSHOT_AUDIT_ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
