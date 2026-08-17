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
): Promise<void> {
  const db = getDatabase();
  const [step] = await db
    .select({ id: helpTrainingSteps.id })
    .from(helpTrainingSteps)
    .where(and(eq(helpTrainingSteps.id, stepId), eq(helpTrainingSteps.pathId, pathId)))
    .limit(1);
  if (!step) throw new Error("TRAINING_STEP_NOT_FOUND");

  const [asset] = await db
    .select({ id: helpAssets.id, assetType: helpAssets.assetType, mimeType: helpAssets.mimeType })
    .from(helpAssets)
    .where(eq(helpAssets.id, assetId))
    .limit(1);
  if (!asset || asset.assetType !== "video" || asset.mimeType !== "video/mp4") {
    throw new Error("TRAINING_VIDEO_INVALID");
  }

  const [existing] = await db
    .select({ id: helpTrainingStepMedia.id })
    .from(helpTrainingStepMedia)
    .where(
      and(
        eq(helpTrainingStepMedia.stepId, stepId),
        eq(helpTrainingStepMedia.mediaType, "video"),
      ),
    )
    .limit(1);

  await db.transaction(async (tx) => {
    if (existing) {
      await tx
        .update(helpTrainingStepMedia)
        .set({
          assetId,
          sourceUrl: `asset:${assetId}`,
          altText: "",
        })
        .where(eq(helpTrainingStepMedia.id, existing.id));
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

    await tx
      .update(helpTrainingPaths)
      .set({
        status: "draft",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(helpTrainingPaths.id, pathId));
  });
}
