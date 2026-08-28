import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatMessageAttachments } from "$lib/server/db/chatSchema";
import { ticketMessageAttachments } from "$lib/server/db/supportChatEntrySchema";
import { deleteAssetObject, getAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";

export const SUPPORT_IMAGE_MAX_FILES = 4;
export const SUPPORT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const SUPPORT_ATTACHMENT_MAX_FILES = 4;
export const SUPPORT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

const ALLOWED_PORTAL_TYPES = new Map([
  ...ALLOWED_IMAGE_TYPES,
  ["application/pdf", "pdf"],
]);

export type StoredSupportAttachment = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
};

export type StoredSupportImage = StoredSupportAttachment;

function safeFileName(value: string): string {
  const cleaned = value
    .replace(/[\\/\u0000-\u001f\u007f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return cleaned || "arquivo";
}

function detectedImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | null {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function detectedPortalType(bytes: Uint8Array): string | null {
  const imageType = detectedImageType(bytes);
  if (imageType) return imageType;
  if (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }
  return null;
}

async function storeAttachments(
  storageScope: string,
  messageId: string,
  files: File[],
  options: {
    maxFiles: number;
    maxBytes: number;
    allowedTypes: Map<string, string>;
    detectType: (bytes: Uint8Array) => string | null;
    errorPrefix: "SUPPORT_IMAGE" | "SUPPORT_ATTACHMENT";
  },
): Promise<StoredSupportAttachment[]> {
  if (files.length === 0) return [];
  if (files.length > options.maxFiles) throw new Error(`${options.errorPrefix}_TOO_MANY`);

  const stored: StoredSupportAttachment[] = [];
  try {
    for (const file of files) {
      if (file.size < 1 || file.size > options.maxBytes) {
        throw new Error(`${options.errorPrefix}_SIZE_INVALID`);
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const detectedType = options.detectType(bytes);
      if (!detectedType || !options.allowedTypes.has(detectedType)) {
        throw new Error(`${options.errorPrefix}_TYPE_INVALID`);
      }
      if (file.type && file.type !== detectedType) {
        throw new Error(`${options.errorPrefix}_TYPE_INVALID`);
      }

      const extension = options.allowedTypes.get(detectedType)!;
      const storageKey = `support/${storageScope}/${messageId}/${randomUUID()}.${extension}`;
      const asset = await putAssetObject(storageKey, bytes, detectedType);
      stored.push({
        storageKey: asset.key,
        originalName: safeFileName(file.name),
        mimeType: detectedType,
        sizeBytes: asset.size,
        checksumSha256: asset.checksumSha256,
      });
    }
    return stored;
  } catch (cause) {
    await deleteStoredSupportImages(stored);
    throw cause;
  }
}

export async function uploadSupportMessageImages(
  ticketId: string,
  messageId: string,
  files: File[],
): Promise<StoredSupportImage[]> {
  return storeAttachments(`tickets/${ticketId}`, messageId, files, {
    maxFiles: SUPPORT_IMAGE_MAX_FILES,
    maxBytes: SUPPORT_IMAGE_MAX_BYTES,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    detectType: detectedImageType,
    errorPrefix: "SUPPORT_IMAGE",
  });
}

export async function uploadSupportChatMessageImages(
  sessionId: string,
  messageId: string,
  files: File[],
): Promise<StoredSupportImage[]> {
  return storeAttachments(`chats/${sessionId}`, messageId, files, {
    maxFiles: SUPPORT_IMAGE_MAX_FILES,
    maxBytes: SUPPORT_IMAGE_MAX_BYTES,
    allowedTypes: ALLOWED_IMAGE_TYPES,
    detectType: detectedImageType,
    errorPrefix: "SUPPORT_IMAGE",
  });
}

export async function uploadSupportMessageAttachments(
  ticketId: string,
  messageId: string,
  files: File[],
): Promise<StoredSupportAttachment[]> {
  return storeAttachments(`tickets/${ticketId}`, messageId, files, {
    maxFiles: SUPPORT_ATTACHMENT_MAX_FILES,
    maxBytes: SUPPORT_ATTACHMENT_MAX_BYTES,
    allowedTypes: ALLOWED_PORTAL_TYPES,
    detectType: detectedPortalType,
    errorPrefix: "SUPPORT_ATTACHMENT",
  });
}

export async function deleteStoredSupportImages(images: StoredSupportAttachment[]): Promise<void> {
  await Promise.all(images.map((image) => deleteAssetObject(image.storageKey).catch(() => undefined)));
}

export async function listSupportMessageAttachments(messageIds: string[]) {
  if (messageIds.length === 0) return [];
  return getDatabase()
    .select({
      id: ticketMessageAttachments.id,
      messageId: ticketMessageAttachments.messageId,
      ticketId: ticketMessageAttachments.ticketId,
      originalName: ticketMessageAttachments.originalName,
      mimeType: ticketMessageAttachments.mimeType,
      sizeBytes: ticketMessageAttachments.sizeBytes,
      createdAt: ticketMessageAttachments.createdAt,
    })
    .from(ticketMessageAttachments)
    .where(inArray(ticketMessageAttachments.messageId, messageIds))
    .orderBy(asc(ticketMessageAttachments.createdAt));
}

export async function listSupportChatMessageAttachments(messageIds: string[]) {
  if (messageIds.length === 0) return [];
  return getDatabase()
    .select({
      id: webChatMessageAttachments.id,
      messageId: webChatMessageAttachments.messageId,
      sessionId: webChatMessageAttachments.sessionId,
      originalName: webChatMessageAttachments.originalName,
      mimeType: webChatMessageAttachments.mimeType,
      sizeBytes: webChatMessageAttachments.sizeBytes,
      createdAt: webChatMessageAttachments.createdAt,
    })
    .from(webChatMessageAttachments)
    .where(inArray(webChatMessageAttachments.messageId, messageIds))
    .orderBy(asc(webChatMessageAttachments.createdAt));
}

export async function getSupportMessageAttachment(
  attachmentId: string,
  ticketId?: string,
) {
  const [attachment] = await getDatabase()
    .select({
      id: ticketMessageAttachments.id,
      messageId: ticketMessageAttachments.messageId,
      ticketId: ticketMessageAttachments.ticketId,
      storageKey: ticketMessageAttachments.storageKey,
      originalName: ticketMessageAttachments.originalName,
      mimeType: ticketMessageAttachments.mimeType,
      sizeBytes: ticketMessageAttachments.sizeBytes,
    })
    .from(ticketMessageAttachments)
    .where(
      ticketId
        ? and(
            eq(ticketMessageAttachments.id, attachmentId),
            eq(ticketMessageAttachments.ticketId, ticketId),
          )
        : eq(ticketMessageAttachments.id, attachmentId),
    )
    .limit(1);
  return attachment ?? null;
}

export async function getSupportChatMessageAttachment(
  attachmentId: string,
  sessionId: string,
) {
  const [attachment] = await getDatabase()
    .select({
      id: webChatMessageAttachments.id,
      messageId: webChatMessageAttachments.messageId,
      sessionId: webChatMessageAttachments.sessionId,
      storageKey: webChatMessageAttachments.storageKey,
      originalName: webChatMessageAttachments.originalName,
      mimeType: webChatMessageAttachments.mimeType,
      sizeBytes: webChatMessageAttachments.sizeBytes,
    })
    .from(webChatMessageAttachments)
    .where(
      and(
        eq(webChatMessageAttachments.id, attachmentId),
        eq(webChatMessageAttachments.sessionId, sessionId),
      ),
    )
    .limit(1);
  return attachment ?? null;
}

export async function readSupportMessageAttachment(storageKey: string): Promise<Response> {
  return getAssetObject(storageKey);
}
