import postgres from "postgres";

const BASE_URL = "https://api.movidesk.com/public/v1";
const SOURCE_TICKET_ID = "43208";

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function sourceId(value) {
  const id = asRecord(value).id;
  return id === null || id === undefined ? null : String(id);
}

function relatedIds(value) {
  return asArray(value).map(sourceId).filter(Boolean);
}

function summarizeActions(actions) {
  return asArray(actions).map((raw) => {
    const action = asRecord(raw);
    const description = typeof action.description === "string" ? action.description : "";
    const lines = description.split(/\r?\n/);
    const chatLines = lines.filter((line) =>
      /^\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*-/.test(line),
    );
    return {
      id: action.id ?? null,
      type: action.type ?? null,
      origin: action.origin ?? null,
      createdDate: action.createdDate ?? null,
      authorId: sourceId(action.createdBy),
      descriptionLength: description.length,
      transcriptLineCount: chatLines.length,
      attachmentCount: asArray(action.attachments).length,
      mentionsSourceTicketNumber: description.includes(SOURCE_TICKET_ID),
    };
  });
}

async function readMovidesk(token) {
  const url = new URL(BASE_URL + "/tickets");
  url.searchParams.set("token", token);
  url.searchParams.set("id", SOURCE_TICKET_ID);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("MOVIDESK_HTTP_" + response.status);
  const source = asRecord(await response.json());
  if (sourceId(source) !== SOURCE_TICKET_ID) throw new Error("SOURCE_ID_MISMATCH");
  return {
    id: SOURCE_TICKET_ID,
    origin: source.origin ?? null,
    type: source.type ?? null,
    baseStatus: source.baseStatus ?? null,
    status: source.status ?? null,
    createdDate: source.createdDate ?? null,
    lastUpdate: source.lastUpdate ?? null,
    movideskTicketNumber: source.movideskTicketNumber ?? null,
    linkedToIntegratedTicketNumber: source.linkedToIntegratedTicketNumber ?? null,
    parentTickets: relatedIds(source.parentTickets),
    childrenTickets: relatedIds(source.childrenTickets),
    actions: summarizeActions(source.actions),
  };
}

async function readF10(databaseUrl) {
  const db = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    return await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      const tickets = await tx.unsafe(
        "SELECT t.id::text, t.ticket_number, t.channel, t.status, " +
        "t.assigned_user_id IS NOT NULL AS has_owner, " +
        "t.customer_contact_id IS NOT NULL AS has_customer, " +
        "i.source_ticket_id " +
        "FROM movidesk_ticket_imports i JOIN tickets t ON t.id = i.ticket_id " +
        "WHERE i.source_ticket_id = $1",
        [SOURCE_TICKET_ID],
      );
      if (tickets.length !== 1) return { mapping: "not_found" };
      const ticket = tickets[0];
      const messages = await tx.unsafe(
        "SELECT m.id::text, m.channel, m.author_type, m.visibility, " +
        "char_length(m.body) AS body_length, " +
        "m.external_metadata->>'sourceVisibility' AS original_visibility, " +
        "a.source_action_id " +
        "FROM ticket_messages m " +
        "LEFT JOIN movidesk_ticket_action_imports a ON a.message_id = m.id " +
        "WHERE m.ticket_id = $1::uuid ORDER BY m.created_at",
        [ticket.id],
      );
      const chats = await tx.unsafe(
        "SELECT id::text, ticket_id::text, closed_at IS NOT NULL AS closed " +
        "FROM web_chat_sessions WHERE ticket_id = $1::uuid",
        [ticket.id],
      );
      return { ticket, messages, linkedChats: chats };
    });
  } finally {
    await db.end();
  }
}

async function main() {
  const token = (process.env.MOVIDESK_KB_API_TOKEN || process.env.MOVIDESK_API_TOKEN || "")
    .trim().replace(/^Bearer\s+/i, "");
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!token || !databaseUrl) throw new Error("ENVIRONMENT_NOT_CONFIGURED");
  const [movidesk, f10] = await Promise.all([
    readMovidesk(token),
    readF10(databaseUrl),
  ]);
  console.log(JSON.stringify({ readOnly: true, movidesk, f10 }, null, 2));
}

main().catch((cause) => {
  console.error("ERROR:", cause instanceof Error ? cause.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
