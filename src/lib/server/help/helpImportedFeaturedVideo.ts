import { createHash, randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpAssets,
  helpContentFeaturedVideos,
  helpContents,
} from "$lib/server/db/structuredHelpSchema";
import { deleteAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";

const MAX_VIDEO_BYTES = 90 * 1024 * 1024;

function isMp4(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 12 && new TextDecoder().decode(bytes.slice(4, 8)) === "ftyp";
}

function safeFileName(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return normalized.endsWith(".mp4") ? normalized : `${normalized || "video"}.mp4`;
}

export async function attachImportedMp4AsFeaturedVideo(input: {
  actorUserId: string;
  contentId: string;
  bytes: Uint8Array;
  fileName: string;
  subtitles: string;
  altText: string;
  assistantSummary: string;
}): Promise<void> {
  if (input.bytes.byteLength < 1 || input.bytes.byteLength > MAX_VIDEO_BYTES || !isMp4(input.bytes)) {
    throw new Error("HELP_VIDEO_UPLOAD_FORMAT_INVALID");
  }

  const db = getDatabase();
  const [content] = await db
    .select({ id: helpContents.id, status: helpContents.status })
    .from(helpContents)
    .where(eq(helpContents.id, input.contentId))
    .limit(1);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

  const storageKey = `help/import/${input.contentId}/${randomUUID()}-${safeFileName(input.fileName)}`;
  const stored = await putAssetObject(storageKey, input.bytes, "video/mp4");
  const checksumSha256 = createHash("sha256").update(input.bytes).digest("hex");

  try {
    const [asset] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(helpAssets)
        .values({
          contentId: input.contentId,
          assetType: "video",
          storageKey: stored.key,
          originalName: safeFileName(input.fileName),
          mimeType: "video/mp4",
          sizeBytes: stored.size,
          checksumSha256,
          altText: input.altText.trim().slice(0, 500),
          subtitles: input.subtitles.trim().slice(0, 200_000),
          assistantSummary: input.assistantSummary.trim().slice(0, 20_000),
          metadata: { managed: true, importedVideo: true },
          createdBy: input.actorUserId,
        })
        .returning({ id: helpAssets.id });
      if (!created) throw new Error("IMPORT_VIDEO_NOT_CREATED");

      await tx
        .insert(helpContentFeaturedVideos)
        .values({ contentId: input.contentId, assetId: created.id })
        .onConflictDoUpdate({
          target: helpContentFeaturedVideos.contentId,
          set: { assetId: created.id, updatedAt: new Date() },
        });

      await tx
        .update(helpContents)
        .set({ status: "draft", updatedBy: input.actorUserId, updatedAt: new Date() })
        .where(eq(helpContents.id, input.contentId));

      return [created];
    });

    await recordAuditEvent({
      actorUserId: input.actorUserId,
      action: "help.content.featured_video.imported",
      entityType: "help_content",
      entityId: input.contentId,
      metadata: { assetId: asset?.id ?? null, sizeBytes: stored.size, checksumSha256 },
    });
  } catch (cause) {
    await deleteAssetObject(stored.key).catch(() => undefined);
    throw cause;
  }
}
