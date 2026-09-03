import {
  getHelpTrainingSession,
} from "$lib/server/help/helpTrainingRepository";
import {
  getPublicHelpTrainingSession,
} from "$lib/server/help/helpTrainingPublicRepository";
import type { HelpTrainingSnapshot } from "$lib/server/db/helpTrainingSchema";

function snapshotCanReadAsset(snapshot: HelpTrainingSnapshot | null | undefined, assetId: string): boolean {
  if (!snapshot) return false;
  if (snapshot.sourceContent.featuredVideo?.id === assetId) return true;
  if (
    snapshot.sourceContent.steps.some((step) =>
      step.blocks.some((block) => block.asset?.id === assetId)
    )
  ) return true;
  return snapshot.steps.some((step) =>
    step.images.some((image) => image.assetId === assetId)
    || step.captionAssetId === assetId
    || step.videoUrl === `asset:${assetId}`
  );
}

export async function trainingSessionCanReadTrainingAsset(
  rawSessionToken: string,
  assetId: string,
): Promise<boolean> {
  const state = await getHelpTrainingSession(rawSessionToken);
  return snapshotCanReadAsset(state?.snapshot, assetId);
}

export async function publicSessionCanReadTrainingAsset(
  rawSessionToken: string,
  assetId: string,
): Promise<boolean> {
  const state = await getPublicHelpTrainingSession(rawSessionToken);
  return snapshotCanReadAsset(state?.snapshot, assetId);
}
