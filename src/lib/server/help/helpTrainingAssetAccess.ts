import {
  getHelpTrainingSession,
} from "$lib/server/help/helpTrainingRepository";
import {
  getPublicHelpTrainingSession,
} from "$lib/server/help/helpTrainingPublicRepository";

export async function trainingSessionCanReadTrainingAsset(
  rawSessionToken: string,
  assetId: string,
): Promise<boolean> {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state) return false;

  return state.snapshot.steps.some((step) => {
    if (step.images.some((image) => image.assetId === assetId)) return true;
    if (step.captionAssetId === assetId) return true;
    return step.videoUrl === `asset:${assetId}`;
  });
}

export async function publicSessionCanReadTrainingAsset(
  rawSessionToken: string,
  assetId: string,
): Promise<boolean> {
  const state = await getPublicHelpTrainingSession(rawSessionToken);
  if (!state?.currentStep) return false;
  if (state.currentStep.images.some((image) => image.assetId === assetId)) return true;
  if (state.currentStep.captionAssetId === assetId) return true;
  return state.currentStep.videoUrl === `asset:${assetId}`;
}
