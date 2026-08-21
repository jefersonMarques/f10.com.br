import { createHash, randomUUID } from "node:crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpAssets } from "$lib/server/db/structuredHelpSchema";
import { deleteAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";

const MAX_CAPTION_BYTES = 1024 * 1024;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function validateTrainingCaptions(bytes: Uint8Array): string {
  if (bytes.byteLength < 7 || bytes.byteLength > MAX_CAPTION_BYTES) {
    throw new Error("TRAINING_CAPTION_SIZE_INVALID");
  }
  let value: string;
  try {
    value = new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    throw new Error("TRAINING_CAPTION_INVALID");
  }
  if (!value.startsWith("WEBVTT") || value.includes("\0")) throw new Error("TRAINING_CAPTION_INVALID");
  return value;
}

export async function createTrainingCaptionAsset(
  actorUserId: string,
  fileName: string,
  bytes: Uint8Array,
): Promise<{ assetId: string; reused: boolean }> {
  validateTrainingCaptions(bytes);
  const db = getDatabase();
  const checksum = sha256(bytes);
  const [existing] = await db
    .select({ id: helpAssets.id })
    .from(helpAssets)
    .where(
      and(
        eq(helpAssets.checksumSha256, checksum),
        eq(helpAssets.mimeType, "text/vtt"),
        isNotNull(helpAssets.storageKey),
      ),
    )
    .limit(1);
  if (existing) return { assetId: existing.id, reused: true };

  const assetId = randomUUID();
  const storageKey = `help-assets/${assetId}.vtt`;
  await putAssetObject(storageKey, bytes, "text/vtt; charset=utf-8");
  try {
    await db.insert(helpAssets).values({
      id: assetId,
      contentId: null,
      assetType: "file",
      sourceUrl: null,
      storageKey,
      originalName: fileName.trim().slice(0, 240) || "legendas.vtt",
      mimeType: "text/vtt",
      sizeBytes: bytes.byteLength,
      checksumSha256: checksum,
      altText: "",
      createdBy: actorUserId,
    });
    return { assetId, reused: false };
  } catch (cause) {
    await deleteAssetObject(storageKey).catch(() => undefined);
    throw cause;
  }
}
