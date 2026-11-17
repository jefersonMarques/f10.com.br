import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import postgres from "postgres";
import { putStoredObject } from "./lib/s3-object-storage.mjs";

const SNAPSHOT_DIRECTORY = "/var/lib/f10/movidesk-final-snapshot";
const DOWNLOAD_ENDPOINT = "https://api.movidesk.com/public/v1/storage/download";
const REQUEST_INTERVAL_MS = 6100;
const MAX_FILE_BYTES = 100 * 1024 * 1024;

const MIME_BY_EXTENSION = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  txt: "text/plain",
  csv: "text/csv",
  zip: "application/zip",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pfx: "application/x-pkcs12",
  p12: "application/x-pkcs12",
};

function parseOptions(args) {
  const options = { apply: false, ticket: "42746", directory: SNAPSHOT_DIRECTORY, limit: null };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--all") options.ticket = null;
    else if (argument === "--ticket") options.ticket = args[++index];
    else if (argument === "--directory") options.directory = args[++index];
    else if (argument === "--limit") options.limit = Number(args[++index]);
    else throw new Error("UNKNOWN_ARGUMENT:" + argument);
  }
  if (!options.directory?.startsWith("/") ||
      (options.ticket !== null && !/^[0-9]+$/.test(options.ticket ?? "")) ||
      (options.limit !== null && (!Number.isSafeInteger(options.limit) || options.limit < 1)) ||
      (options.ticket !== null && options.limit !== null)) {
    throw new Error("INVALID_ARGUMENTS");
  }
  return options;
}

function fileNameOf(file) {
  return String(file?.fileName ?? file?.name ?? "attachment")
    .replace(/[\\/\u0000-\u001f\u007f]/g, "-")
    .trim()
    .slice(0, 180) || "attachment";
}

function extensionOf(name) {
  return name.match(/\.([a-z0-9]{1,12})$/i)?.[1].toLowerCase() ?? "bin";
}

function actionsWithAttachments(ticket) {
  return (Array.isArray(ticket?.actions) ? ticket.actions : [])
    .filter((action) => action && action.isDeleted !== true)
    .filter((action) => Array.isArray(action.attachments) && action.attachments.length > 0);
}

async function* snapshotRecords(filePath) {
  const stream = createReadStream(filePath, { encoding: "utf8", highWaterMark: 256 * 1024 });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of reader) {
      if (line.trim()) yield JSON.parse(line);
    }
  } finally {
    reader.close();
    stream.destroy();
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function networkErrorCode(cause) {
  const direct = cause?.code;
  const nested = cause?.cause;
  const code = direct || nested?.code || nested?.errors?.[0]?.code || nested?.cause?.code;
  return typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : "UNKNOWN";
}

class MovideskDownloader {
  constructor(token) {
    this.token = token;
    this.nextRequestAt = 0;
  }

  async download(hash) {
    const url = new URL(DOWNLOAD_ENDPOINT);
    url.searchParams.set("token", this.token);
    url.searchParams.set("id", hash);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await delay(Math.max(0, this.nextRequestAt - Date.now()));
      this.nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
      let response;
      try {
        response = await fetch(url, {
          headers: { Accept: "application/octet-stream" },
          redirect: "follow",
          cache: "no-store",
          signal: AbortSignal.timeout(120000),
        });
      } catch (cause) {
        if (attempt === 2) {
          throw new Error("MOVIDESK_NETWORK_ERROR_" + networkErrorCode(cause), { cause });
        }
        continue;
      }

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers.get("retry-after"));
        await response.body?.cancel();
        if (attempt === 2) throw new Error("MOVIDESK_HTTP_" + response.status);
        const wait = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : REQUEST_INTERVAL_MS * (attempt + 1);
        this.nextRequestAt = Math.max(this.nextRequestAt, Date.now() + wait);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error("MOVIDESK_HTTP_" + response.status);
      }

      const declaredSize = Number(response.headers.get("content-length") ?? 0);
      if (declaredSize > MAX_FILE_BYTES) {
        await response.body?.cancel();
        throw new Error("ATTACHMENT_TOO_LARGE");
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error("ATTACHMENT_INVALID_SIZE");
      return { bytes, contentType: response.headers.get("content-type") ?? "" };
    }
    throw new Error("MOVIDESK_RETRIES_EXHAUSTED");
  }
}

async function findMessage(db, ticketId, actionId) {
  const [row] = await db.unsafe(
    "SELECT i.ticket_id::text AS ticket_id, a.message_id::text AS message_id, " +
    "m.ticket_id::text AS message_ticket_id " +
    "FROM movidesk_ticket_imports i " +
    "JOIN movidesk_ticket_action_imports a ON a.source_ticket_id = i.source_ticket_id " +
    "JOIN ticket_messages m ON m.id = a.message_id " +
    "WHERE i.source_ticket_id = $1 AND a.source_action_id = $2",
    [ticketId, actionId],
  );
  if (row && row.ticket_id !== row.message_ticket_id) {
    throw new Error("SOURCE_MESSAGE_TICKET_MISMATCH");
  }
  return row ?? null;
}

async function recoverAttachment(db, downloader, message, sourceFile, index) {
  const hash = String(sourceFile?.path ?? "").trim().toUpperCase();
  if (!/^[A-F0-9]{32}$/.test(hash)) throw new Error("SOURCE_ATTACHMENT_HASH_INVALID");

  const name = fileNameOf(sourceFile);
  const extension = extensionOf(name);
  const key = "support/tickets/" + message.ticket_id + "/" + message.message_id +
    "/movidesk-" + hash + "-" + index + "." + extension;
  const query = "SELECT id::text FROM ticket_message_attachments " +
    "WHERE storage_key = $1 AND ticket_id = $2::uuid AND message_id = $3::uuid";
  const params = [key, message.ticket_id, message.message_id];
  const [existing] = await db.unsafe(query, params);
  if (existing) return "existing";

  const source = await downloader.download(hash);
  const receivedType = source.contentType.split(";")[0].trim().toLowerCase();
  if (receivedType === "text/html" && extension !== "html") {
    throw new Error("MOVIDESK_UNEXPECTED_HTML_RESPONSE");
  }
  const mimeType = receivedType && receivedType !== "application/octet-stream"
    ? receivedType
    : MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
  const stored = await putStoredObject(key, source.bytes, mimeType);

  const [inserted] = await db.unsafe(
    "INSERT INTO ticket_message_attachments " +
    "(ticket_id, message_id, storage_key, original_name, mime_type, size_bytes, checksum_sha256) " +
    "VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7) " +
    "ON CONFLICT (storage_key) DO NOTHING RETURNING id::text",
    [message.ticket_id, message.message_id, stored.key, name, mimeType, stored.size, stored.checksumSha256],
  );
  if (inserted) return "stored";

  const [confirmed] = await db.unsafe(query, params);
  if (!confirmed) throw new Error("DESTINATION_ATTACHMENT_CONFLICT");
  return "existing";
}

async function markActionComplete(db, messageId, ticketId, actionId) {
  await db.unsafe(
    "UPDATE ticket_messages SET external_metadata = jsonb_set(" +
    "coalesce(external_metadata, '{}'::jsonb), '{attachmentsImported}', 'true'::jsonb, true) " +
    "WHERE id = $1::uuid AND external_metadata->>'sourceTicketId' = $2 " +
    "AND external_metadata->>'sourceActionId' = $3",
    [messageId, ticketId, String(actionId)],
  );
}

function report(payload) {
  console.log(JSON.stringify(payload));
}

async function recoverTicket(db, downloader, record, options, totals) {
  const ticketId = String(record.sourceId ?? "");
  if (ticketId !== String(record.ticket?.id ?? "")) throw new Error("SNAPSHOT_ID_MISMATCH");

  const actions = actionsWithAttachments(record.ticket);
  if (!actions.length) return;
  totals.tickets += 1;

  for (const action of actions) {
    const actionId = Number(action.id);
    if (!Number.isSafeInteger(actionId) || actionId < 1) throw new Error("INVALID_ACTION_ID");

    if (!options.apply) {
      totals.pending += action.attachments.length;
      report({
        state: "preview",
        ticketId,
        actionId,
        attachments: action.attachments.map((file) => ({
          name: fileNameOf(file),
          hash: file.path ?? null,
        })),
      });
      continue;
    }

    const message = await findMessage(db, ticketId, actionId);
    if (!message) {
      totals.missingActions += 1;
      report({ state: "missing_action", ticketId, actionId });
      continue;
    }

    let complete = true;
    for (const [index, file] of action.attachments.entries()) {
      try {
        const state = await recoverAttachment(db, downloader, message, file, index);
        totals[state] += 1;
        report({ state, ticketId, actionId, name: fileNameOf(file) });
      } catch (cause) {
        complete = false;
        totals.failed += 1;
        report({
          state: "failed",
          ticketId,
          actionId,
          name: fileNameOf(file),
          reason: cause instanceof Error ? cause.message : "UNKNOWN_ERROR",
        });
        if (cause instanceof Error && cause.message.startsWith("MOVIDESK_NETWORK_ERROR_")) {
          throw new Error("MOVIDESK_CONNECTION_INTERRUPTED");
        }
      }
    }
    if (complete) await markActionComplete(db, message.message_id, ticketId, actionId);
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const totals = { tickets: 0, pending: 0, stored: 0, existing: 0, failed: 0, missingActions: 0 };
  const token = (process.env.MOVIDESK_KB_API_TOKEN || process.env.MOVIDESK_API_TOKEN || "")
    .trim().replace(/^Bearer\s+/i, "");

  if (options.apply && (!process.env.DATABASE_URL || !token)) {
    throw new Error("DATABASE_URL_OR_MOVIDESK_TOKEN_MISSING");
  }

  const db = options.apply
    ? postgres(process.env.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 10 })
    : null;
  const downloader = options.apply ? new MovideskDownloader(token) : null;
  let processed = 0;
  let matched = false;

  try {
    for await (const record of snapshotRecords(options.directory + "/tickets.jsonl")) {
      if (options.ticket !== null && String(record.sourceId) !== options.ticket) continue;
      matched = true;
      await recoverTicket(db, downloader, record, options, totals);
      processed += 1;
      if (options.ticket !== null || (options.limit !== null && processed >= options.limit)) break;
      if (processed % 100 === 0) report({ state: "progress", processed, ...totals });
    }
    if (!matched) throw new Error("SOURCE_TICKET_NOT_FOUND");
    report({ state: options.apply ? "completed" : "validated", processed, ...totals });
    if (totals.failed || totals.missingActions) process.exitCode = 2;
  } finally {
    if (db) await db.end({ timeout: 5 });
  }
}

main().catch((cause) => {
  console.error(JSON.stringify({
    state: "error",
    reason: cause instanceof Error ? cause.message : "UNKNOWN_ERROR",
  }));
  process.exitCode = 1;
});
