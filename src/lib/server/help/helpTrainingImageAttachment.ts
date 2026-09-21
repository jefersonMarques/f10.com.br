import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingPaths,
  helpTrainingStepMedia,
  helpTrainingSteps,
} from "$lib/server/db/helpTrainingSchema";
import { helpAssets } from "$lib/server/db/structuredHelpSchema";

export async function replaceHelpTrainingStepImage(
  actorUserId: string,
  pathId: string,
  stepId: string,
  assetId: string,
  altText: string,
): Promise<void> {
  const db = getDatabase();
  const [step] = await db
    .select({ id: helpTrainingSteps.id, pathId: helpTrainingSteps.pathId })
    .from(helpTrainingSteps)
    .where(and(eq(helpTrainingSteps.id, stepId), eq(helpTrainingSteps.pathId, pathId)))
    .limit(1);
  if (!step) throw new Error("TRAINING_STEP_NOT_FOUND");

  const [asset] = await db
    .select({ id: helpAssets.id, assetType: helpAssets.assetType })
    .from(helpAssets)
    .where(eq(helpAssets.id, assetId))
    .limit(1);
  if (!asset || asset.assetType !== "image") throw new Error("TRAINING_IMAGE_INVALID");

  await db.transaction(async (tx) => {
    await tx
      .delete(helpTrainingStepMedia)
      .where(and(
        eq(helpTrainingStepMedia.stepId, stepId),
        eq(helpTrainingStepMedia.mediaType, "image"),
      ));

    await tx.insert(helpTrainingStepMedia).values({
      stepId,
      mediaType: "image",
      assetId,
      sourceUrl: null,
      altText: altText.trim().slice(0, 500),
      sortOrder: 10,
    });

    await tx
      .update(helpTrainingPaths)
      .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
      .where(eq(helpTrainingPaths.id, pathId));
  });
}
