import postgres from "postgres";

const SOURCE_ID = "43208";
const EXPECTED_MESSAGES = 30;
const MESSAGE_PREFIX = "movidesk:chat:" + SOURCE_ID + ":";

function validateMessages(messages) {
  if (messages.length !== EXPECTED_MESSAGES) {
    throw new Error("UNEXPECTED_IMPORTED_MESSAGE_COUNT:" + messages.length);
  }

  const seenIndices = new Set();
  for (const message of messages) {
    const suffix = message.external_message_id.slice(MESSAGE_PREFIX.length);
    const index = Number(suffix);
    if (!/^\d+$/.test(suffix) || index < 0 || index >= EXPECTED_MESSAGES || seenIndices.has(index)) {
      throw new Error("INVALID_HISTORICAL_MESSAGE_ID");
    }
    if (message.channel !== "web_chat" || !["internal", "public"].includes(message.visibility)) {
      throw new Error("UNEXPECTED_HISTORICAL_MESSAGE_STATE");
    }
    if (!["customer", "user", "system"].includes(message.author_type)) {
      throw new Error("UNEXPECTED_HISTORICAL_MESSAGE_AUTHOR");
    }
    seenIndices.add(index);
  }
}

function result(state, ticketId, sessionId, messages, updated = 0) {
  return {
    state,
    sourceTicketId: SOURCE_ID,
    ticketId,
    sessionId,
    messages: messages.length,
    alreadyPublic: messages.filter((message) => message.visibility === "public").length,
    awaitingVisibilityUpdate: messages.filter((message) => message.visibility === "internal").length,
    updatedMessages: updated,
    customerPortal: "withheld",
    notificationsSent: 0,
  };
}

async function inspect(db, apply) {
  return db.begin(async (tx) => {
    if (apply) {
      await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", ["movidesk:" + SOURCE_ID]);
    } else {
      await tx.unsafe("SET TRANSACTION READ ONLY");
    }

    const archives = await tx.unsafe(
      "SELECT a.chat_session_id::text AS session_id, a.parsed_message_count, " +
      "i.ticket_id::text AS ticket_id, t.channel AS ticket_channel " +
      "FROM movidesk_chat_transcript_archives a " +
      "JOIN movidesk_ticket_imports i ON i.source_ticket_id = a.source_ticket_id " +
      "JOIN tickets t ON t.id = i.ticket_id " +
      "JOIN web_chat_sessions s ON s.id = a.chat_session_id AND s.ticket_id = i.ticket_id " +
      "WHERE a.source_ticket_id = $1",
      [SOURCE_ID],
    );
    if (archives.length !== 1) throw new Error("HISTORICAL_CHAT_ARCHIVE_NOT_FOUND");

    const archive = archives[0];
    if (archive.parsed_message_count !== EXPECTED_MESSAGES || archive.ticket_channel !== "web_chat") {
      throw new Error("UNEXPECTED_HISTORICAL_CHAT_STATE");
    }

    const messages = await tx.unsafe(
      "SELECT id::text, external_message_id, visibility, channel, author_type, external_metadata " +
      "FROM ticket_messages " +
      "WHERE ticket_id = $1::uuid AND external_message_id LIKE $2 " +
      "ORDER BY external_message_id",
      [archive.ticket_id, MESSAGE_PREFIX + "%"],
    );
    validateMessages(messages);

    const missingProtection = messages.some(
      (message) => message.external_metadata?.portalAccessApproved !== false ||
        message.external_metadata?.sourceTicketId !== SOURCE_ID ||
        message.external_metadata?.sourceChatSessionId !== archive.session_id,
    );
    const remainingInternal = messages.filter((message) => message.visibility === "internal").length;
    if (!apply) {
      return { ...result("preview", archive.ticket_id, archive.session_id, messages),
        metadataRequiresRepair: missingProtection };
    }
    if (!missingProtection && remainingInternal === 0) {
      return result("already_updated", archive.ticket_id, archive.session_id, messages);
    }

    const updated = await tx.unsafe(
      "UPDATE ticket_messages SET " +
      "visibility = 'public', " +
      "external_metadata = coalesce(external_metadata, '{}'::jsonb) || " +
      "jsonb_build_object(" +
      "'source', 'movidesk', " +
      "'sourceTicketId', $3::text, " +
      "'sourceChatSessionId', $4::text, " +
      "'historical', true, " +
      "'portalAccessApproved', false) " +
      "WHERE ticket_id = $1::uuid AND external_message_id LIKE $2 " +
      "RETURNING id::text, visibility, external_metadata",
      [archive.ticket_id, MESSAGE_PREFIX + "%", SOURCE_ID, archive.session_id],
    );
    if (updated.length !== EXPECTED_MESSAGES ||
      updated.some((message) => message.visibility !== "public" ||
        message.external_metadata?.portalAccessApproved !== false ||
        message.external_metadata?.sourceTicketId !== SOURCE_ID ||
        message.external_metadata?.sourceChatSessionId !== archive.session_id)) {
      throw new Error("HISTORICAL_VISIBILITY_REPAIR_FAILED");
    }

    return {
      ...result("updated", archive.ticket_id, archive.session_id, messages, updated.length),
      visibilityChanged: remainingInternal,
      metadataRepaired: missingProtection,
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((argument) => argument !== "--apply")) {
    throw new Error("UNKNOWN_ARGUMENT");
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");

  const db = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });
  try {
    console.log(JSON.stringify(await inspect(db, args.includes("--apply")), null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
