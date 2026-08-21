import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingEvents,
  helpTrainingPublicEvents,
  helpTrainingPublicSessions,
  helpTrainingPublicStepProgress,
  helpTrainingSessions,
  helpTrainingStepProgress,
} from "$lib/server/db/helpTrainingSchema";
import {
  completeHelpTrainingStep,
  getHelpTrainingSession,
} from "$lib/server/help/helpTrainingRepository";
import {
  completePublicHelpTrainingStep,
  getPublicHelpTrainingSession,
} from "$lib/server/help/helpTrainingPublicRepository";

const MAX_DIFFICULTY_DETAIL_LENGTH = 4000;
const MAX_REPORTER_NAME_LENGTH = 160;
const MAX_REPORTER_EMAIL_LENGTH = 320;

function normalizeDifficultyDetail(value: string): string {
  const detail = value.trim().slice(0, MAX_DIFFICULTY_DETAIL_LENGTH);
  if (detail.length < 3) throw new Error("TRAINING_DIFFICULTY_DETAIL_REQUIRED");
  return detail;
}

function normalizeReporterName(value: string): string {
  const name = value.trim().slice(0, MAX_REPORTER_NAME_LENGTH);
  if (name.length < 2) throw new Error("TRAINING_REPORTER_NAME_REQUIRED");
  return name;
}

function normalizeReporterEmail(value: string): string {
  const email = value.trim().toLowerCase().slice(0, MAX_REPORTER_EMAIL_LENGTH);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("TRAINING_REPORTER_EMAIL_INVALID");
  }
  return email;
}

function isCompletedProgress(progress: { status: string; completedAt: Date | null } | null): boolean {
  if (!progress?.completedAt) return false;
  return progress.status === "succeeded" || progress.status === "continued";
}

export async function completeInviteTrainingStepGuided(rawSessionToken: string) {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("TRAINING_SESSION_INVALID");
  if (!isCompletedProgress(state.progress)) return completeHelpTrainingStep(rawSessionToken);

  const now = new Date();
  const nextIndex = state.session.currentStepIndex + 1;
  const completed = nextIndex >= state.snapshot.steps.length;
  const db = getDatabase();

  await db.transaction(async (tx) => {
    await tx
      .update(helpTrainingSessions)
      .set({
        currentStepIndex: nextIndex,
        completedAt: completed ? state.session.completedAt ?? now : null,
        lastActivityAt: now,
      })
      .where(sql`${helpTrainingSessions.id} = ${state.session.id}`);
    await tx.insert(helpTrainingEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep!.id,
      eventType: "step_revisited",
      metadata: { nextStepIndex: nextIndex },
    });
  });

  return { completed, successMessage: state.currentStep.successMessage };
}

export async function completePublicTrainingStepGuided(rawSessionToken: string) {
  const state = await getPublicHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("PUBLIC_TRAINING_SESSION_INVALID");
  if (!isCompletedProgress(state.progress)) return completePublicHelpTrainingStep(rawSessionToken);

  const now = new Date();
  const nextIndex = state.session.currentStepIndex + 1;
  const completed = nextIndex >= state.snapshot.steps.length;
  const db = getDatabase();

  await db.transaction(async (tx) => {
    await tx
      .update(helpTrainingPublicSessions)
      .set({
        currentStepIndex: nextIndex,
        completedAt: completed ? state.session.completedAt ?? now : null,
        lastActivityAt: now,
      })
      .where(sql`${helpTrainingPublicSessions.id} = ${state.session.id}`);
    await tx.insert(helpTrainingPublicEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep!.id,
      eventType: "step_revisited",
      metadata: { nextStepIndex: nextIndex },
    });
  });

  return { completed, successMessage: state.currentStep.successMessage };
}

export async function reportInviteTrainingDifficulty(
  rawSessionToken: string,
  detailInput: string,
): Promise<void> {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("TRAINING_SESSION_INVALID");
  if ((state.currentStep.interactionMode ?? "action") !== "action") {
    throw new Error("TRAINING_DIFFICULTY_NOT_ALLOWED");
  }

  const detail = normalizeDifficultyDetail(detailInput);
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .insert(helpTrainingStepProgress)
      .values({
        sessionId: state.session.id,
        stepKey: state.currentStep!.id,
        status: "blocked",
        attemptCount: 1,
        failureReasonKey: null,
        failureDetail: detail,
        completedAt: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [helpTrainingStepProgress.sessionId, helpTrainingStepProgress.stepKey],
        set: {
          status: "blocked",
          attemptCount: sql`${helpTrainingStepProgress.attemptCount} + 1`,
          failureReasonKey: null,
          failureDetail: detail,
          completedAt: null,
          updatedAt: now,
        },
      });

    await tx
      .update(helpTrainingSessions)
      .set({ lastActivityAt: now })
      .where(sql`${helpTrainingSessions.id} = ${state.session.id}`);

    await tx.insert(helpTrainingEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep!.id,
      eventType: "step_blocked",
      metadata: { inputMode: "free_text", detailLength: detail.length },
    });
  });
}

export async function goBackInviteTrainingStep(rawSessionToken: string): Promise<boolean> {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state) throw new Error("TRAINING_SESSION_INVALID");
  if (state.session.currentStepIndex <= 0) return false;

  const now = new Date();
  const nextIndex = state.session.currentStepIndex - 1;
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx
      .update(helpTrainingSessions)
      .set({ currentStepIndex: nextIndex, completedAt: null, lastActivityAt: now })
      .where(sql`${helpTrainingSessions.id} = ${state.session.id}`);
    await tx.insert(helpTrainingEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep?.id ?? null,
      eventType: "step_back",
      metadata: { fromIndex: state.session.currentStepIndex, toIndex: nextIndex },
    });
  });
  return true;
}

export async function reportPublicTrainingDifficulty(
  rawSessionToken: string,
  input: { detail: string; reporterName: string; reporterEmail: string },
): Promise<void> {
  const state = await getPublicHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("PUBLIC_TRAINING_SESSION_INVALID");
  if ((state.currentStep.interactionMode ?? "action") !== "action") {
    throw new Error("TRAINING_DIFFICULTY_NOT_ALLOWED");
  }

  const detail = normalizeDifficultyDetail(input.detail);
  const reporterName = normalizeReporterName(input.reporterName);
  const reporterEmail = normalizeReporterEmail(input.reporterEmail);
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .insert(helpTrainingPublicStepProgress)
      .values({
        sessionId: state.session.id,
        stepKey: state.currentStep!.id,
        status: "blocked",
        attemptCount: 1,
        failureReasonKey: null,
        failureDetail: detail,
        completedAt: null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [helpTrainingPublicStepProgress.sessionId, helpTrainingPublicStepProgress.stepKey],
        set: {
          status: "blocked",
          attemptCount: sql`${helpTrainingPublicStepProgress.attemptCount} + 1`,
          failureReasonKey: null,
          failureDetail: detail,
          completedAt: null,
          updatedAt: now,
        },
      });

    await tx
      .update(helpTrainingPublicSessions)
      .set({ lastActivityAt: now })
      .where(sql`${helpTrainingPublicSessions.id} = ${state.session.id}`);

    await tx.insert(helpTrainingPublicEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep!.id,
      eventType: "step_blocked",
      metadata: {
        inputMode: "free_text",
        reporterName,
        reporterEmail,
        detail,
      },
    });
  });
}

export async function goBackPublicTrainingStep(rawSessionToken: string): Promise<boolean> {
  const state = await getPublicHelpTrainingSession(rawSessionToken);
  if (!state) throw new Error("PUBLIC_TRAINING_SESSION_INVALID");
  if (state.session.currentStepIndex <= 0) return false;

  const now = new Date();
  const nextIndex = state.session.currentStepIndex - 1;
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx
      .update(helpTrainingPublicSessions)
      .set({ currentStepIndex: nextIndex, completedAt: null, lastActivityAt: now })
      .where(sql`${helpTrainingPublicSessions.id} = ${state.session.id}`);
    await tx.insert(helpTrainingPublicEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep?.id ?? null,
      eventType: "step_back",
      metadata: { fromIndex: state.session.currentStepIndex, toIndex: nextIndex },
    });
  });
  return true;
}
