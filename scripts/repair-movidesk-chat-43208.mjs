import { createHash, randomBytes, randomUUID } from "node:crypto";
import postgres from "postgres";

const SOURCE_ID = "43208";
const SOURCE_API = "https://api.movidesk.com/public/v1/tickets";
const TIME_ZONE_OFFSET = "-03:00";
const MINIMUM_MESSAGES = 10;
const CHAT_LINE = /^\s*(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})\s*-\s*([^:]*):\s*(.*)$/;

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sourceId(value) {
  const id = record(value).id;
  return id === null || id === undefined ? "" : String(id);
}

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function parseDate(match) {
  const [, day, month, year, hour, minute] = match;
  const date = new Date(year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":00" + TIME_ZONE_OFFSET);
  if (!Number.isFinite(date.getTime())) throw new Error("INVALID_CHAT_DATE");
  return date;
}

function splitTranscript(body) {
  const messages = [];
  let current = null;
  const leading = [];
  for (const line of body.split(/\r?\n/)) {
    const match = line.match(CHAT_LINE);
    if (match) {
      if (current) messages.push(current);
      current = {
        createdAt: parseDate(match),
        authorName: match[6].trim(),
        body: match[7],
      };
    } else if (current) {
      current.body += "\n" + line;
    } else if (line.trim()) {
      leading.push(line);
    }
  }
  if (current) messages.push(current);
  if (messages.length < MINIMUM_MESSAGES) throw new Error("TRANSCRIPT_PATTERN_NOT_CONFIRMED");
  if (leading.some((line) => !/^(Fuso horário:|Equipe F10|Nota interna)/i.test(line.trim()))) {
    throw new Error("UNRECOGNIZED_TRANSCRIPT_HEADER");
  }
  if (messages.some((message) => !message.body.trim())) {
    throw new Error("EMPTY_CHAT_MESSAGE");
  }
  return messages;
}

function authorFor(message, clientName, ownerName, contactId, ownerId) {
  const name = message.authorName.toLowerCase().trim();
  if (!name) {
    return { type: "system", userId: null, contactId: null, body: message.body };
  }
  if (ownerName && name === ownerName.toLowerCase()) {
    return { type: "user", userId: ownerId, contactId: null, body: message.body };
  }
  if (clientName && name === clientName.toLowerCase()) {
    return { type: "customer", userId: null, contactId, body: message.body };
  }
  return {
    type: "system",
    userId: null,
    contactId: null,
    body: message.authorName + ": " + message.body,
  };
}

async function fetchSource(token) {
  const url = new URL(SOURCE_API);
  url.searchParams.set("token", token);
  url.searchParams.set("id", SOURCE_ID);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error("MOVIDESK_HTTP_" + response.status);
  const ticket = record(await response.json());
  if (sourceId(ticket) !== SOURCE_ID || Number(ticket.origin) !== 5) {
    throw new Error("SOURCE_IS_NOT_EXPECTED_CHAT");
  }
  const actions = Array.isArray(ticket.actions) ? ticket.actions : [];
  const action = actions.find((item) => Number(record(item).id) === 1);
  if (!action || Number(record(action).origin) !== 5) {
    throw new Error("SOURCE_ACTION_IS_NOT_CHAT");
  }
  return {
    ticket,
    action: record(action),
  };
}

async function inspect(db, source, apply) {
  return db.begin(async (tx) => {
    if (!apply) await tx.unsafe("SET TRANSACTION READ ONLY");
    else await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", ["movidesk:" + SOURCE_ID]);

    const tickets = await tx.unsafe(
      "SELECT t.id::text, t.ticket_number, t.channel, t.status, " +
      "t.queue_id::text, t.customer_contact_id::text, t.assigned_user_id::text, " +
      "i.source_ticket_id FROM movidesk_ticket_imports i " +
      "JOIN tickets t ON t.id = i.ticket_id WHERE i.source_ticket_id = $1",
      [SOURCE_ID],
    );
    if (tickets.length !== 1) throw new Error("F10_SOURCE_TICKET_NOT_FOUND");
    const ticket = tickets[0];

    const sourceActions = await tx.unsafe(
      "SELECT a.message_id::text, m.body, m.visibility, m.channel " +
      "FROM movidesk_ticket_action_imports a " +
      "JOIN ticket_messages m ON m.id = a.message_id " +
      "WHERE a.source_ticket_id = $1 AND a.source_action_id = 1",
      [SOURCE_ID],
    );
    if (sourceActions.length !== 1) throw new Error("ORIGINAL_ACTION_MESSAGE_MISSING");
    const original = sourceActions[0];

    const archive = await tx.unsafe(
      "SELECT source_ticket_id, parsed_message_count, chat_session_id::text " +
      "FROM movidesk_chat_transcript_archives WHERE source_ticket_id = $1",
      [SOURCE_ID],
    );
    if (archive.length > 0) {
      return { state: "already_converted", ticketId: ticket.id, archive: archive[0] };
    }
    const sessions = await tx.unsafe(
      "SELECT id::text FROM web_chat_sessions WHERE ticket_id = $1::uuid",
      [ticket.id],
    );
    if (sessions.length > 0) throw new Error("CHAT_SESSION_ALREADY_LINKED");

    const sourceDescription = typeof source.action.description === "string"
      ? source.action.description.trim() : "";
    if (!sourceDescription || original.body.trim() !== sourceDescription) {
      throw new Error("SOURCE_BODY_MISMATCH");
    }
    const messages = splitTranscript(original.body);
    const normalized = messages.map((message) =>
      authorFor(
        message,
        typeof record(source.ticket.clients?.[0]).businessName === "string"
          ? record(source.ticket.clients[0]).businessName.trim() : "",
        typeof record(source.ticket.owner).businessName === "string"
          ? record(source.ticket.owner).businessName.trim() : "",
        ticket.customer_contact_id,
        ticket.assigned_user_id,
      ),
    );
    const summary = {
      state: apply ? "converted" : "preview",
      ticketId: ticket.id,
      ticketNumber: ticket.ticket_number,
      chatOrigin: source.ticket.origin,
      messages: messages.length,
      customers: normalized.filter((message) => message.type === "customer").length,
      operators: normalized.filter((message) => message.type === "user").length,
      system: normalized.filter((message) => message.type === "system").length,
      archivedOriginal: apply,
      portalVisibility: "internal",
    };
    if (!apply) return summary;

    const closedAt = new Date(source.ticket.lastUpdate);
    const createdAt = new Date(source.ticket.createdDate);
    if (!Number.isFinite(closedAt.getTime()) || !Number.isFinite(createdAt.getTime())) {
      throw new Error("INVALID_SOURCE_TIMESTAMPS");
    }
    const sessionId = randomUUID();
    const tokenHash = digest(randomBytes(32));
    await tx.unsafe(
      "INSERT INTO web_chat_sessions (" +
      "id, ticket_id, customer_contact_id, queue_id, assigned_user_id, " +
      "subject, token_hash, expires_at, last_seen_at, closed_at, ai_state, " +
      "context_data, created_at, updated_at) " +
      "VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, " +
      "$6, $7, $8, $8, $8, 'disabled', $9::jsonb, $10, $8)",
      [
        sessionId, ticket.id, ticket.customer_contact_id, ticket.queue_id,
        ticket.assigned_user_id, "Chat histórico Movidesk #" + SOURCE_ID,
        tokenHash, closedAt,
        JSON.stringify({ source: "movidesk", sourceTicketId: SOURCE_ID, historical: true }),
        createdAt,
      ],
    );
    await tx.unsafe(
      "INSERT INTO movidesk_chat_transcript_archives " +
      "(source_ticket_id, source_action_id, original_message_id, " +
      "chat_session_id, original_body, original_sha256, parsed_message_count) " +
      "VALUES ($1, 1, $2::uuid, $3::uuid, $4, $5, $6)",
      [SOURCE_ID, original.message_id, sessionId, original.body, digest(original.body), messages.length],
    );

    for (let index = 0; index < messages.length; index += 1) {
      const message = messages[index];
      const author = normalized[index];
      await tx.unsafe(
        "INSERT INTO ticket_messages (" +
        "ticket_id, author_type, author_user_id, customer_contact_id, " +
        "visibility, channel, body, external_message_id, external_metadata, " +
        "created_at, updated_at) " +
        "VALUES ($1::uuid, $2, $3::uuid, $4::uuid, 'internal', 'web_chat', " +
        "$5, $6, $7::jsonb, $8, $8)",
        [
          ticket.id, author.type, author.userId, author.contactId,
          author.body.trim(), "movidesk:chat:" + SOURCE_ID + ":" + index,
          JSON.stringify({
            source: "movidesk",
            sourceTicketId: SOURCE_ID,
            sourceActionId: 1,
            sourceChatSessionId: sessionId,
            originalAuthorName: message.authorName,
            historical: true,
            portalAccessApproved: false,
          }), message.createdAt,
        ],
      );
    }
    await tx.unsafe(
      "UPDATE ticket_messages SET body = $2, author_type = 'system', " +
      "author_user_id = NULL, customer_contact_id = NULL, " +
      "channel = 'web_chat', updated_at = now() WHERE id = $1::uuid",
      [original.message_id, "Transcrição original do chat Movidesk #" + SOURCE_ID +
        " arquivada; conversa reconstruída em " + messages.length + " mensagens."],
    );
    await tx.unsafe(
      "UPDATE tickets SET channel = 'web_chat' WHERE id = $1::uuid",
      [ticket.id],
    );
    return { ...summary, sessionId };
  });
}

async function main() {
  const apply = process.argv.slice(2).includes("--apply");
  if (process.argv.slice(2).some((argument) => argument !== "--apply")) {
    throw new Error("UNKNOWN_ARGUMENT");
  }
  const token = (process.env.MOVIDESK_KB_API_TOKEN || process.env.MOVIDESK_API_TOKEN || "")
    .trim().replace(/^Bearer\s+/i, "");
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!token || !databaseUrl) throw new Error("ENVIRONMENT_NOT_CONFIGURED");
  const source = await fetchSource(token);
  const db = postgres(databaseUrl, { max: 1, connect_timeout: 10, prepare: false });
  try {
    const result = await inspect(db, source, apply);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
