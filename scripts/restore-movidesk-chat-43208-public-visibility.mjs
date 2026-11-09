import postgres from "postgres";

const SOURCE_ID = "43208";
const EXPECTED_MESSAGES = 30;

function formatResult(state, ticketId, sessionId, counts) {
  return {
    state,
    sourceTicketId: SOURCE_ID,
    ticketId,
    sessionId,
    messages: counts.total,
    alreadyPublic: counts.publicCount,
    awaitingVisibilityUpdate: counts.internalCount,
    customerPortal: "withheld",
    notificationsSent: 0,
  };
}

async function inspect(db, apply) {
  return db.begin(async (tx) => {
    if (apply) {
      await tx.unsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        ["movidesk:" + SOURCE_ID],
      );
    } else {
      await tx.unsafe("SET TRANSACTION READ ONLY");
    }

    const [archive] = await tx.unsafe(
      "SELECT archive.chat_session_id::text AS session_id, " +
      "archive.parsed_message_count, imported.ticket_id::text " +
      "FROM movidesk_chat_transcript_archives archive " +
      "JOIN movidesk_ticket_imports imported " +
      "ON imported.source_ticket_id = archive.source_ticket_id " +
      "JOIN web_chat_sessions chat ON chat.id = archive.chat_session_id " +
      "AND chat.ticket_id = imported.ticket_id " +
      "WHERE archive.source_ticket_id = $1",
      [SOURCE_ID],
    );
    if (!archive) throw new Error("HISTORICAL_CHAT_ARCHIVE_NOT_FOUND");
    if (archive.parsed_message_count !== EXPECTED_MESSAGES) {
      throw new Error("UNEXPECTED_ARCHIVED_MESSAGE_COUNT");
    }

    const messages = await tx.unsafe(
      "SELECT id::text, visibility, author_type, external_metadata " +
      "FROM ticket_messages " +
      "WHERE ticket_id = $1::uuid " +
      "AND external_metadata->>'sourceChatSessionId' = $2 " +
      "AND external_metadata->>'sourceTicketId' = $3",
      [archive.ticket_id, archive.session_id, SOURCE_ID],
    );
    if (messages.length !== EXPECTED_MESSAGES) {
      const [diagnostics] = await tx.unsafe(
        "SELECT " +
        "count(*) FILTER (WHERE external_message_id LIKE $2) AS source_prefix_count, " +
        "count(*) FILTER (WHERE external_metadata->>'sourceTicketId' = $3) AS source_metadata_count, " +
        "count(*) FILTER (WHERE external_metadata->>'sourceChatSessionId' = $4) AS session_metadata_count, " +
        "count(*) FILTER (WHERE external_metadata->>'sourceTicketId' = $3 " +
        "AND external_metadata->>'sourceChatSessionId' = $4) AS matching_metadata_count " +
        "FROM ticket_messages WHERE ticket_id = $1::uuid",
        [archive.ticket_id, "movidesk:chat:" + SOURCE_ID + ":%", SOURCE_ID, archive.session_id],
      );
      return {
        state: "requires_review",
        code: "UNEXPECTED_IMPORTED_MESSAGE_COUNT",
        sourceTicketId: SOURCE_ID,
        ticketId: archive.ticket_id,
        sessionId: archive.session_id,
        expectedMessages: EXPECTED_MESSAGES,
        matchedMessages: messages.length,
        diagnostics: {
          sourcePrefixCount: Number(diagnostics.source_prefix_count),
          sourceMetadataCount: Number(diagnostics.source_metadata_count),
          sessionMetadataCount: Number(diagnostics.session_metadata_count),
          matchingMetadataCount: Number(diagnostics.matching_metadata_count),
        },
        changesApplied: 0,
      };
    }
    for (const message of messages) {
      const metadata = message.external_metadata;
      if (
        metadata?.source !== "movidesk" ||
        metadata?.historical !== true ||
        metadata?.portalAccessApproved !== false ||
        !["internal", "public"].includes(message.visibility) ||
        !["customer", "user", "system"].includes(message.author_type)
      ) {
        throw new Error("UNSAFE_HISTORICAL_MESSAGE");
      }
    }

    const counts = {
      total: messages.length,
      internalCount: messages.filter((message) => message.visibility === "internal").length,
      publicCount: messages.filter((message) => message.visibility === "public").length,
    };
    if (!apply || counts.internalCount === 0) {
      return formatResult(
        apply ? "already_updated" : "preview",
        archive.ticket_id,
        archive.session_id,
        counts,
      );
    }

    const result = await tx.unsafe(
      "UPDATE ticket_messages " +
      "SET visibility = 'public' " +
      "WHERE ticket_id = $1::uuid " +
      "AND external_metadata->>'sourceChatSessionId' = $2 " +
      "AND external_metadata->>'sourceTicketId' = $3 " +
      "AND visibility = 'internal' " +
      "AND external_metadata->>'portalAccessApproved' = 'false' " +
      "RETURNING id",
      [archive.ticket_id, archive.session_id, SOURCE_ID],
    );
    if (result.length !== counts.internalCount) {
      throw new Error("HISTORICAL_VISIBILITY_UPDATE_MISMATCH");
    }

    return {
      ...formatResult("updated", archive.ticket_id, archive.session_id, counts),
      updatedMessages: result.length,
    };
  });
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply")) {
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
    const result = await inspect(db, args.includes("--apply"));
    console.log(JSON.stringify(result, null, 2));
    if (result.state === "requires_review") process.exitCode = 2;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(
    "ERROR:",
    error instanceof Error ? error.message : "UNKNOWN_ERROR",
  );
  process.exitCode = 1;
});
