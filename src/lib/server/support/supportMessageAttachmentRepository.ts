import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketMessageAttachments } from "$lib/server/db/supportChatEntrySchema";
import { deleteAssetObject, getAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";

export const SUPPORT_IMAGE_MAX_FILES = 4;
export const SUPPORT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

export type StoredSupportImage = {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
};

function safeFileName(value: string): string {
  const cleaned = value
    .replace(/[\\/\u0000-\u001f\u007f]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return cleaned || "imagem";
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

export async function uploadSupportMessageImages(
  ticketId: string,
  messageId: string,
  files: File[],
): Promise<StoredSupportImage[]> {
  if (files.length === 0) return [];
  if (files.length > SUPPORT_IMAGE_MAX_FILES) throw new Error("SUPPORT_IMAGE_TOO_MANY");

  const stored: StoredSupportImage[] = [];
  try {
    for (const file of files) {
      if (file.size < 1 || file.size > SUPPORT_IMAGE_MAX_BYTES) {
        throw new Error("SUPPORT_IMAGE_SIZE_INVALID");
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      const detectedType = detectedImageType(bytes);
      if (!detectedType || !ALLOWED_IMAGE_TYPES.has(detectedType)) {
        throw new Error("SUPPORT_IMAGE_TYPE_INVALID");
      }
      if (file.type && file.type !== detectedType) {
        throw new Error("SUPPORT_IMAGE_TYPE_INVALID");
      }

      const extension = ALLOWED_IMAGE_TYPES.get(detectedType)!;
      const storageKey = `support/tickets/${ticketId}/${messageId}/${randomUUID()}.${extension}`;
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

export async function deleteStoredSupportImages(images: StoredSupportImage[]): Promise<void> {
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
    })
    .from(ticketMessageAttachments)
    .where(inArray(ticketMessageAttachments.messageId, messageIds))
    .orderBy(asc(ticketMessageAttachments.createdAt));
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

export async function readSupportMessageAttachment(storageKey: string): Promise<Response> {
  return getAssetObject(storageKey);
}
