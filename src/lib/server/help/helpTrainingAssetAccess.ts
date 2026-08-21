import { getHelpTrainingSession } from "$lib/server/help/helpTrainingRepository";
import { publicTrainingSessionCanReadAsset } from "$lib/server/help/helpTrainingPublicRepository";

export async function trainingSessionCanReadTrainingAsset(
  rawSessionToken: string,
  assetId: string,
): Promise<boolean> {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state) return false;

  return state.snapshot.steps.some((step) => {
    if (step.images.some((image) => image.assetId === assetId)) return true;
    return step.videoUrl === `asset:${assetId}`;
  });
}

export async function publicSessionCanReadTrainingAsset(
  rawSessionToken: string,
  assetId: string,
): Promise<boolean> {
  return publicTrainingSessionCanReadAsset(rawSessionToken, assetId);
}
