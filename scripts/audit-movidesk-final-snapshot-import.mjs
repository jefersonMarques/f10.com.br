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

function activeActions(ticket) {
  return Array.isArray(ticket.actions)
    ? ticket.actions.filter((action) => action?.isDeleted !== true)
    : [];
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
  for await (const { record } of iterateSnapshotLines(
    resolve(directory, "tickets.jsonl"),
  )) {
    const id = validateSnapshotRecord(record, expected);
    if (snapshotRecords.has(id)) throw new Error("DUPLICATE_SNAPSHOT_ID");
    const actions = activeActions(record.ticket);
    const chatAction = Number(record.ticket.origin) === 5
      ? actions.find((action) => Number(action?.origin) === 5)
      : null;
    snapshotRecords.set(id, {
      status: mapSnapshotStatus(record.ticket.baseStatus),
      sourceStatus: record.ticket.baseStatus,
      channel: mapSnapshotChannel(record.ticket.origin),
      actions: actions.length,
      parsableChat: Boolean(chatAction && splitMovideskChatTranscript(chatAction.description)),
    });
  }
  if (snapshotRecords.size !== expected.size) throw new Error("SNAPSHOT_COUNT_MISMATCH");
  return snapshotRecords;
}

async function main() {
  const options = parseSnapshotOptions(process.argv.slice(2));
  if (options.apply || options.limit !== null || options.offset !== 0 || options.all) {
    throw new Error("AUDIT_IS_READ_ONLY");
  }
  const expected = await expectedInventory(options.directory);
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");
  const db = postgres(databaseUrl, {
    max: 1, prepare: false, connect_timeout: 10, idle_timeout: 10,
  });
  try {
    const rows = await db.unsafe(`
      SELECT
        imports.source_ticket_id,
        imports.source_base_status,
        tickets.status,
        tickets.channel,
        count(actions.source_action_id)::int AS actions,
        (SELECT count(*)::int
          FROM movidesk_chat_transcript_archives archives
          WHERE archives.source_ticket_id = imports.source_ticket_id) AS chat_archives
      FROM movidesk_ticket_imports imports
      JOIN tickets ON tickets.id = imports.ticket_id
      LEFT JOIN movidesk_ticket_action_imports actions
        ON actions.source_ticket_id = imports.source_ticket_id
      GROUP BY imports.source_ticket_id, imports.source_base_status,
        tickets.status, tickets.channel
    `);
    const mapped = new Map(rows.map((row) => [row.source_ticket_id, row]));
    const summary = {
      snapshotTickets: expected.size,
      mappedSnapshotTickets: 0,
      missing: 0,
      wrongStatus: 0,
      wrongChannel: 0,
      wrongSourceStatus: 0,
      missingActions: 0,
      parsableChats: 0,
      chatArchives: 0,
      parsableChatsNotReconstructed: 0,
      examplesRequiringReview: [],
    };
    for (const [id, source] of expected) {
      const actual = mapped.get(id);
      if (!actual) {
        summary.missing += 1;
        if (summary.examplesRequiringReview.length < 30) {
          summary.examplesRequiringReview.push({ id, issue: "missing_ticket" });
        }
        continue;
      }
      summary.mappedSnapshotTickets += 1;
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
      if (source.actions !== actual.actions) {
        summary.missingActions += 1;
        issues.push("source_actions_mismatch");
      }
      if (source.parsableChat) {
        summary.parsableChats += 1;
        if (actual.chat_archives > 0) summary.chatArchives += 1;
        else {
          summary.parsableChatsNotReconstructed += 1;
          issues.push("chat_pending_reconstruction");
        }
      }
      if (issues.length && summary.examplesRequiringReview.length < 30) {
        summary.examplesRequiringReview.push({ id, issues });
      }
    }
    const anomalies = summary.missing + summary.wrongSourceStatus +
      summary.missingActions + summary.parsableChatsNotReconstructed;
    console.log(JSON.stringify({
      phase: "audit",
      state: anomalies ? "requires_review" : "passed",
      readOnly: true,
      ...summary,
      notes: [
        "Destination status and channel can differ for pre-existing tickets legitimately modified by F10 operators.",
        "Chat archive counts exclude transcripts whose format cannot be parsed without manual review.",
        "Media attachment binaries are not transferred by this importer.",
      ],
    }, null, 2));
    if (anomalies) process.exitCode = 2;
  } finally {
    await db.end({ timeout: 5 });
  }
}
main().catch((error) => {
  console.error("SNAPSHOT_AUDIT_ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
