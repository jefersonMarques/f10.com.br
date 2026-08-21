import {
  getHelpTrainingSession,
} from "$lib/server/help/helpTrainingRepository";
import {
  getPublicHelpTrainingSession,
} from "$lib/server/help/helpTrainingPublicRepository";

function currentStepCanReadAsset(
  step: {
    images: Array<{ assetId: string }>;
    captionAssetId?: string | null;
    videoUrl: string | null;
  } | null,
  assetId: string,
): boolean {
  if (!step) return false;
  if (step.images.some((image) => image.assetId === assetId)) return true;
  if (step.captionAssetId === assetId) return true;
  return step.videoUrl === `asset:${assetId}`;
}

export async function trainingSessionCanReadTrainingAsset(
  rawSessionToken: string,
  assetId: string,
): Promise<boolean> {
  const state = await getHelpTrainingSession(rawSessionToken);
  return currentStepCanReadAsset(state?.currentStep ?? null, assetId);
}

export async function publicSessionCanReadTrainingAsset(
  rawSessionToken: string,
  assetId: string,
): Promise<boolean> {
  const state = await getPublicHelpTrainingSession(rawSessionToken);
  return currentStepCanReadAsset(state?.currentStep ?? null, assetId);
}
