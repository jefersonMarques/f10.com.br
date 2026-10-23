import { createHash } from "node:crypto";
import { env } from "$env/dynamic/private";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketMessageAttachments } from "$lib/server/db/supportChatEntrySchema";
import { putAssetObject } from "$lib/server/storage/assetStorage";

const MAX_FILES = 20;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;

const MIME_EXTENSIONS = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.ms-excel", "xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.ms-powerpoint", "ppt"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
  ["application/zip", "zip"],
  ["text/plain", "txt"],
  ["text/csv", "csv"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

type InboundAttachment = {
  Name?: unknown;
  ContentType?: unknown;
  ContentLength?: unknown;
  ContentID?: unknown;
  DownloadToken?: unknown;
};

type StoredInboundAttachment = {
  id: string;
  contentId: string | null;
  originalName: string;
  mimeType: string;
};

function nameOf(value: unknown): string {
  const valueAsString = typeof value === "string" ? value : "";
  return valueAsString.replace(/[\\/\u0000-\u001f\u007f]/g, "-").replace(/\s+/g, " ").trim().slice(0, 180) || "anexo";
}

function contentIdOf(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim().replace(/^<|>$/g, "").toLowerCase();
  return id && id.length <= 255 ? id : null;
}

function fileLooksCorrect(mime: string, data: Uint8Array): boolean {
  const isZip = data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b
    && ((data[2] === 3 && data[3] === 4) || (data[2] === 5 && data[3] === 6));
  if (mime.includes("openxmlformats") || mime === "application/zip") return isZip;
  if (mime === "application/pdf") return data[0] === 37 && data[1] === 80 && data[2] === 68 && data[3] === 70;
  if (mime === "image/png") return data[0] === 137 && data[1] === 80 && data[2] === 78 && data[3] === 71;
  if (mime === "image/jpeg") return data[0] === 255 && data[1] === 216 && data[2] === 255;
  if (mime === "image/gif") return Buffer.from(data.subarray(0, 3)).toString("ascii") === "GIF";
  if (mime === "image/webp") return Buffer.from(data.subarray(0, 4)).toString("ascii") === "RIFF"
    && Buffer.from(data.subarray(8, 12)).toString("ascii") === "WEBP";
  return true;
}

export async function persistInboundAttachments(input: {
  ticketId: string;
  messageId: string;
  attachments: unknown[];
}): Promise<StoredInboundAttachment[]> {
  if (input.attachments.length === 0) return [];
  if (input.attachments.length > MAX_FILES) throw new Error("BREVO_INBOUND_TOO_MANY_ATTACHMENTS");

  const apiKey = env.BREVO_API_KEY?.trim();
  if (!apiKey) throw new Error("BREVO_INBOUND_API_KEY_MISSING");
  const db = getDatabase();
  const persisted: StoredInboundAttachment[] = [];
  let accumulated = 0;

  for (const raw of input.attachments) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const attachment = raw as InboundAttachment;
    const token = typeof attachment.DownloadToken === "string" ? attachment.DownloadToken.trim() : "";
    const mime = typeof attachment.ContentType === "string" ? attachment.ContentType.split(";")[0].trim().toLowerCase() : "";
    const length = Number(attachment.ContentLength ?? 0);
    if (!token || token.length > 2048) throw new Error("BREVO_INBOUND_ATTACHMENT_TOKEN_INVALID");
    if (!MIME_EXTENSIONS.has(mime)) throw new Error("BREVO_INBOUND_ATTACHMENT_TYPE_UNSUPPORTED");
    if (!Number.isFinite(length) || length < 0 || length > MAX_FILE_BYTES) {
      throw new Error("BREVO_INBOUND_ATTACHMENT_TOO_LARGE");
    }
    accumulated += length;
    if (accumulated > MAX_TOTAL_BYTES) throw new Error("BREVO_INBOUND_TOTAL_ATTACHMENTS_TOO_LARGE");

    const digest = createHash("sha256").update(token).digest("hex");
    const key = `support/tickets/${input.ticketId}/${input.messageId}/brevo-${digest}.${MIME_EXTENSIONS.get(mime)}`;
    const contentId = contentIdOf(attachment.ContentID);
    const originalName = nameOf(attachment.Name);

    const [existing] = await db
      .select({ id: ticketMessageAttachments.id })
      .from(ticketMessageAttachments)
      .where(and(eq(ticketMessageAttachments.messageId, input.messageId), eq(ticketMessageAttachments.storageKey, key)))
      .limit(1);
    if (existing) {
      persisted.push({ id: existing.id, contentId, originalName, mimeType: mime });
      continue;
    }

    const response = await fetch(
      `https://api.brevo.com/v3/inbound/attachments/${encodeURIComponent(token)}`,
      { headers: { "api-key": apiKey }, signal: AbortSignal.timeout(30_000), redirect: "error", cache: "no-store" },
    );
    if (!response.ok) throw new Error(`BREVO_INBOUND_ATTACHMENT_HTTP_${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    accumulated += Math.max(0, bytes.length - length);
    if (accumulated > MAX_TOTAL_BYTES) throw new Error("BREVO_INBOUND_TOTAL_ATTACHMENTS_TOO_LARGE");
    if (bytes.length === 0 || bytes.length > MAX_FILE_BYTES || (length > 0 && bytes.length > length * 2)
      || !fileLooksCorrect(mime, bytes)) {
      throw new Error("BREVO_INBOUND_ATTACHMENT_CONTENT_INVALID");
    }
    const stored = await putAssetObject(key, bytes, mime);
    const [created] = await db
      .insert(ticketMessageAttachments)
      .values({
        ticketId: input.ticketId,
        messageId: input.messageId,
        storageKey: stored.key,
        originalName,
        mimeType: mime,
        sizeBytes: stored.size,
        checksumSha256: stored.checksumSha256,
      })
      .onConflictDoNothing({ target: ticketMessageAttachments.storageKey })
      .returning({ id: ticketMessageAttachments.id });
    const id = created?.id ?? (await db
      .select({ id: ticketMessageAttachments.id })
      .from(ticketMessageAttachments)
      .where(eq(ticketMessageAttachments.storageKey, key))
      .limit(1))[0]?.id;
    if (!id) throw new Error("BREVO_INBOUND_ATTACHMENT_NOT_RECORDED");
    persisted.push({ id, contentId, originalName, mimeType: mime });
  }

  return persisted;
}

export function extractEmailImages(html: string): Array<{ src: string; alt: string }> {
  const images: Array<{ src: string; alt: string }> = [];
  const seen = new Set<string>();
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const attr = (key: string) => {
      const expression = new RegExp(`\\b${key}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
      const parts = tag.match(expression);
      return (parts?.[1] ?? parts?.[2] ?? parts?.[3] ?? "").replace(/&amp;/gi, "&").trim();
    };
    const src = attr("src");
    if (!src || src.length > 2048 || seen.has(src)) continue;

    const width = attr("width");
    const height = attr("height");
    const style = attr("style");
    const isTrackingPixel =
      (width !== "" && /^\d+$/.test(width) && Number(width) <= 2) ||
      (height !== "" && /^\d+$/.test(height) && Number(height) <= 2) ||
      /(?:display\s*:\s*none|visibility\s*:\s*hidden)/i.test(style);
    if (isTrackingPixel) continue;
    const cid = /^cid:(.+)$/i.exec(src)?.[1]?.replace(/^<|>$/g, "").toLowerCase();
    if (cid) {
      images.push({ src: `cid:${cid}`, alt: attr("alt").slice(0, 160) });
    } else {
      try {
        const url = new URL(src);
        if (url.protocol !== "https:" || url.username || url.password) continue;
        images.push({ src: url.toString(), alt: attr("alt").slice(0, 160) });
      } catch {
        // Unsupported embedded format is ignored, never injected into HTML.
      }
    }
    if (images.length > 0 && images[images.length - 1]?.src === src) {
      seen.add(src);
    } else if (images.some((image) => image.src === src)) {
      seen.add(src);
    }
    if (images.length >= 12) break;
  }
  return images;
}

export function resolveEmailImages(
  images: Array<{ src: string; alt: string }>,
  stored: StoredInboundAttachment[],
  ticketId: string,
): Array<{ src: string; alt: string; external: boolean }> {
  return images.flatMap((item): Array<{ src: string; alt: string; external: boolean }> => {
    if (item.src.startsWith("cid:")) {
      const id = item.src.slice(4);
      const attachment = stored.find((candidate) => candidate.contentId === id && candidate.mimeType.startsWith("image/"));
      return attachment
        ? [{ src: `/api/app/tickets/${ticketId}/attachments/${attachment.id}`, alt: item.alt, external: false }]
        : [];
    }
    return [{ ...item, external: true }];
  });
}
