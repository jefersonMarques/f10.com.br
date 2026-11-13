import { createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";
import {
  FINAL_STATUSES,
  contactName,
  iterateSnapshotLines,
  mapSnapshotChannel as channelFor,
  mapSnapshotStatus as statusFor,
  parseSnapshotOptions,
  parseSnapshotDate as safeDate,
  splitMovideskChatTranscript,
  validateSnapshotRecord,
} from "./lib/movideskSnapshot.mjs";

const MAX_FAILURES = 10;

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function trimmed(value) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim() : "";
}

function safeJson(value) {
  return JSON.stringify(value, (_key, item) =>
    typeof item === "string" ? item.replace(/\u0000/g, "") : item);
}

function personId(person) {
  const value = object(person).id;
  return value === null || value === undefined ? "" : String(value);
}

async function uniqueAgent(tx, person) {
  const email = trimmed(object(person).email).toLowerCase();
  if (!email) return null;
  const users = await tx.unsafe(
    "SELECT id::text FROM users WHERE lower(email) = $1 LIMIT 2",
    [email],
  );
  return users.length === 1 ? users[0].id : null;
}

async function historicalContact(tx, person) {
  const id = personId(person);
  if (!id) return null;
  const existing = await tx.unsafe(
    "SELECT id::text, email FROM customer_contacts WHERE import_source = 'movidesk' AND import_source_id = $1",
    [id],
  );
  if (existing.length > 1) {
    throw new Error("SOURCE_CONTACT_AMBIGUOUS");
  }
  if (existing.length === 1) return existing[0].id;
  const created = await tx.unsafe(
    "INSERT INTO customer_contacts (name, email, import_source, import_source_id) " +
    "VALUES ($1, NULL, 'movidesk', $2) " +
    "ON CONFLICT (import_source, import_source_id) " +
    "WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL " +
    "DO NOTHING RETURNING id::text",
    [contactName(person), id],
  );
  if (created.length === 1) return created[0].id;
  throw new Error("SOURCE_CONTACT_CONFLICT");
}

async function authorFor(tx, action, clients) {
  const person = object(action.createdBy);
  if ([1, 3].includes(Number(person.profileType))) {
    const userId = await uniqueAgent(tx, person);
    if (userId) return { authorType: "user", userId, contactId: null };
  }
  if (Number(person.profileType) === 2 || clients.some((client) =>
    personId(client) && personId(client) === personId(person))) {
    return {
      authorType: "customer",
      userId: null,
      contactId: await historicalContact(tx, person),
    };
  }
  return { authorType: "system", userId: null, contactId: null };
}

async function importActions(tx, ticket, ticketId, clients) {
  let created = 0;
  for (const item of list(ticket.actions)) {
    const action = object(item);
    if (action.isDeleted === true) continue;
    const actionId = Number(action.id);
    if (!Number.isSafeInteger(actionId) || actionId < 1) throw new Error("INVALID_ACTION_ID");
    if (!Number.isFinite(Number(action.type))) throw new Error("INVALID_ACTION_TYPE");
    const existing = await tx.unsafe(
      "SELECT 1 FROM movidesk_ticket_action_imports " +
      "WHERE source_ticket_id = $1 AND source_action_id = $2",
      [personId(ticket), actionId],
    );
    if (existing.length) continue;
    const author = await authorFor(tx, action, clients);
    const createdAt = safeDate(action.createdDate, safeDate(ticket.createdDate, new Date()));
    const sourceVisibility = Number(action.type) === 2 ? "public" : "internal";
    const metadata = {
      source: "movidesk",
      sourceTicketId: personId(ticket),
      sourceActionId: actionId,
      sourceVisibility,
      sourceActionType: Number(action.type),
      sourceActionOrigin: Number(action.origin),
      htmlDescriptionHash: trimmed(action.htmlDescription)
        ? createHash("sha256").update(action.htmlDescription).digest("hex")
        : null,
      historical: true,
      portalAccessApproved: false,
      sourceAuthorId: personId(action.createdBy) || null,
      sourceAuthorName: contactName(action.createdBy),
      sourceAuthorEmail: trimmed(object(action.createdBy).email) || null,
      attachments: list(action.attachments).map((attachment) => ({
        id: object(attachment).id ?? null,
        name: trimmed(object(attachment).fileName || object(attachment).name),
      })),
      attachmentsImported: false,
    };
    const body = trimmed(action.description) || "[Ação histórica sem descrição textual]";
    const messages = await tx.unsafe(
      "INSERT INTO ticket_messages (ticket_id, author_type, author_user_id, " +
      "customer_contact_id, visibility, channel, body, external_message_id, " +
      "external_metadata, created_at, updated_at) " +
      "VALUES ($1::uuid, $2, $3::uuid, $4::uuid, 'internal', $5, $6, $7, $8::text::jsonb, $9, $9) " +
      "RETURNING id::text, jsonb_typeof(external_metadata) AS metadata_type, " +
      "external_metadata->>'sourceTicketId' AS source_ticket_id, " +
      "external_metadata->>'sourceActionId' AS source_action_id, " +
      "external_metadata->>'sourceVisibility' AS source_visibility",
      [
        ticketId, author.authorType, author.userId, author.contactId,
        channelFor(ticket.origin), body,
        "movidesk:" + personId(ticket) + ":" + actionId,
        safeJson(metadata), createdAt,
      ],
    );
    const inserted = messages[0];
    if (inserted?.metadata_type !== "object" ||
        inserted.source_ticket_id !== personId(ticket) ||
        inserted.source_action_id !== String(actionId) ||
        inserted.source_visibility !== sourceVisibility) {
      throw new Error("HISTORICAL_ACTION_METADATA_INVALID");
    }
    await tx.unsafe(
      "INSERT INTO movidesk_ticket_action_imports " +
      "(source_ticket_id, source_action_id, message_id, source_visibility) " +
      "VALUES ($1, $2, $3::uuid, $4)",
      [personId(ticket), actionId, messages[0].id, sourceVisibility],
    );
    created += 1;
  }
  return created;
}

function activeClientPeople(ticket) {
  const unique = new Map();
  for (const source of list(ticket.clients)) {
    const person = object(source);
    const id = personId(person);
    if (id && person.isDeleted !== true && !unique.has(id)) {
      unique.set(id, person);
    }
  }
  for (const sourceAction of list(ticket.actions)) {
    const author = object(object(sourceAction).createdBy);
    const id = personId(author);
    if (id && Number(author.profileType) === 2 && !unique.has(id)) {
      unique.set(id, author);
    }
  }
  return [...unique.values()];
}

function primaryClient(ticket, clients) {
  const byId = new Map(clients.map((person) => [personId(person), person]));
  const creatorId = personId(ticket.createdBy);
  if (byId.has(creatorId)) return byId.get(creatorId);
  const orderedActions = list(ticket.actions)
    .filter((action) => object(action).isDeleted !== true)
    .sort((left, right) =>
      String(object(left).createdDate ?? "").localeCompare(String(object(right).createdDate ?? "")));
  for (const action of orderedActions) {
    const authorId = personId(object(action).createdBy);
    if (byId.has(authorId)) return byId.get(authorId);
  }
  return clients.length === 1 ? clients[0] : null;
}

async function insertParticipant(tx, ticketId, identity) {
  await tx.unsafe(
    "INSERT INTO ticket_participants " +
    "(ticket_id, participant_type, customer_contact_id, user_id, source_system, source_person_id) " +
    "VALUES ($1::uuid, $2, $3::uuid, $4::uuid, 'movidesk', $5) " +
    "ON CONFLICT DO NOTHING",
    [ticketId, identity.type, identity.contactId, identity.userId, identity.sourceId],
  );
}

async function importParticipants(tx, ticket, ticketId, clients) {
  let customerCount = 0;
  let operatorCount = 0;
  for (const client of clients) {
    const contactId = client ? await historicalContact(tx, client) : null;
    await insertParticipant(tx, ticketId, {
      type: "customer", contactId, userId: null, sourceId: personId(client),
    });
    customerCount += 1;
  }

  const agents = new Map();
  for (const person of [ticket.owner, ticket.createdBy,
    ...list(ticket.actions).map((action) => object(action).createdBy)]) {
    const agent = object(person);
    if ([1, 3].includes(Number(agent.profileType)) && personId(agent)) {
      agents.set(personId(agent), agent);
    }
  }
  for (const agent of agents.values()) {
    const userId = await uniqueAgent(tx, agent);
    if (!userId) continue;
    await insertParticipant(tx, ticketId, {
      type: "operator", contactId: null, userId, sourceId: personId(agent),
    });
    operatorCount += 1;
  }
  return { customerCount, operatorCount, unmatchedOperators: agents.size - operatorCount };
}

function normalizedName(person) {
  return (trimmed(object(person).businessName) || trimmed(object(person).name))
    .toLocaleLowerCase("pt-BR");
}

function chatAuthor(message, ticket, client, row) {
  const normalized = message.authorName.toLocaleLowerCase("pt-BR");
  if (!normalized) {
    return { type: "system", userId: null, contactId: null, body: message.body };
  }
  if (normalized === normalizedName(ticket.owner) && row.assigned_user_id) {
    return {
      type: "user",
      userId: row.assigned_user_id,
      contactId: null,
      body: message.body,
    };
  }
  if (client && normalized === normalizedName(client) && row.customer_contact_id) {
    return {
      type: "customer",
      userId: null,
      contactId: row.customer_contact_id,
      body: message.body,
    };
  }
  return {
    type: "system",
    userId: null,
    contactId: null,
    body: message.authorName + ": " + message.body,
  };
}

async function reconstructChat(tx, ticket, ticketId, primaryClient) {
  if (Number(ticket.origin) !== 5) return "not_chat";

  const archive = await tx.unsafe(
    "SELECT 1 FROM movidesk_chat_transcript_archives WHERE source_ticket_id = $1",
    [personId(ticket)],
  );
  if (archive.length > 0) return "already_reconstructed";

  const sourceAction = list(ticket.actions)
    .find((item) => Number(object(item).origin) === 5 &&
      !object(item).isDeleted &&
      typeof object(item).description === "string" &&
      object(item).description.trim());
  if (!sourceAction) return "raw_preserved";

  const messages = splitMovideskChatTranscript(sourceAction.description);
  if (!messages) return "raw_preserved";

  const [row] = await tx.unsafe(
    "SELECT id::text, customer_contact_id::text, assigned_user_id::text, " +
    "queue_id::text, channel FROM tickets WHERE id = $1::uuid",
    [ticketId],
  );
  if (!row) throw new Error("CHAT_DESTINATION_NOT_FOUND");
  if (row.channel !== "web_chat") return "previous_channel_preserved";

  const sessions = await tx.unsafe(
    "SELECT 1 FROM web_chat_sessions WHERE ticket_id = $1::uuid",
    [ticketId],
  );
  if (sessions.length > 0) return "existing_chat_session_preserved";

  const [action] = await tx.unsafe(
    "SELECT a.message_id::text, m.body FROM movidesk_ticket_action_imports a " +
    "JOIN ticket_messages m ON m.id = a.message_id " +
    "WHERE a.source_ticket_id = $1 AND a.source_action_id = $2",
    [personId(ticket), Number(sourceAction.id)],
  );
  if (!action || action.body !== sourceAction.description.trim()) {
    return "raw_preserved";
  }

  const createdAt = safeDate(ticket.createdDate);
  const finishedAt = safeDate(ticket.lastUpdate, createdAt);
  if (!createdAt || !finishedAt) return "raw_preserved";

  const sessionId = randomUUID();
  const tokenHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  await tx.unsafe(
    "INSERT INTO web_chat_sessions " +
    "(id, ticket_id, customer_contact_id, assigned_user_id, queue_id, subject, " +
    "token_hash, expires_at, last_seen_at, closed_at, ai_state, context_data, " +
    "created_at, updated_at) " +
    "VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, " +
    "$6, $7, $8, $8, $8, 'disabled', $9::text::jsonb, $10, $8)",
    [
      sessionId, ticketId, row.customer_contact_id, row.assigned_user_id,
      row.queue_id, "Chat histórico Movidesk #" + personId(ticket),
      tokenHash, finishedAt, safeJson({
        source: "movidesk",
        sourceTicketId: personId(ticket),
        historical: true,
        portalAccessApproved: false,
      }), createdAt,
    ],
  );
  await tx.unsafe(
    "INSERT INTO movidesk_chat_transcript_archives " +
    "(source_ticket_id, source_action_id, original_message_id, " +
    "chat_session_id, original_body, original_sha256, parsed_message_count) " +
    "VALUES ($1, $2, $3::uuid, $4::uuid, $5, $6, $7)",
    [
      personId(ticket), Number(sourceAction.id), action.message_id,
      sessionId, action.body,
      createHash("sha256").update(action.body).digest("hex"),
      messages.length,
    ],
  );
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const author = chatAuthor(message, ticket, primaryClient, row);
    await tx.unsafe(
      "INSERT INTO ticket_messages " +
      "(ticket_id, author_type, author_user_id, customer_contact_id, " +
      "visibility, channel, body, external_message_id, external_metadata, " +
      "created_at, updated_at) " +
      "VALUES ($1::uuid, $2, $3::uuid, $4::uuid, 'internal', 'web_chat', " +
      "$5, $6, $7::text::jsonb, $8, $8)",
      [
        ticketId, author.type, author.userId, author.contactId, author.body,
        "movidesk:chat:" + personId(ticket) + ":" + index,
        safeJson({
          source: "movidesk",
          sourceTicketId: personId(ticket),
          sourceActionId: Number(sourceAction.id),
          chatSessionId: sessionId,
          originalAuthorName: message.authorName,
          historical: true,
          portalAccessApproved: false,
        }), message.createdAt,
      ],
    );
  }

  await tx.unsafe(
    "UPDATE ticket_messages SET body = $2, author_type = 'system', " +
    "author_user_id = NULL, customer_contact_id = NULL " +
    "WHERE id = $1::uuid",
    [action.message_id, "Transcrição original arquivada; " +
      messages.length + " mensagens reconstruídas."],
  );
  return "reconstructed";
}

async function importTicket(db, ticket, queueId) {
  const id = personId(ticket);
  if (!FINAL_STATUSES.has(trimmed(ticket.baseStatus))) throw new Error("UNSUPPORTED_SNAPSHOT_STATUS");
  const clients = activeClientPeople(ticket);
  const client = primaryClient(ticket, clients);
  const createdAt = safeDate(ticket.createdDate);
  if (!createdAt) throw new Error("INVALID_CREATED_DATE");
  return db.begin(async (tx) => {
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", ["movidesk:" + id]);
    const existing = await tx.unsafe(
      "SELECT ticket_id::text FROM movidesk_ticket_imports WHERE source_ticket_id = $1",
      [id],
    );
    const contactId = client ? await historicalContact(tx, client) : null;
    let ticketId = existing[0]?.ticket_id;
    let result = "history_updated";
    if (!ticketId) {
      const ownerId = await uniqueAgent(tx, ticket.owner);
      const updatedAt = safeDate(ticket.lastUpdate, createdAt);
      const subject = trimmed(ticket.subject).slice(0, 350) || "Ticket Movidesk " + id;
      const created = await tx.unsafe(
        "INSERT INTO tickets (customer_contact_id, queue_id, assigned_user_id, " +
        "subject, status, priority, channel, created_at, updated_at, resolved_at, closed_at) " +
        "VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'normal', $6, $7, $8, $9, $10) RETURNING id::text",
        [
          contactId, queueId, ownerId, subject, statusFor(ticket.baseStatus),
          channelFor(ticket.origin), createdAt, updatedAt,
          safeDate(ticket.resolvedIn),
          ticket.baseStatus === "Canceled"
            ? safeDate(ticket.canceledIn, updatedAt)
            : safeDate(ticket.closedIn),
        ],
      );
      ticketId = created[0].id;
      await tx.unsafe(
        "INSERT INTO movidesk_ticket_imports " +
        "(source_ticket_id, ticket_id, source_status, source_base_status, " +
        "source_protocol, source_last_update) " +
        "VALUES ($1, $2::uuid, $3, $4, $5, $6)",
        [id, ticketId, trimmed(ticket.status), ticket.baseStatus,
          trimmed(ticket.protocol) || null, updatedAt],
      );
      const event = {
        source: "movidesk",
        sourceTicketId: id,
        sourceClientId: client ? personId(client) : null,
        sourceClientEmail: client ? trimmed(client.email) || null : null,
        sourceClientIds: clients.map(personId),
        primaryClientRequiresReview: !client,
        sourceOwnerId: personId(ticket.owner),
        sourceStatus: trimmed(ticket.status),
        sourceBaseStatus: ticket.baseStatus,
        sourceOrigin: Number(ticket.origin),
        sourceCategory: trimmed(ticket.category),
        sourceUrgency: trimmed(ticket.urgency),
        sourceCanceledAt: trimmed(ticket.canceledIn) || null,
        sourceTags: list(ticket.tags),
        sourceServices: list(ticket.serviceFull),
        sourceSla: {
          agreement: trimmed(ticket.slaAgreement) || null,
          rule: trimmed(ticket.slaAgreementRule) || null,
          responseMinutes: ticket.slaResponseTime ?? null,
          resolutionMinutes: ticket.slaSolutionTime ?? null,
          responseDueAt: trimmed(ticket.slaResponseDate) || null,
          resolutionDueAt: trimmed(ticket.slaSolutionDate) || null,
        },
        snapshot: "movidesk-final-snapshot",
        ownerHistories: list(ticket.ownerHistories),
        statusHistories: list(ticket.statusHistories),
        portalAccessApproved: false,
        attachmentsImported: false,
      };
      await tx.unsafe(
        "INSERT INTO ticket_events (ticket_id, event_type, metadata, created_at) " +
        "VALUES ($1::uuid, 'movidesk.ticket.imported', $2::text::jsonb, $3)",
        [ticketId, safeJson(event), createdAt],
      );
      result = "created";
    }
    const participants = await importParticipants(tx, ticket, ticketId, clients);
    const actions = await importActions(tx, ticket, ticketId, clients);
    const chat = await reconstructChat(tx, ticket, ticketId, client);
    return { id, ticketId, result, actions, participants, chat,
      primaryClientRequiresReview: !client };
  });
}

async function inspectSnapshot(directory) {
  const inventoryPath = resolve(directory, "inventory.json");
  const summaryPath = resolve(directory, "summary.json");
  const snapshotPath = resolve(directory, "tickets.jsonl");

  if (![inventoryPath, summaryPath, snapshotPath].every(existsSync)) {
    throw new Error("SNAPSHOT_FILES_MISSING");
  }
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const inventoryData = JSON.parse(readFileSync(inventoryPath, "utf8"));
  const references = inventoryData.tickets;
  if (summary.state !== "completed" || inventoryData.version !== 1 ||
    !Array.isArray(references) ||
    summary.total !== references.length ||
    summary.exported !== references.length) {
    throw new Error("SNAPSHOT_NOT_COMPLETE");
  }
  const inventory = new Map(references.map((item) => [
    String(item.sourceId), { route: item.route, status: item.status },
  ]));
  if (inventory.size !== references.length) throw new Error("DUPLICATE_INVENTORY_ID");

  const initialFile = statSync(snapshotPath);
  const seen = new Set();
  const counts = {
    tickets: 0,
    actions: 0,
    chats: 0,
    chatTranscriptsParsable: 0,
    withoutPrimaryContact: 0,
    statuses: {},
    origins: {},
  };
  for await (const { record } of iterateSnapshotLines(snapshotPath)) {
    const id = validateSnapshotRecord(record, inventory);
    if (seen.has(id)) throw new Error("DUPLICATE_SNAPSHOT_TICKET");
    seen.add(id);
    counts.tickets += 1;
    counts.actions += list(record.ticket.actions).filter((action) => !object(action).isDeleted).length;
    const status = record.ticket.baseStatus;
    counts.statuses[status] = (counts.statuses[status] ?? 0) + 1;
    const origin = String(record.ticket.origin ?? "unknown");
    counts.origins[origin] = (counts.origins[origin] ?? 0) + 1;
    if (Number(record.ticket.origin) === 5) {
      counts.chats += 1;
      const chatAction = list(record.ticket.actions).find((action) =>
        Number(object(action).origin) === 5 && !object(action).isDeleted);
      if (chatAction && splitMovideskChatTranscript(object(chatAction).description)) {
        counts.chatTranscriptsParsable += 1;
      }
    }
    if (!primaryClient(record.ticket, activeClientPeople(record.ticket))) {
      counts.withoutPrimaryContact += 1;
    }
  }
  if (seen.size !== inventory.size) throw new Error("SNAPSHOT_RECORD_COUNT_MISMATCH");
  const finalFile = statSync(snapshotPath);
  if (finalFile.size !== initialFile.size || finalFile.mtimeMs !== initialFile.mtimeMs) {
    throw new Error("SNAPSHOT_CHANGED_DURING_VALIDATION");
  }
  return { snapshotPath, inventory, counts, stat: finalFile };
}

async function main() {
  const options = parseSnapshotOptions(process.argv.slice(2));
  const validation = await inspectSnapshot(options.directory);
  console.log(JSON.stringify({
    phase: "validated",
    readOnly: true,
    directory: options.directory,
    counts: validation.counts,
    total: validation.counts.tickets,
    bytes: validation.stat.size,
  }));
  if (!options.apply) return;

  const databaseUrl = trimmed(process.env.DATABASE_URL);
  if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");
  const db = postgres(databaseUrl, {
    max: 1, prepare: false, connect_timeout: 10, idle_timeout: 10,
  });
  const counters = {
    examined: 0,
    created: 0,
    historyUpdated: 0,
    actions: 0,
    chatsReconstructed: 0,
    chatsRawPreserved: 0,
    failed: 0,
  };
  const failures = [];
  try {
    const [queue] = await db.unsafe(
      "SELECT id::text, active FROM support_queues WHERE code = $1",
      [options.queue],
    );
    if (!queue?.active) throw new Error("QUEUE_NOT_FOUND_OR_INACTIVE");
    const [tables] = await db.unsafe(
      "SELECT " +
      "to_regclass('public.movidesk_ticket_imports') IS NOT NULL AS mappings, " +
      "to_regclass('public.movidesk_ticket_action_imports') IS NOT NULL AS actions, " +
      "to_regclass('public.movidesk_chat_transcript_archives') IS NOT NULL AS archives, " +
      "to_regclass('public.ticket_participants') IS NOT NULL AS participants",
    );
    if (!Object.values(tables).every(Boolean)) {
      throw new Error("MOVIDESK_DATABASE_MIGRATIONS_REQUIRED");
    }

    const end = options.all ? validation.counts.tickets
      : Math.min(options.offset + options.limit, validation.counts.tickets);
    console.log(JSON.stringify({
      phase: "import_start", offset: options.offset, end,
      total: validation.counts.tickets, queue: options.queue,
    }));

    for await (const { lineNumber, record } of iterateSnapshotLines(validation.snapshotPath)) {
      const position = lineNumber - 1;
      if (position < options.offset) continue;
      if (position >= end) break;
      validateSnapshotRecord(record, validation.inventory);
      counters.examined += 1;
      const sourceId = String(record.sourceId);

      try {
        const result = await importTicket(db, record.ticket, queue.id);
        if (result.result === "created") counters.created += 1;
        else if (result.result === "history_updated") counters.historyUpdated += 1;
        counters.actions += result.actions ?? 0;
        if (result.chat === "reconstructed") counters.chatsReconstructed += 1;
        if (result.chat === "raw_preserved") counters.chatsRawPreserved += 1;
      } catch (error) {
        counters.failed += 1;
        const code = typeof error?.code === "string" ? error.code
          : error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)
            ? error.message : "IMPORT_TICKET_FAILED";
        const errorType = error instanceof Error ? error.name : "UnknownError";
        const errorLocation = error instanceof Error
          ? error.stack?.match(/import-movidesk-final-snapshot\.mjs:\d+:\d+/)?.[0] ?? null
          : null;
        const failure = { sourceId, code, errorType, errorLocation };
        failures.push(failure);
        console.error(JSON.stringify({ phase: "ticket_failed", ...failure }));
        if (counters.failed >= MAX_FAILURES) break;
      }
      if (counters.examined % options.progressEvery === 0) {
        console.log(JSON.stringify({ phase: "import_progress", ...counters }));
      }
    }

    const after = statSync(validation.snapshotPath);
    if (after.size !== validation.stat.size || after.mtimeMs !== validation.stat.mtimeMs) {
      throw new Error("SNAPSHOT_CHANGED_DURING_IMPORT");
    }

    console.log(JSON.stringify({
      phase: "import_finished",
      state: counters.failed ? "requires_review" : "completed",
      ...counters,
      failures,
      readOnly: false,
      notificationsSent: 0,
      sourceSnapshotPreserved: true,
    }));
    if (counters.failed) process.exitCode = 2;
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("SNAPSHOT_IMPORT_ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
