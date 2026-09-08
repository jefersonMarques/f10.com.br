import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import type { HelpTrainingSourceAsset } from "$lib/server/db/helpTrainingSchema";
import { helpAssets } from "$lib/server/db/structuredHelpSchema";
import { deleteAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";
import { downloadHelpYoutubeMp4ForStorage } from "$lib/server/help/helpVideoImportAutomation";

type TrainingVideoSource = {
  contentId: string;
  video: HelpTrainingSourceAsset | null;
};

const mirrorPromises = new Map<string, Promise<string | null>>();

function youtubeVideoId(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
    }
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(hostname)) return null;
    let id = url.searchParams.get("v") ?? "";
    if (!id && (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/"))) {
      id = url.pathname.split("/")[2] ?? "";
    }
    return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function mirrorMatches(
  metadata: Record<string, unknown>,
  sourceAssetId: string,
  sourceUrl: string,
): boolean {
  return metadata.trainingYoutubeMirror === true
    && metadata.sourceAssetId === sourceAssetId
    && metadata.sourceUrl === sourceUrl;
}

async function findExistingMirror(input: TrainingVideoSource): Promise<string | null> {
  const video = input.video;
  if (!video?.sourceUrl) return null;

  const rows = await getDatabase()
    .select({
      id: helpAssets.id,
      storageKey: helpAssets.storageKey,
      metadata: helpAssets.metadata,
    })
    .from(helpAssets)
    .where(
      and(
        eq(helpAssets.contentId, input.contentId),
        eq(helpAssets.assetType, "video"),
      ),
    );

  return rows.find((row) =>
    Boolean(row.storageKey)
    && mirrorMatches(row.metadata ?? {}, video.id, video.sourceUrl!)
  )?.id ?? null;
}

async function createMirror(
  actorUserId: string,
  input: TrainingVideoSource,
): Promise<string | null> {
  const video = input.video;
  if (!video) return null;
  if (video.storageKey) return video.id;
  if (!video.sourceUrl || !youtubeVideoId(video.sourceUrl)) return null;

  const existing = await findExistingMirror(input);
  if (existing) return existing;

  const downloaded = await downloadHelpYoutubeMp4ForStorage(video.sourceUrl);
  const storageKey = [
    "help",
    "training-source",
    input.contentId,
    `${randomUUID()}-${downloaded.fileName}`,
  ].join("/");
  const stored = await putAssetObject(storageKey, downloaded.bytes, "video/mp4");

  try {
    const duplicate = await findExistingMirror(input);
    if (duplicate) {
      await deleteAssetObject(stored.key).catch(() => undefined);
      return duplicate;
    }

    const checksumSha256 = createHash("sha256").update(downloaded.bytes).digest("hex");
    const [created] = await getDatabase()
      .insert(helpAssets)
      .values({
        contentId: input.contentId,
        assetType: "video",
        storageKey: stored.key,
        originalName: downloaded.fileName,
        mimeType: "video/mp4",
        sizeBytes: stored.size,
        checksumSha256,
        altText: video.altText,
        metadata: {
          managed: true,
          trainingYoutubeMirror: true,
          sourceAssetId: video.id,
          sourceUrl: video.sourceUrl,
        },
        createdBy: actorUserId,
      })
      .returning({ id: helpAssets.id });
    if (!created) throw new Error("TRAINING_LOCAL_VIDEO_NOT_CREATED");

    await recordAuditEvent({
      actorUserId,
      action: "help.training.video.cached",
      entityType: "help_asset",
      entityId: created.id,
      metadata: {
        contentId: input.contentId,
        sourceAssetId: video.id,
        sizeBytes: stored.size,
      },
    });

    return created.id;
  } catch (cause) {
    await deleteAssetObject(stored.key).catch(() => undefined);
    throw cause;
  }
}

export function trainingVideoNeedsLocalMirror(video: HelpTrainingSourceAsset | null): boolean {
  return Boolean(video?.sourceUrl && !video.storageKey && youtubeVideoId(video.sourceUrl));
}

export async function ensureTrainingLocalVideoAsset(
  actorUserId: string,
  input: TrainingVideoSource,
): Promise<string | null> {
  const video = input.video;
  if (!video) return null;
  if (video.storageKey) return video.id;
  if (!trainingVideoNeedsLocalMirror(video)) return null;

  const key = `${input.contentId}:${video.id}`;
  const pending = mirrorPromises.get(key);
  if (pending) return pending;

  const task = createMirror(actorUserId, input);
  mirrorPromises.set(key, task);
  try {
    return await task;
  } finally {
    mirrorPromises.delete(key);
  }
}
