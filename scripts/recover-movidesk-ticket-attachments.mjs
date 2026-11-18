import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import postgres from "postgres";
import { putStoredObject } from "./lib/s3-object-storage.mjs";
import {
  htmlContentImages,
  inlineSourceLinks,
  isImageAttachment,
  rewriteStoredLinks,
} from "./lib/movideskInlineMedia.mjs";

const SNAPSHOT_DIRECTORY = "/var/lib/f10/movidesk-final-snapshot";
const DOWNLOAD_ENDPOINT = "https://api.movidesk.com/public/v1/storage/download";
const REQUEST_INTERVAL_MS = 6100;
const MAX_FILE_BYTES = 100 * 1024 * 1024;
const MAX_CACHE_BYTES = 64 * 1024 * 1024;
const MAX_CACHED_FILE_BYTES = 8 * 1024 * 1024;

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
  const options = { apply: false, ticket: "42746", directory: SNAPSHOT_DIRECTORY, offset: 0, limit: null };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--all") options.ticket = null;
    else if (argument === "--ticket") options.ticket = args[++index];
    else if (argument === "--directory") options.directory = args[++index];
    else if (argument === "--limit") options.limit = Number(args[++index]);
    else if (argument === "--offset") options.offset = Number(args[++index]);
    else throw new Error("UNKNOWN_ARGUMENT:" + argument);
  }
  if (!options.directory?.startsWith("/") ||
      (options.ticket !== null && !/^[0-9]+$/.test(options.ticket ?? "")) ||
      (options.limit !== null && (!Number.isSafeInteger(options.limit) || options.limit < 1)) ||
      !Number.isSafeInteger(options.offset) || options.offset < 0 ||
      (options.ticket !== null && (options.limit !== null || options.offset !== 0))) {
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

function detectedMime(bytes) {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 &&
      bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 &&
      bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)).startsWith("GIF8")) {
    return "image/gif";
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-") {
    return "application/pdf";
  }
  const beginning = new TextDecoder().decode(bytes.slice(0, 80)).trimStart().toLowerCase();
  if (beginning.startsWith("<!doctype html") || beginning.startsWith("<html")) {
    throw new Error("MOVIDESK_UNEXPECTED_HTML_RESPONSE");
  }
  return null;
}

function actionsWithMedia(ticket) {
  return (Array.isArray(ticket?.actions) ? ticket.actions : [])
    .filter((action) => action && action.isDeleted !== true)
    .filter((action) =>
      (Array.isArray(action.attachments) && action.attachments.length > 0) ||
      inlineSourceLinks(action.description).length > 0 ||
      htmlContentImages(action.htmlDescription).length > 0);
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

function networkErrorDetails(cause, token) {
  const nested = cause?.cause;
  const detail = nested?.message || nested?.errors?.[0]?.message || cause?.message || "unknown";
  return String(detail)
    .replaceAll(token, "[REDACTED]")
    .replace(/token=[^&\s]+/gi, "token=[REDACTED]")
    .slice(0, 180);
}

class MovideskDownloader {
  constructor(token) {
    this.token = token;
    this.nextRequestAt = 0;
    this.cache = new Map();
    this.cachedBytes = 0;
  }

  remember(hash, file) {
    if (file.bytes.byteLength > MAX_CACHED_FILE_BYTES) return;
    while (this.cachedBytes + file.bytes.byteLength > MAX_CACHE_BYTES) {
      const oldest = this.cache.keys().next().value;
      if (!oldest) break;
      this.cachedBytes -= this.cache.get(oldest).bytes.byteLength;
      this.cache.delete(oldest);
    }
    this.cache.set(hash, file);
    this.cachedBytes += file.bytes.byteLength;
  }

  async download(hash) {
    const cached = this.cache.get(hash);
    if (cached) {
      this.cache.delete(hash);
      this.cache.set(hash, cached);
      return cached;
    }

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
        const message = "MOVIDESK_NETWORK_ERROR_" + networkErrorCode(cause) +
          ":" + networkErrorDetails(cause, this.token);
        throw new Error(message, { cause });
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
      const chunks = [];
      let total = 0;
      try {
        for await (const chunk of response.body ?? []) {
          total += chunk.byteLength;
          if (total > MAX_FILE_BYTES) {
            throw new Error("ATTACHMENT_TOO_LARGE");
          }
          chunks.push(chunk);
        }
      } catch (cause) {
        await response.body?.cancel().catch(() => undefined);
        if (cause instanceof Error && cause.message === "ATTACHMENT_TOO_LARGE") {
          throw cause;
        }
        throw new Error(
          "MOVIDESK_NETWORK_ERROR_" + networkErrorCode(cause) +
          ":" + networkErrorDetails(cause, this.token),
          { cause },
        );
      }
      if (total === 0) throw new Error("ATTACHMENT_INVALID_SIZE");
      const bytes = new Uint8Array(total);
      let position = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, position);
        position += chunk.byteLength;
      }
      const file = { bytes, contentType: response.headers.get("content-type") ?? "" };
      this.remember(hash, file);
      return file;
    }
    throw new Error("MOVIDESK_RETRIES_EXHAUSTED");
  }
}

async function findMessage(db, ticketId, actionId) {
  const [row] = await db.unsafe(
    "SELECT i.ticket_id::text AS ticket_id, a.message_id::text AS message_id, " +
    "m.ticket_id::text AS message_ticket_id, " +
    "m.external_metadata->>'source' AS source_system, " +
    "m.external_metadata->>'sourceTicketId' AS source_ticket_id, " +
    "m.external_metadata->>'sourceActionId' AS source_action_id, " +
    "m.external_metadata->>'sourceVisibility' AS source_visibility, " +
    "m.external_message_id, a.source_visibility AS mapped_visibility " +
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
  const query = "SELECT id::text, mime_type FROM ticket_message_attachments " +
    "WHERE storage_key = $1 AND ticket_id = $2::uuid AND message_id = $3::uuid";
  const params = [key, message.ticket_id, message.message_id];
  const [existing] = await db.unsafe(query, params);
  if (existing) return { state: "existing", id: existing.id, mimeType: existing.mime_type };

  const source = await downloader.download(hash);
  const receivedType = source.contentType.split(";")[0].trim().toLowerCase();
  if (receivedType === "text/html" || receivedType === "application/json") {
    throw new Error("MOVIDESK_UNEXPECTED_DOCUMENT_RESPONSE");
  }
  const mimeType = detectedMime(source.bytes) ??
    (receivedType && receivedType !== "application/octet-stream"
      ? receivedType
      : MIME_BY_EXTENSION[extension] ?? "application/octet-stream");
  const stored = await putStoredObject(key, source.bytes, mimeType);

  const [inserted] = await db.unsafe(
    "INSERT INTO ticket_message_attachments " +
    "(ticket_id, message_id, storage_key, original_name, mime_type, size_bytes, checksum_sha256) " +
    "VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7) " +
    "ON CONFLICT (storage_key) DO NOTHING RETURNING id::text",
    [message.ticket_id, message.message_id, stored.key, name, mimeType, stored.size, stored.checksumSha256],
  );
  if (inserted) return { state: "stored", id: inserted.id, mimeType };

  const [confirmed] = await db.unsafe(query, params);
  if (!confirmed) throw new Error("DESTINATION_ATTACHMENT_CONFLICT");
  return { state: "existing", id: confirmed.id, mimeType: confirmed.mime_type };
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

async function historicalActionMessages(db, sourceTicketId, ticketId, actionId) {
  return db.unsafe(
    "SELECT id::text, body, external_metadata FROM ticket_messages " +
    "WHERE ticket_id = $1::uuid " +
    "AND external_metadata->>'source' = 'movidesk' " +
    "AND external_metadata->>'sourceTicketId' = $2 " +
    "AND external_metadata->>'sourceActionId' = $3",
    [ticketId, sourceTicketId, String(actionId)],
  );
}

function sourceFilesFor(action, messages) {
  const files = [...(Array.isArray(action.attachments) ? action.attachments : [])];
  const known = new Set(files.map((file) => String(file?.path ?? "").toUpperCase()));
  const links = [
    ...inlineSourceLinks(action.description),
    ...messages.flatMap((message) => inlineSourceLinks(message.body)),
  ];
  const images = htmlContentImages(action.htmlDescription);

  for (const source of [...links, ...images]) {
    if (known.has(source.hash)) continue;
    known.add(source.hash);
    files.push({
      path: source.hash,
      fileName: source.name || "movidesk-" + source.hash + ".bin",
    });
  }

  return { files, images, links };
}

async function replaceMessageLinks(db, sourceTicketId, ticketId, actionId,
  originalMessageId, messages, images, attachmentsByHash) {
  let rewrittenLinks = 0;
  let embeddedImages = 0;

  for (const message of messages) {
    const rewritten = rewriteStoredLinks(message.body, attachmentsByHash, ticketId);
    const existingImages = Array.isArray(message.external_metadata?.inlineImages)
      ? message.external_metadata.inlineImages
      : [];
    const inlineImages = [...existingImages];
    const seen = new Set(inlineImages.map((image) => image?.src));

    const links = inlineSourceLinks(message.body);
    const candidates = [
      ...links,
      ...(message.id === originalMessageId ? images : []),
    ];

    for (const candidate of candidates) {
      const attachment = attachmentsByHash.get(candidate.hash);
      if (!attachment || !isImageAttachment(attachment)) continue;
      const src = "/api/app/tickets/" + ticketId + "/attachments/" + attachment.id;
      if (seen.has(src)) continue;
      seen.add(src);
      inlineImages.push({
        src,
        alt: (candidate.name || "Imagem histórica Movidesk").slice(0, 160),
        external: false,
      });
      embeddedImages += 1;
    }

    if (!rewritten.replaced && inlineImages.length === existingImages.length) continue;
    const updated = await db.unsafe(
      "UPDATE ticket_messages SET body = $2, " +
      "external_metadata = jsonb_set(external_metadata, '{inlineImages}', $3::jsonb, true) " +
      "WHERE id = $1::uuid AND body = $4 " +
      "AND external_metadata->>'sourceTicketId' = $5 " +
      "AND external_metadata->>'sourceActionId' = $6 RETURNING id",
      [
        message.id, rewritten.body, JSON.stringify(inlineImages), message.body,
        sourceTicketId, String(actionId),
      ],
    );
    if (updated.length !== 1) throw new Error("HISTORICAL_MESSAGE_CHANGED_DURING_MEDIA_RECOVERY");
    rewrittenLinks += rewritten.replaced;
  }

  return { rewrittenLinks, embeddedImages };
}

function repeatedActionIds(actions) {
  const seen = new Set();
  const repeated = new Set();
  for (const action of actions) {
    const id = Number(action.id);
    if (seen.has(id)) repeated.add(id);
    seen.add(id);
  }
  return repeated;
}

async function recoverTicket(db, downloader, record, options, totals) {
  const ticketId = String(record.sourceId ?? "");
  if (ticketId !== String(record.ticket?.id ?? "")) {
    throw new Error("SNAPSHOT_ID_MISMATCH");
  }

  const allActions = Array.isArray(record.ticket?.actions)
    ? record.ticket.actions.filter((action) => action && action.isDeleted !== true)
    : [];
  const actions = actionsWithMedia(record.ticket);
  if (!actions.length) return;
  totals.tickets += 1;
  const duplicated = repeatedActionIds(allActions);

  for (const action of actions) {
    const actionId = Number(action.id);
    if (!Number.isSafeInteger(actionId) || actionId < 1) {
      totals.failed += 1;
      report({ state: "failed", ticketId, actionId: null, reason: "INVALID_ACTION_ID" });
      continue;
    }

    if (duplicated.has(actionId)) {
      totals.failed += 1;
      report({
        state: "failed",
        ticketId,
        actionId,
        reason: "DUPLICATED_SOURCE_ACTION_REQUIRES_REVIEW",
      });
      continue;
    }

    if (!options.apply) {
      const candidates = sourceFilesFor(action, []);
      totals.pending += candidates.files.length;
      totals.inlineLinks += candidates.links.length;
      report({
        state: "preview",
        ticketId,
        actionId,
        attachments: candidates.files.length,
        inlineLinks: candidates.links.length,
        htmlImages: candidates.images.length,
      });
      continue;
    }

    const message = await findMessage(db, ticketId, actionId);
    if (!message) {
      totals.missingActions += 1;
      report({ state: "missing_action", ticketId, actionId });
      continue;
    }
    const expectedVisibility = Number(action.type) === 2 ? "public" : "internal";
    if (message.source_system !== "movidesk" ||
        message.source_ticket_id !== ticketId ||
        message.source_action_id !== String(actionId) ||
        message.source_visibility !== expectedVisibility ||
        message.mapped_visibility !== expectedVisibility ||
        message.external_message_id !== "movidesk:" + ticketId + ":" + actionId) {
      totals.failed += 1;
      report({
        state: "failed",
        ticketId,
        actionId,
        reason: "IMPORTED_MESSAGE_METADATA_MISMATCH",
      });
      continue;
    }

    const messages = await historicalActionMessages(db, ticketId, message.ticket_id, actionId);
    const candidates = sourceFilesFor(action, messages);
    const attachmentsByHash = new Map();
    let complete = true;

    for (const [index, file] of candidates.files.entries()) {
      try {
        const attachment = await recoverAttachment(db, downloader, message, file, index);
        const hash = String(file?.path ?? "").toUpperCase();
        if (!attachmentsByHash.has(hash)) {
          attachmentsByHash.set(hash, attachment);
        }
        totals[attachment.state] += 1;
        report({ state: attachment.state, ticketId, actionId, name: fileNameOf(file) });
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
        if (cause instanceof Error && cause.message.startsWith("ASSET_STORAGE_PUT_")) {
          throw new Error("MINIO_STORAGE_INTERRUPTED");
        }
      }
    }

    try {
      const converted = await replaceMessageLinks(
        db, ticketId, message.ticket_id, actionId,
        message.message_id, messages, candidates.images, attachmentsByHash,
      );
      totals.rewrittenLinks += converted.rewrittenLinks;
      totals.embeddedImages += converted.embeddedImages;
      if (converted.rewrittenLinks || converted.embeddedImages) {
        report({ state: "links_updated", ticketId, actionId, ...converted });
      }
      if (complete) await markActionComplete(db, message.message_id, ticketId, actionId);
    } catch (cause) {
      totals.failed += 1;
      report({
        state: "failed",
        ticketId,
        actionId,
        reason: cause instanceof Error ? cause.message : "UNKNOWN_ERROR",
      });
    }
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const totals = {
    tickets: 0,
    pending: 0,
    stored: 0,
    existing: 0,
    failed: 0,
    missingActions: 0,
    inlineLinks: 0,
    rewrittenLinks: 0,
    embeddedImages: 0,
  };
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
  let position = 0;

  try {
    for await (const record of snapshotRecords(options.directory + "/tickets.jsonl")) {
      const snapshotIndex = position;
      position += 1;
      if (options.ticket === null && snapshotIndex < options.offset) continue;
      if (options.ticket !== null && String(record.sourceId) !== options.ticket) continue;
      matched = true;
      await recoverTicket(db, downloader, record, options, totals);
      processed += 1;
      if (options.ticket !== null || (options.limit !== null && processed >= options.limit)) break;
      if (processed % 100 === 0) {
        report({ state: "progress", processed, nextOffset: position, ...totals });
      }
    }
    if (!matched) throw new Error("SOURCE_TICKET_NOT_FOUND");
    report({
      state: options.apply ? "completed" : "validated",
      offset: options.offset,
      processed,
      nextOffset: position,
      ...totals,
    });
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
