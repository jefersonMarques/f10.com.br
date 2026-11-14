import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  contactName,
  iterateSnapshotLines,
  mapSnapshotChannel,
  parseSnapshotDate,
  validateSnapshotRecord,
} from "./lib/movideskSnapshot.mjs";
import { duplicateActionOccurrences } from "./lib/movideskActionRecovery.mjs";

const DEFAULT_DIRECTORY = "/var/lib/f10/movidesk-final-snapshot";
const EXPECTED_TICKETS = 31085;
const EXPECTED_DUPLICATES = 48;
const EXPECTED_AFFECTED_TICKETS = 45;
const MAX_FAILURES = 3;

function parseOptions(args) {
  const options = { directory: DEFAULT_DIRECTORY, apply: false, all: false, limit: null };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--apply") options.apply = true;
    else if (argument === "--all") options.all = true;
    else if (argument === "--limit") options.limit = Number(args[++index]);
    else if (argument === "--directory") options.directory = args[++index];
    else throw new Error("UNKNOWN_ARGUMENT");
  }

  if (!options.directory?.startsWith("/") ||
      (options.limit !== null &&
        (!Number.isSafeInteger(options.limit) || options.limit < 1)) ||
      (options.all && options.limit !== null)) {
    throw new Error("INVALID_ARGUMENTS");
  }
  if (options.apply && !options.all && options.limit === null) {
    throw new Error("APPLY_REQUIRES_ALL_OR_LIMIT");
  }
  if (!options.apply && options.all) throw new Error("ALL_REQUIRES_APPLY");
  return options;
}

async function collectOccurrences(directory) {
  const inventory = JSON.parse(readFileSync(resolve(directory, "inventory.json"), "utf8"));
  const summary = JSON.parse(readFileSync(resolve(directory, "summary.json"), "utf8"));
  if (summary.state !== "completed" ||
      summary.total !== EXPECTED_TICKETS ||
      summary.exported !== EXPECTED_TICKETS ||
      inventory.version !== 1 ||
      inventory.tickets?.length !== EXPECTED_TICKETS) {
    throw new Error("SNAPSHOT_INVENTORY_NOT_COMPLETE");
  }

  const sourceInventory = new Map(inventory.tickets.map((item) => [
    String(item.sourceId),
    { route: item.route, status: item.status },
  ]));
  if (sourceInventory.size !== EXPECTED_TICKETS) {
    throw new Error("DUPLICATE_INVENTORY_ID");
  }

  const occurrences = [];
  const seen = new Set();
  let affectedTickets = 0;

  for await (const { record } of iterateSnapshotLines(resolve(directory, "tickets.jsonl"))) {
    const sourceTicketId = validateSnapshotRecord(record, sourceInventory);
    if (seen.has(sourceTicketId)) throw new Error("DUPLICATE_SNAPSHOT_TICKET");
    seen.add(sourceTicketId);

    const duplicates = duplicateActionOccurrences(record.ticket);
    if (duplicates.length > 0) affectedTickets += 1;

    for (const duplicate of duplicates) {
      occurrences.push({
        ...duplicate,
        sourceTicketId,
        ticketOrigin: record.ticket.origin,
        ticketCreatedDate: record.ticket.createdDate,
      });
    }
  }

  if (seen.size !== EXPECTED_TICKETS ||
      occurrences.length !== EXPECTED_DUPLICATES ||
      affectedTickets !== EXPECTED_AFFECTED_TICKETS) {
    throw new Error("SOURCE_DUPLICATE_INVENTORY_CHANGED");
  }

  return { occurrences, tickets: seen.size, affectedTickets };
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanText(value) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim() : "";
}

function sourcePersonId(value) {
  const id = asObject(value).id;
  return id == null ? "" : String(id);
}

function safeJson(value) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === "string" ? item.replace(/\u0000/g, "") : item);
}

async function resolveAuthor(tx, person) {
  const source = asObject(person);
  const profileType = Number(source.profileType);

  if ([1, 3].includes(profileType)) {
    const email = cleanText(source.email).toLowerCase();
    if (email) {
      const agents = await tx.unsafe(
        "SELECT id::text AS id FROM users WHERE lower(email) = $1 LIMIT 2",
        [email],
      );
      if (agents.length === 1) {
        return { type: "user", userId: agents[0].id, contactId: null };
      }
    }
  }

  if (profileType === 2 && sourcePersonId(source)) {
    const contacts = await tx.unsafe(
      "SELECT id::text AS id FROM customer_contacts " +
        "WHERE import_source = 'movidesk' AND import_source_id = $1 LIMIT 2",
      [sourcePersonId(source)],
    );
    if (contacts.length > 1) throw new Error("SOURCE_CONTACT_AMBIGUOUS");
    return {
      type: "customer",
      userId: null,
      contactId: contacts.length === 1 ? contacts[0].id : null,
    };
  }

  return { type: "system", userId: null, contactId: null };
}

async function recoverOccurrence(tx, occurrence) {
  const identity = [occurrence.sourceTicketId, occurrence.sourceActionId,
    occurrence.occurrenceIndex];

  const source = await tx.unsafe(
    "SELECT imports.ticket_id::text AS ticket_id, " +
      "actions.message_id::text AS primary_message_id " +
      "FROM movidesk_ticket_imports imports " +
      "JOIN movidesk_ticket_action_imports actions " +
      "ON actions.source_ticket_id = imports.source_ticket_id " +
      "AND actions.source_action_id = $2 " +
      "WHERE imports.source_ticket_id = $1",
    identity.slice(0, 2),
  );

  if (source.length !== 1) throw new Error("PRIMARY_SOURCE_ACTION_NOT_MAPPED");
  const ticketId = source[0].ticket_id;

  const existing = await tx.unsafe(
    "SELECT source_sha256, recovered_message_id::text AS message_id, " +
      "needs_chat_review FROM movidesk_ticket_action_occurrences " +
      "WHERE source_ticket_id = $1 AND source_action_id = $2 AND occurrence_index = $3",
    identity,
  );

  if (existing.length > 0) {
    if (existing.length !== 1 ||
        existing[0].source_sha256 !== occurrence.sourceSha256 ||
        Boolean(existing[0].message_id) !== occurrence.recoverMessage ||
        existing[0].needs_chat_review !== occurrence.needsChatReview) {
      throw new Error("RECOVERED_SOURCE_OCCURRENCE_CHANGED");
    }
    return { archived: 0, messages: 0, existing: 1, chatReview: 0 };
  }

  let messageId = null;
  if (occurrence.recoverMessage) {
    const action = asObject(occurrence.sourceAction);
    const author = await resolveAuthor(tx, action.createdBy);
    const createdAt = parseSnapshotDate(action.createdDate,
      parseSnapshotDate(occurrence.ticketCreatedDate));
    if (!createdAt) throw new Error("RECOVERED_ACTION_DATE_INVALID");

    const metadata = {
      source: "movidesk",
      sourceTicketId: occurrence.sourceTicketId,
      sourceActionId: occurrence.sourceActionId,
      occurrenceIndex: occurrence.occurrenceIndex,
      sourceSha256: occurrence.sourceSha256,
      sourceActionType: Number(action.type),
      sourceActionOrigin: Number(action.origin),
      sourceVisibility: Number(action.type) === 2 ? "public" : "internal",
      sourceAuthorId: sourcePersonId(action.createdBy) || null,
      sourceAuthorName: contactName(action.createdBy),
      sourceAuthorEmail: cleanText(asObject(action.createdBy).email) || null,
      htmlDescriptionHash: cleanText(action.htmlDescription)
        ? createHash("sha256").update(action.htmlDescription).digest("hex")
        : null,
      attachments: Array.isArray(action.attachments) ? action.attachments.map((item) => ({
        id: asObject(item).id ?? null,
        name: cleanText(asObject(item).fileName || asObject(item).name),
      })) : [],
      historical: true,
      recoveredDuplicateOccurrence: true,
      portalAccessApproved: false,
      attachmentsImported: false,
    };

    const [message] = await tx.unsafe(
      "INSERT INTO ticket_messages " +
        "(ticket_id, author_type, author_user_id, customer_contact_id, " +
        "visibility, channel, body, external_message_id, external_metadata, " +
        "created_at, updated_at) " +
        "VALUES ($1::uuid, $2, $3::uuid, $4::uuid, 'internal', $5, $6, $7, " +
        "$8::text::jsonb, $9, $9) RETURNING id::text AS id",
      [
        ticketId, author.type, author.userId, author.contactId,
        mapSnapshotChannel(occurrence.ticketOrigin),
        cleanText(action.description) || "[Ação histórica sem descrição textual]",
        "movidesk:recovered:" + identity.join(":"),
        safeJson(metadata), createdAt,
      ],
    );
    if (!message) throw new Error("RECOVERED_MESSAGE_NOT_CREATED");
    messageId = message.id;
  }

  await tx.unsafe(
    "INSERT INTO movidesk_ticket_action_occurrences " +
      "(source_ticket_id, source_action_id, occurrence_index, ticket_id, " +
      "source_action_json, source_sha256, recovered_message_id, needs_chat_review) " +
      "VALUES ($1, $2, $3, $4::uuid, $5, $6, $7::uuid, $8)",
    [
      ...identity, ticketId, occurrence.sourceActionJson,
      occurrence.sourceSha256, messageId, occurrence.needsChatReview,
    ],
  );

  return {
    archived: 1,
    messages: Number(Boolean(messageId)),
    existing: 0,
    chatReview: Number(occurrence.needsChatReview),
  };
}

async function recoverSelected(db, occurrences) {
  const totals = {
    examined: 0, archived: 0, messagesCreated: 0,
    alreadyArchived: 0, chatTranscriptsForReview: 0, failed: 0, failures: [],
  };

  const byTicket = new Map();
  for (const occurrence of occurrences) {
    const current = byTicket.get(occurrence.sourceTicketId) ?? [];
    current.push(occurrence);
    byTicket.set(occurrence.sourceTicketId, current);
  }

  for (const [sourceTicketId, ticketOccurrences] of byTicket) {
    try {
      const changes = await db.begin(async (tx) => {
        await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))",
          ["movidesk:" + sourceTicketId]);
        const result = [];
        for (const occurrence of ticketOccurrences) {
          result.push(await recoverOccurrence(tx, occurrence));
        }
        return result;
      });

      for (const change of changes) {
        totals.examined += 1;
        totals.archived += change.archived;
        totals.messagesCreated += change.messages;
        totals.alreadyArchived += change.existing;
        totals.chatTranscriptsForReview += change.chatReview;
      }
    } catch (error) {
      totals.failed += ticketOccurrences.length;
      totals.failures.push({
        sourceTicketId,
        code: typeof error?.code === "string" ? error.code : "RECOVERY_TICKET_FAILED",
      });
      if (totals.failures.length >= MAX_FAILURES) break;
    }
  }

  return totals;
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const inventory = await collectOccurrences(options.directory);
  const preview = {
    phase: "duplicate_recovery_preflight",
    readOnly: true,
    ticketsValidated: inventory.tickets,
    ticketsAffected: inventory.affectedTickets,
    duplicateOccurrences: inventory.occurrences.length,
    plannedRecoveredMessages: inventory.occurrences.filter((item) => item.recoverMessage).length,
    plannedChatReviews: inventory.occurrences.filter((item) => item.needsChatReview).length,
    plannedArchiveOnly: inventory.occurrences.filter((item) => !item.recoverMessage).length,
  };
  console.log(JSON.stringify(preview));

  if (!options.apply) return;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");
  const db = postgres(databaseUrl, {
    max: 1, prepare: false, connect_timeout: 10, idle_timeout: 10,
  });
  try {
    await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      const [migration] = await tx.unsafe(
        "SELECT to_regclass('public.movidesk_ticket_action_occurrences')::text AS relation",
      );
      if (!migration?.relation) throw new Error("RECOVERY_MIGRATION_0111_MISSING");
    });

    const selected = options.all
      ? inventory.occurrences
      : inventory.occurrences.slice(0, options.limit);

    console.log(JSON.stringify({
      phase: "duplicate_recovery_start", readOnly: false,
      selectedOccurrences: selected.length,
    }));

    const result = await recoverSelected(db, selected);
    console.log(JSON.stringify({
      phase: "duplicate_recovery_finished",
      state: result.failed ? "requires_review" : "completed",
      ...result,
      notificationsSent: 0,
      sourceSnapshotPreserved: true,
    }));
    if (result.failed) process.exitCode = 2;
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((error) => {
  const known = new Set([
    "UNKNOWN_ARGUMENT", "INVALID_ARGUMENTS", "APPLY_REQUIRES_ALL_OR_LIMIT",
    "ALL_REQUIRES_APPLY", "SNAPSHOT_INVENTORY_NOT_COMPLETE",
    "DUPLICATE_INVENTORY_ID", "DUPLICATE_SNAPSHOT_TICKET",
    "SOURCE_DUPLICATE_INVENTORY_CHANGED", "DATABASE_URL_MISSING",
    "RECOVERY_MIGRATION_0111_MISSING",
  ]);
  const code = error instanceof Error && known.has(error.message)
    ? error.message
    : "DUPLICATE_RECOVERY_FAILED";
  console.error("DUPLICATE_RECOVERY_ERROR:", code);
  process.exitCode = 1;
});
