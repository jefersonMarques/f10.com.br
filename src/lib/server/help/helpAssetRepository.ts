import { createHash } from "node:crypto";
import { and, count, desc, eq, isNotNull, sql } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import { helpTrainingStepMedia, helpTrainingVersions } from "$lib/server/db/helpTrainingSchema";
import { helpAssets, helpStepBlocks } from "$lib/server/db/structuredHelpSchema";
import {
  deleteAssetObject,
  getAssetObject,
  putAssetObject,
} from "$lib/server/storage/assetStorage";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_CHARS = 200_000;

const ALLOWED_MIME_TYPES = new Map<
  string,
  { type: "image" | "video" | "file"; extension: string; maxBytes: number }
>([
  ["image/png", { type: "image", extension: "png", maxBytes: MAX_IMAGE_BYTES }],
  ["image/jpeg", { type: "image", extension: "jpg", maxBytes: MAX_IMAGE_BYTES }],
  ["image/webp", { type: "image", extension: "webp", maxBytes: MAX_IMAGE_BYTES }],
  ["image/gif", { type: "image", extension: "gif", maxBytes: MAX_IMAGE_BYTES }],
  ["video/mp4", { type: "video", extension: "mp4", maxBytes: MAX_VIDEO_BYTES }],
  ["application/pdf", { type: "file", extension: "pdf", maxBytes: MAX_DOCUMENT_BYTES }],
  [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    { type: "file", extension: "docx", maxBytes: MAX_DOCUMENT_BYTES },
  ],
  [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    { type: "file", extension: "xlsx", maxBytes: MAX_DOCUMENT_BYTES },
  ],
  ["application/vnd.ms-excel", { type: "file", extension: "xls", maxBytes: MAX_DOCUMENT_BYTES }],
  ["text/csv", { type: "file", extension: "csv", maxBytes: MAX_DOCUMENT_BYTES }],
  ["text/plain", { type: "file", extension: "txt", maxBytes: MAX_DOCUMENT_BYTES }],
]);

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function validateMagicBytes(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === "image/png") return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (mimeType === "image/jpeg") return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
  if (mimeType === "image/gif") {
    const signature = new TextDecoder().decode(bytes.slice(0, 6));
    return signature === "GIF87a" || signature === "GIF89a";
  }
  if (mimeType === "image/webp") {
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    );
  }
  if (mimeType === "video/mp4") {
    return bytes.byteLength >= 12 && new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
  }
  if (mimeType === "application/pdf") {
    return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  }
  if (mimeType.includes("openxmlformats")) return hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04]);
  return true;
}

function normalizeMimeType(value: string): string {
  return value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function checksum(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function extractPlainText(mimeType: string, bytes: Uint8Array): string {
  if (mimeType !== "text/plain" && mimeType !== "text/csv") return "";
  return new TextDecoder("utf-8", { fatal: false })
    .decode(bytes)
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_CHARS);
}

function snapshotReferencesAsset(snapshot: Record<string, unknown>, assetId: string): boolean {
  const publicSnapshot = snapshot.public;
  if (!publicSnapshot || typeof publicSnapshot !== "object" || Array.isArray(publicSnapshot)) return false;
  const steps = (publicSnapshot as Record<string, unknown>).steps;
  if (!Array.isArray(steps)) return false;

  for (const stepValue of steps) {
    if (!stepValue || typeof stepValue !== "object" || Array.isArray(stepValue)) continue;
    const blocks = (stepValue as Record<string, unknown>).blocks;
    if (!Array.isArray(blocks)) continue;
    for (const blockValue of blocks) {
      if (!blockValue || typeof blockValue !== "object" || Array.isArray(blockValue)) continue;
      const assetValue = (blockValue as Record<string, unknown>).asset;
      if (!assetValue || typeof assetValue !== "object" || Array.isArray(assetValue)) continue;
      if ((assetValue as Record<string, unknown>).id === assetId) return true;
    }
  }
  return false;
}

function trainingSnapshotReferencesAsset(snapshot: unknown, assetId: string): boolean {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return false;
  const steps = (snapshot as Record<string, unknown>).steps;
  if (!Array.isArray(steps)) return false;
  const videoRef = `asset:${assetId}`;

  for (const stepValue of steps) {
    if (!stepValue || typeof stepValue !== "object" || Array.isArray(stepValue)) continue;
    const step = stepValue as Record<string, unknown>;
    if (step.videoUrl === videoRef || step.captionAssetId === assetId) return true;
    if (!Array.isArray(step.images)) continue;
    for (const imageValue of step.images) {
      if (!imageValue || typeof imageValue !== "object" || Array.isArray(imageValue)) continue;
      if ((imageValue as Record<string, unknown>).assetId === assetId) return true;
    }
  }
  return false;
}

export type CreateManagedHelpAssetInput = {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  altText?: string;
  assistantDescription?: string;
  assistantSummary?: string;
  extractedText?: string;
  contentId?: string | null;
};

export async function createManagedHelpAsset(
  actorUserId: string,
  input: CreateManagedHelpAssetInput,
) {
  const mimeType = normalizeMimeType(input.mimeType);
  const rule = ALLOWED_MIME_TYPES.get(mimeType);
  if (!rule) throw new Error("ASSET_MIME_NOT_ALLOWED");
  if (input.bytes.byteLength < 1 || input.bytes.byteLength > rule.maxBytes) {
    throw new Error("ASSET_SIZE_NOT_ALLOWED");
  }
  if (!validateMagicBytes(mimeType, input.bytes)) throw new Error("ASSET_CONTENT_MISMATCH");

  const digest = checksum(input.bytes);
  const extractedText = (
    input.extractedText?.trim() || extractPlainText(mimeType, input.bytes)
  ).slice(0, MAX_EXTRACTED_TEXT_CHARS);
  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(helpAssets)
    .where(and(eq(helpAssets.checksumSha256, digest), isNotNull(helpAssets.storageKey)))
    .limit(1);

  if (existing) {
    if (!existing.extractedText && extractedText) {
      const [updated] = await db
        .update(helpAssets)
        .set({ extractedText, updatedAt: new Date() })
        .where(eq(helpAssets.id, existing.id))
        .returning();
      return { asset: updated ?? existing, reused: true };
    }
    return { asset: existing, reused: true };
  }

  const storageKey = `help-assets/${digest.slice(0, 2)}/${digest.slice(2, 4)}/${digest}.${rule.extension}`;
  await putAssetObject(storageKey, input.bytes, mimeType);

  try {
    const [asset] = await db
      .insert(helpAssets)
      .values({
        contentId: input.contentId ?? null,
        assetType: rule.type,
        storageKey,
        originalName: input.fileName.trim().slice(0, 240) || `arquivo.${rule.extension}`,
        mimeType,
        sizeBytes: input.bytes.byteLength,
        checksumSha256: digest,
        altText: input.altText?.trim().slice(0, 500) ?? "",
        assistantDescription: input.assistantDescription?.trim().slice(0, 20_000) ?? "",
        assistantSummary: input.assistantSummary?.trim().slice(0, 20_000) ?? "",
        extractedText,
        metadata: { managed: true },
        createdBy: actorUserId,
      })
      .returning();

    if (!asset) throw new Error("ASSET_NOT_CREATED");
    await recordAuditEvent({
      actorUserId,
      action: "help.asset.uploaded",
      entityType: "help_asset",
      entityId: asset.id,
      metadata: { mimeType, sizeBytes: input.bytes.byteLength, checksumSha256: digest },
    });
    return { asset, reused: false };
  } catch (cause) {
    await deleteAssetObject(storageKey).catch(() => undefined);
    throw cause;
  }
}

export async function listManagedHelpAssets(limit = 200) {
  return getDatabase()
    .select({
      id: helpAssets.id,
      assetType: helpAssets.assetType,
      originalName: helpAssets.originalName,
      mimeType: helpAssets.mimeType,
      sizeBytes: helpAssets.sizeBytes,
      altText: helpAssets.altText,
      assistantDescription: helpAssets.assistantDescription,
      assistantSummary: helpAssets.assistantSummary,
      extractedText: helpAssets.extractedText,
      storageKey: helpAssets.storageKey,
      sourceUrl: helpAssets.sourceUrl,
      createdAt: helpAssets.createdAt,
    })
    .from(helpAssets)
    .orderBy(desc(helpAssets.createdAt))
    .limit(Math.min(Math.max(limit, 1), 500));
}

export async function getHelpAsset(assetId: string) {
  const [asset] = await getDatabase()
    .select()
    .from(helpAssets)
    .where(eq(helpAssets.id, assetId))
    .limit(1);
  return asset ?? null;
}

export async function getHelpAssetUsageCount(assetId: string): Promise<number> {
  const db = getDatabase();
  const [contentRows, trainingRows] = await Promise.all([
    db.select({ value: count() }).from(helpStepBlocks).where(eq(helpStepBlocks.assetId, assetId)),
    db
      .select({ value: count() })
      .from(helpTrainingStepMedia)
      .where(eq(helpTrainingStepMedia.assetId, assetId)),
  ]);
  return Number(contentRows[0]?.value ?? 0) + Number(trainingRows[0]?.value ?? 0);
}

export async function isHelpAssetPublished(assetId: string): Promise<boolean> {
  const db = getDatabase();
  const [publications, trainingVersions] = await Promise.all([
    db
      .select({ snapshot: helpPublications.snapshot })
      .from(helpPublications)
      .where(eq(helpPublications.entityType, "content")),
    db.select({ snapshot: helpTrainingVersions.snapshot }).from(helpTrainingVersions),
  ]);
  return (
    publications.some((publication) => snapshotReferencesAsset(publication.snapshot, assetId)) ||
    trainingVersions.some((version) => trainingSnapshotReferencesAsset(version.snapshot, assetId))
  );
}

export async function deleteManagedHelpAsset(
  actorUserId: string,
  assetId: string,
): Promise<void> {
  const db = getDatabase();
  const asset = await getHelpAsset(assetId);
  if (!asset) throw new Error("ASSET_NOT_FOUND");
  const [usageCount, published] = await Promise.all([
    getHelpAssetUsageCount(assetId),
    isHelpAssetPublished(assetId),
  ]);
  if (usageCount > 0 || published) throw new Error("ASSET_IN_USE");

  if (asset.storageKey) await deleteAssetObject(asset.storageKey);
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('f10.allow_managed_asset_delete', 'on', true)`);
    await tx.delete(helpAssets).where(eq(helpAssets.id, assetId));
  });
  await recordAuditEvent({
    actorUserId,
    action: "help.asset.deleted",
    entityType: "help_asset",
    entityId: assetId,
    metadata: { storageKey: asset.storageKey },
  });
}

export async function readManagedHelpAsset(
  assetId: string,
): Promise<{
  asset: NonNullable<Awaited<ReturnType<typeof getHelpAsset>>>;
  response: Response;
}> {
  const asset = await getHelpAsset(assetId);
  if (!asset || !asset.storageKey) throw new Error("ASSET_NOT_FOUND");
  const response = await getAssetObject(asset.storageKey);
  return { asset, response };
}
