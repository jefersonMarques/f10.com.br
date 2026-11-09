import { createHash } from "node:crypto";
import postgres from "postgres";
import { putStoredObject } from "./lib/s3-object-storage.mjs";

const SOURCE_TICKET_ID = "43208";
const TICKET_ID = "5ad46015-2ec6-4466-b688-92dc2dafea81";
const CHAT_SESSION_ID = "ae41c3c2-c9b5-4dd9-ba83-65f2aae356a4";
const MAX_BYTES = 10 * 1024 * 1024;
const SOURCE_URL_PATTERN = /https:\/\/s3\.amazonaws\.com\/movidesk-files\/[a-zA-Z0-9]+(?:\?[^\s)\]]+)?/g;

function digest(input) {
  return createHash("sha256").update(input).digest("hex");
}

function extractAttachment(body) {
  const sourceUrls = [...body.matchAll(SOURCE_URL_PATTERN)].map((match) =>
    match[0].replace(/[*\\.,;]+$/, "").replace(/\\&/g, "&"),
  );
  if (sourceUrls.length === 0) throw new Error("SOURCE_ATTACHMENT_URL_NOT_FOUND");

  const urls = sourceUrls.map((value) => new URL(value));
  const paths = new Set(urls.map((url) => url.pathname));
  if (paths.size !== 1) throw new Error("MULTIPLE_SOURCE_ATTACHMENTS_REQUIRE_REVIEW");

  for (const url of urls) {
    if (url.protocol !== "https:" || url.hostname !== "s3.amazonaws.com" ||
      !/^\/movidesk-files\/[a-zA-Z0-9]+$/.test(url.pathname) ||
      url.username || url.password || !url.searchParams.has("Signature") ||
      !url.searchParams.has("Expires")) {
      throw new Error("SOURCE_ATTACHMENT_URL_NOT_ALLOWED");
    }
  }

  const source = urls[0];
  const expires = Number(source.searchParams.get("Expires"));
  if (!Number.isSafeInteger(expires)) throw new Error("SOURCE_ATTACHMENT_EXPIRY_INVALID");

  const sizeMatch = body.match(/([^\n()]+\.jpe?g)\s*\((\d+)\s*KB\)/i);
  const name = sizeMatch?.[1]?.trim().replace(/[\/\\\x00-\x1f]/g, "-").slice(0, 180);
  if (!name) throw new Error("SOURCE_ATTACHMENT_FILENAME_NOT_FOUND");

  const lines = body.split(/\r?\n/);
  const linkedLines = lines.filter((line) => line.includes("/movidesk-files/"));
  if (linkedLines.length !== 1 || !/\.jpe?g/i.test(linkedLines[0])) {
    throw new Error("SOURCE_ATTACHMENT_MESSAGE_FORMAT_UNEXPECTED");
  }

  const cleanedBody = lines.filter((line) => !line.includes("/movidesk-files/"))
    .join("\n").trim();
  if (!cleanedBody) throw new Error("CLEANED_MESSAGE_EMPTY");

  return {
    source,
    expires,
    name,
    sourcePath: source.pathname,
    cleanedBody,
    declaredKilobytes: Number(sizeMatch[2]),
  };
}

function ensureJpeg(bytes) {
  if (bytes.byteLength < 4 || bytes.byteLength > MAX_BYTES ||
    bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff ||
    bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
    throw new Error("SOURCE_ATTACHMENT_INVALID_JPEG");
  }
}

async function downloadImage(attachment) {
  if (attachment.expires <= Math.floor(Date.now() / 1000)) {
    throw new Error("SOURCE_ATTACHMENT_URL_EXPIRED");
  }
  const response = await fetch(attachment.source, {
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("SOURCE_ATTACHMENT_HTTP_" + response.status);
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BYTES) {
    throw new Error("SOURCE_ATTACHMENT_TOO_LARGE");
  }
  const data = new Uint8Array(await response.arrayBuffer());
  ensureJpeg(data);
  return data;
}

async function findMessage(tx) {
  const [archive] = await tx.unsafe(
    "SELECT a.chat_session_id::text, a.parsed_message_count " +
    "FROM movidesk_chat_transcript_archives a " +
    "JOIN movidesk_ticket_imports i ON i.source_ticket_id = a.source_ticket_id " +
    "WHERE a.source_ticket_id = $1 AND i.ticket_id = $2::uuid",
    [SOURCE_TICKET_ID, TICKET_ID],
  );
  if (archive?.chat_session_id !== CHAT_SESSION_ID || archive.parsed_message_count !== 30) {
    throw new Error("HISTORICAL_CHAT_ARCHIVE_MISMATCH");
  }
  const messages = await tx.unsafe(
    "SELECT id::text, body, channel, visibility, author_type, external_message_id, " +
    "external_metadata FROM ticket_messages " +
    "WHERE ticket_id = $1::uuid " +
    "AND external_message_id LIKE $2 " +
    "AND body LIKE '%/movidesk-files/%'",
    [TICKET_ID, "movidesk:chat:" + SOURCE_TICKET_ID + ":%"],
  );
  if (messages.length !== 1) throw new Error("SOURCE_ATTACHMENT_MESSAGE_COUNT_" + messages.length);
  const message = messages[0];
  if (message.channel !== "web_chat" || message.author_type !== "customer" ||
      message.visibility !== "public" ||
      message.external_metadata?.portalAccessApproved !== false ||
      message.external_metadata?.sourceTicketId !== SOURCE_TICKET_ID ||
      message.external_metadata?.sourceChatSessionId !== CHAT_SESSION_ID) {
    throw new Error("SOURCE_ATTACHMENT_MESSAGE_NOT_APPROVED_FOR_IMPORT");
  }
  return message;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--apply")) throw new Error("UNKNOWN_ARGUMENT");
  const apply = args.includes("--apply");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_MISSING");

  const db = postgres(process.env.DATABASE_URL, {
    max: 1, prepare: false, connect_timeout: 10,
  });
  try {
    const message = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      return findMessage(tx);
    });
    const attachment = extractAttachment(message.body);
    const sourceKey = digest(attachment.sourcePath);
    const key = "support/tickets/" + TICKET_ID + "/" + message.id +
      "/movidesk-" + sourceKey + ".jpg";
    const [existing] = await db.unsafe(
      "SELECT id::text FROM ticket_message_attachments " +
      "WHERE ticket_id = $1::uuid AND message_id = $2::uuid AND storage_key = $3",
      [TICKET_ID, message.id, key],
    );
    if (existing) {
      console.log(JSON.stringify({ state: "already_imported", messageId: message.id, attachmentId: existing.id }, null, 2));
      return;
    }

    if (!apply) {
      console.log(JSON.stringify({
        state: "preview",
        ticketId: TICKET_ID,
        messageId: message.id,
        originalName: attachment.name,
        declaredKilobytes: attachment.declaredKilobytes,
        sourceUrlExpiresAt: new Date(attachment.expires * 1000).toISOString(),
        destinationKey: key,
        notificationsSent: 0,
        changesApplied: 0,
      }, null, 2));
      return;
    }

    const bytes = await downloadImage(attachment);
    const stored = await putStoredObject(key, bytes, "image/jpeg");

    const result = await db.begin(async (tx) => {
      await tx.unsafe(
        "SELECT pg_advisory_xact_lock(hashtext($1))",
        ["movidesk-media:" + SOURCE_TICKET_ID],
      );
      const current = await findMessage(tx);
      if (current.id !== message.id || current.body !== message.body) {
        throw new Error("SOURCE_ATTACHMENT_MESSAGE_CHANGED");
      }
      const recorded = await tx.unsafe(
        "INSERT INTO ticket_message_attachments " +
        "(ticket_id, message_id, storage_key, original_name, mime_type, size_bytes, checksum_sha256) " +
        "VALUES ($1::uuid, $2::uuid, $3, $4, 'image/jpeg', $5, $6) " +
        "ON CONFLICT (storage_key) DO NOTHING RETURNING id::text",
        [TICKET_ID, message.id, stored.key, attachment.name, stored.size, stored.checksumSha256],
      );
      if (recorded.length !== 1) throw new Error("SOURCE_ATTACHMENT_ALREADY_RECORDED");

      const updated = await tx.unsafe(
        "UPDATE ticket_messages SET body = $2, " +
        "external_metadata = external_metadata || " +
        "jsonb_build_object('movideskMediaImported', true) " +
        "WHERE id = $1::uuid AND body = $3 RETURNING id::text",
        [message.id, attachment.cleanedBody, message.body],
      );
      if (updated.length !== 1) throw new Error("SOURCE_ATTACHMENT_MESSAGE_UPDATE_FAILED");
      return recorded[0].id;
    });

    console.log(JSON.stringify({
      state: "imported",
      ticketId: TICKET_ID,
      messageId: message.id,
      attachmentId: result,
      sizeBytes: stored.size,
      checksumSha256: stored.checksumSha256,
      notificationsSent: 0,
    }, null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
