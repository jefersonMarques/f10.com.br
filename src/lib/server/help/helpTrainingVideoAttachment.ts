import { and, eq, max } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingPaths,
  helpTrainingStepMedia,
  helpTrainingSteps,
} from "$lib/server/db/helpTrainingSchema";
import { helpAssets } from "$lib/server/db/structuredHelpSchema";

export async function attachHelpTrainingVideo(
  actorUserId: string,
  pathId: string,
  stepId: string,
  assetId: string,
  captionAssetId: string | null = null,
): Promise<void> {
  const db = getDatabase();
  const [step] = await db
    .select({ id: helpTrainingSteps.id })
    .from(helpTrainingSteps)
    .where(and(eq(helpTrainingSteps.id, stepId), eq(helpTrainingSteps.pathId, pathId)))
    .limit(1);
  if (!step) throw new Error("TRAINING_STEP_NOT_FOUND");

  const assetIds = captionAssetId ? [assetId, captionAssetId] : [assetId];
  const assets = await Promise.all(
    assetIds.map(async (id) => {
      const [asset] = await db
        .select({ id: helpAssets.id, assetType: helpAssets.assetType, mimeType: helpAssets.mimeType })
        .from(helpAssets)
        .where(eq(helpAssets.id, id))
        .limit(1);
      return asset ?? null;
    }),
  );
  const videoAsset = assets[0];
  if (!videoAsset || videoAsset.assetType !== "video" || videoAsset.mimeType !== "video/mp4") {
    throw new Error("TRAINING_VIDEO_INVALID");
  }
  if (captionAssetId) {
    const captionAsset = assets[1];
    if (!captionAsset || captionAsset.assetType !== "file" || captionAsset.mimeType !== "text/vtt") {
      throw new Error("TRAINING_CAPTION_INVALID");
    }
  }

  const existingMedia = await db
    .select({ id: helpTrainingStepMedia.id, mediaType: helpTrainingStepMedia.mediaType })
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
    }

    await tx
      .update(helpTrainingPaths)
      .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
      .where(eq(helpTrainingPaths.id, pathId));
  });
}
