import type { HelpTrainingInteractionMode } from "$lib/server/db/helpTrainingSchema";
import { getHelpTrainingSession } from "$lib/server/help/helpTrainingRepository";

export type HelpTrainingClientStep = {
  id: string;
  title: string;
  instruction: string;
  expectedResult: string;
  successMessage: string;
  interactionMode: HelpTrainingInteractionMode;
  images: Array<{ assetId: string; altText: string }>;
  videoUrl: string | null;
  captionAssetId: string | null;
  failureReasons: Array<{
    key: string;
    label: string;
    recoveryMessage: string;
  }>;
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
    expectedResult: interactionMode === "presentation" ? "" : step.expectedResult,
    successMessage: step.successMessage,
    interactionMode,
    images: step.images,
    videoUrl: step.videoUrl,
    captionAssetId: step.captionAssetId ?? null,
    failureReasons: interactionMode === "presentation" ? [] : step.failureReasons,
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
