import type { HelpTrainingInteractionMode } from "$lib/server/db/helpTrainingSchema";
import { getHelpTrainingSession } from "$lib/server/help/helpTrainingRepository";

export type HelpTrainingClientStep = {
  id: string;
  title: string;
  instruction: string;
  expectedResult: string;
  successMessage: string;
  primaryActionLabel: string;
  interactionMode: HelpTrainingInteractionMode;
  images: Array<{ assetId: string; altText: string }>;
  videoUrl: string | null;
  captionAssetId: string | null;
};

export function normalizeTrainingClientStep(
  step: NonNullable<Awaited<ReturnType<typeof getHelpTrainingSession>>>["currentStep"],
): HelpTrainingClientStep | null {
  if (!step) return null;
  const interactionMode = step.interactionMode ?? "action";
  return {
    id: step.id,
    title: step.title,
    instruction: step.instruction,
    expectedResult: step.expectedResult,
    successMessage: step.successMessage,
    primaryActionLabel: "Próximo passo",
    interactionMode,
    images: step.images.slice(0, 1),
    videoUrl: step.videoUrl,
    captionAssetId: step.captionAssetId ?? null,
  };
}

export function toHelpTrainingClientState(
  state: NonNullable<Awaited<ReturnType<typeof getHelpTrainingSession>>>,
) {
  return {
    session: {
      id: state.session.id,
      startedAt: state.session.startedAt,
      completedAt: state.session.completedAt,
    },
    invite: {
      participantName: state.invite.participantName,
      organizationName: state.invite.organizationName,
    },
    training: {
      title: state.snapshot.title,
      audience: state.snapshot.audience,
      welcomeMessage: state.snapshot.welcomeMessage,
    },
    currentStep: normalizeTrainingClientStep(state.currentStep),
    progress: state.progress
      ? {
          status: state.progress.status,
          attemptCount: state.progress.attemptCount,
          failureReasonKey: state.progress.failureReasonKey,
          failureDetail: state.progress.failureDetail,
        }
      : null,
    completed: state.completed,
  };
}
