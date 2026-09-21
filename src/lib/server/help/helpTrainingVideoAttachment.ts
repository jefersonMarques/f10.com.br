import { and, eq, max } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingPaths,
  helpTrainingStepMedia,
  helpTrainingSteps,
} from "$lib/server/db/helpTrainingSchema";
import { helpAssets } from "$lib/server/db/structuredHelpSchema";

async function requireTrainingStep(pathId: string, stepId: string): Promise<void> {
  const [step] = await getDatabase()
    .select({ id: helpTrainingSteps.id })
    .from(helpTrainingSteps)
    .where(and(eq(helpTrainingSteps.id, stepId), eq(helpTrainingSteps.pathId, pathId)))
    .limit(1);
  if (!step) throw new Error("TRAINING_STEP_NOT_FOUND");
}

async function requireCaptionAsset(assetId: string): Promise<void> {
  const [asset] = await getDatabase()
    .select({ assetType: helpAssets.assetType, mimeType: helpAssets.mimeType })
    .from(helpAssets)
    .where(eq(helpAssets.id, assetId))
    .limit(1);
  if (!asset || asset.assetType !== "file" || asset.mimeType !== "text/vtt") {
    throw new Error("TRAINING_CAPTION_INVALID");
  }
}

async function touchTrainingDraft(pathId: string, actorUserId: string): Promise<void> {
  await getDatabase()
    .update(helpTrainingPaths)
    .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(helpTrainingPaths.id, pathId));
}

export async function attachHelpTrainingVideo(
  actorUserId: string,
  pathId: string,
  stepId: string,
  assetId: string,
  captionAssetId: string | null = null,
): Promise<void> {
  const db = getDatabase();
  await requireTrainingStep(pathId, stepId);

  const [videoAsset] = await db
    .select({ assetType: helpAssets.assetType, mimeType: helpAssets.mimeType })
    .from(helpAssets)
    .where(eq(helpAssets.id, assetId))
    .limit(1);
  if (!videoAsset || videoAsset.assetType !== "video" || videoAsset.mimeType !== "video/mp4") {
    throw new Error("TRAINING_VIDEO_INVALID");
  }
  if (captionAssetId) await requireCaptionAsset(captionAssetId);

  const existingMedia = await db
    .select({
      id: helpTrainingStepMedia.id,
      mediaType: helpTrainingStepMedia.mediaType,
    })
    .from(helpTrainingStepMedia)
    .where(eq(helpTrainingStepMedia.stepId, stepId));
  const existingVideo = existingMedia.find((media) => media.mediaType === "video") ?? null;
  const existingCaption = existingMedia.find((media) => media.mediaType === "caption") ?? null;

  await db.transaction(async (tx) => {
    if (existingVideo) {
      await tx
        .update(helpTrainingStepMedia)
        .set({ assetId, sourceUrl: `asset:${assetId}`, altText: "" })
        .where(eq(helpTrainingStepMedia.id, existingVideo.id));
    } else {
      const [{ value: currentMax }] = await tx
        .select({ value: max(helpTrainingStepMedia.sortOrder) })
        .from(helpTrainingStepMedia)
        .where(eq(helpTrainingStepMedia.stepId, stepId));
      await tx.insert(helpTrainingStepMedia).values({
        stepId,
        mediaType: "video",
        assetId,
        sourceUrl: `asset:${assetId}`,
        sortOrder: Number(currentMax ?? 0) + 10,
      });
    }

    if (captionAssetId) {
      if (existingCaption) {
        await tx
          .update(helpTrainingStepMedia)
          .set({ assetId: captionAssetId, sourceUrl: null, altText: "Legendas em português" })
          .where(eq(helpTrainingStepMedia.id, existingCaption.id));
      } else {
        const [{ value: currentMax }] = await tx
          .select({ value: max(helpTrainingStepMedia.sortOrder) })
          .from(helpTrainingStepMedia)
          .where(eq(helpTrainingStepMedia.stepId, stepId));
        await tx.insert(helpTrainingStepMedia).values({
          stepId,
          mediaType: "caption",
          assetId: captionAssetId,
          sourceUrl: null,
          altText: "Legendas em português",
          sortOrder: Number(currentMax ?? 0) + 10,
        });
      }
    } else if (existingCaption) {
      await tx.delete(helpTrainingStepMedia).where(eq(helpTrainingStepMedia.id, existingCaption.id));
    }

    await tx
      .update(helpTrainingPaths)
      .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
      .where(eq(helpTrainingPaths.id, pathId));
  });
}

export async function attachHelpTrainingCaption(
  actorUserId: string,
  pathId: string,
  stepId: string,
  captionAssetId: string,
): Promise<void> {
  const db = getDatabase();
  await requireTrainingStep(pathId, stepId);
  await requireCaptionAsset(captionAssetId);

  const media = await db
    .select({
      id: helpTrainingStepMedia.id,
      mediaType: helpTrainingStepMedia.mediaType,
      assetId: helpTrainingStepMedia.assetId,
      sourceUrl: helpTrainingStepMedia.sourceUrl,
    })
    .from(helpTrainingStepMedia)
    .where(eq(helpTrainingStepMedia.stepId, stepId));
  const video = media.find((item) => item.mediaType === "video") ?? null;
  if (!video?.assetId || video.sourceUrl !== `asset:${video.assetId}`) {
    throw new Error("TRAINING_LOCAL_VIDEO_REQUIRED");
  }
  const existingCaption = media.find((item) => item.mediaType === "caption") ?? null;

  await db.transaction(async (tx) => {
    if (existingCaption) {
      await tx
        .update(helpTrainingStepMedia)
        .set({ assetId: captionAssetId, sourceUrl: null, altText: "Legendas em português" })
        .where(eq(helpTrainingStepMedia.id, existingCaption.id));
    } else {
      const [{ value: currentMax }] = await tx
        .select({ value: max(helpTrainingStepMedia.sortOrder) })
        .from(helpTrainingStepMedia)
        .where(eq(helpTrainingStepMedia.stepId, stepId));
      await tx.insert(helpTrainingStepMedia).values({
        stepId,
        mediaType: "caption",
        assetId: captionAssetId,
        sourceUrl: null,
        altText: "Legendas em português",
        sortOrder: Number(currentMax ?? 0) + 10,
      });
    }
    await tx
      .update(helpTrainingPaths)
      .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
      .where(eq(helpTrainingPaths.id, pathId));
  });
}
