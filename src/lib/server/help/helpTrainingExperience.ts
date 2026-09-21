import type {
  HelpTrainingInteractionMode,
  HelpTrainingSnapshot,
  HelpTrainingSourceContent,
} from "$lib/server/db/helpTrainingSchema";
import type { HelpImageAnnotation } from "$lib/help/helpImageAnnotations";
import type { getHelpTrainingSession } from "$lib/server/help/helpTrainingRepository";

export type HelpTrainingClientStep = {
  id: string;
  title: string;
  question: string;
  instruction: string;
  expectedResult: string;
  successMessage: string;
  primaryActionLabel: string;
  interactionMode: HelpTrainingInteractionMode;
  videoStartSeconds: number;
  videoEndSeconds: number;
  images: Array<{ assetId: string; altText: string; annotations: HelpImageAnnotation[] }>;
  videoUrl: string | null;
  captionAssetId: string | null;
};

export type HelpTrainingJourneyModule = {
  id: string;
  title: string;
  summary: string;
  slug: string;
  sortOrder: number;
  stepCount: number;
  estimatedSeconds: number;
  status: "completed" | "current" | "pending";
};

type SnapshotModule = {
  id: string;
  title: string;
  sortOrder: number;
  sourceContent: HelpTrainingSourceContent;
  stepIds: string[];
};

export function getTrainingSnapshotModules(snapshot: HelpTrainingSnapshot): SnapshotModule[] {
  if (snapshot.modules?.length) {
    return [...snapshot.modules].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return [{
    id: `legacy-${snapshot.pathId}`,
    title: snapshot.sourceContent.title,
    sortOrder: 10,
    sourceContent: snapshot.sourceContent,
    stepIds: snapshot.steps.map((step) => step.id),
  }];
}

export function buildTrainingJourney(
  snapshot: HelpTrainingSnapshot,
  currentStepIndex: number,
  completed: boolean,
) {
  const modules = getTrainingSnapshotModules(snapshot);
  const stepIndex = new Map(snapshot.steps.map((step, index) => [step.id, index]));

  const journeyModules: HelpTrainingJourneyModule[] = modules.map((module) => {
    const indexes = module.stepIds
      .map((stepId) => stepIndex.get(stepId))
      .filter((index): index is number => typeof index === "number");
    const firstIndex = indexes.length ? Math.min(...indexes) : Number.MAX_SAFE_INTEGER;
    const lastIndex = indexes.length ? Math.max(...indexes) : -1;
    const moduleCompleted = completed || (lastIndex >= 0 && currentStepIndex > lastIndex);
    const current = !completed && currentStepIndex >= firstIndex && currentStepIndex <= lastIndex;
    const estimatedSeconds = indexes.reduce(
      (sum, index) => sum + Math.max(0, snapshot.steps[index]?.estimatedSeconds ?? 0),
      0,
    );

    return {
      id: module.id,
      title: module.title,
      summary: module.sourceContent.summary || module.sourceContent.quickGuide || "",
      slug: module.sourceContent.slug,
      sortOrder: module.sortOrder,
      stepCount: indexes.length,
      estimatedSeconds,
      status: moduleCompleted ? "completed" : current ? "current" : "pending",
    };
  });

  const currentModule = journeyModules.find((module) => module.status === "current") ?? null;
  const completedModules = journeyModules.filter((module) => module.status === "completed").length;
  const totalSteps = Math.max(1, snapshot.steps.length);
  const percent = completed
    ? 100
    : Math.min(99, Math.max(0, Math.round((currentStepIndex / totalSteps) * 100)));

  return {
    modules: journeyModules,
    currentModule,
    completedModules,
    totalModules: journeyModules.length,
    percent,
    isMultiModule: journeyModules.length > 1,
  };
}

export function getTrainingCurrentSourceContent(
  snapshot: HelpTrainingSnapshot,
  currentStep: HelpTrainingSnapshot["steps"][number] | null,
): HelpTrainingSourceContent {
  if (!currentStep) return snapshot.sourceContent;
  const modules = getTrainingSnapshotModules(snapshot);
  return modules.find((module) => module.stepIds.includes(currentStep.id))?.sourceContent
    ?? snapshot.sourceContent;
}

export function canGoBackWithinTrainingModule(
  snapshot: HelpTrainingSnapshot,
  currentStepIndex: number,
): boolean {
  if (currentStepIndex <= 0) return false;
  const currentStep = snapshot.steps[currentStepIndex];
  const previousStep = snapshot.steps[currentStepIndex - 1];
  if (!currentStep || !previousStep) return false;
  if (!snapshot.modules?.length) return true;
  return Boolean(currentStep.pathItemId && currentStep.pathItemId === previousStep.pathItemId);
}

export function normalizeTrainingClientStep(
  step: HelpTrainingSnapshot["steps"][number] | null,
): HelpTrainingClientStep | null {
  if (!step) return null;
  const interactionMode = step.interactionMode ?? "action";
  return {
    id: step.id,
    title: step.title,
    question: step.question?.trim() || step.title,
    instruction: step.instruction,
    expectedResult: step.expectedResult,
    successMessage: step.successMessage,
    primaryActionLabel: step.primaryActionLabel?.trim() || "Continuar",
    interactionMode,
    videoStartSeconds: step.videoStartSeconds ?? 0,
    videoEndSeconds: step.videoEndSeconds ?? 0,
    images: step.images.slice(0, 1).map((image) => ({
      assetId: image.assetId,
      altText: image.altText,
      annotations: image.annotations ?? [],
    })),
    videoUrl: step.videoUrl,
    captionAssetId: step.captionAssetId ?? null,
  };
}

export function toHelpTrainingClientState(
  state: NonNullable<Awaited<ReturnType<typeof getHelpTrainingSession>>>,
) {
  const journey = buildTrainingJourney(
    state.snapshot,
    state.session.currentStepIndex,
    state.completed,
  );

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
    sourceContent: state.snapshot.sourceContent,
    currentSourceContent: getTrainingCurrentSourceContent(state.snapshot, state.currentStep),
    currentStep: normalizeTrainingClientStep(state.currentStep),
    journey,
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
