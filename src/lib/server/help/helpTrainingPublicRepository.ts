import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, ne, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingPaths,
  helpTrainingPublicEvents,
  helpTrainingPublicSessions,
  helpTrainingPublicStepProgress,
  helpTrainingVersions,
} from "$lib/server/db/helpTrainingSchema";
import { normalizeTrainingClientStep } from "$lib/server/help/helpTrainingExperience";

const PUBLIC_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function getPublicHelpTrainingLanding(slug: string) {
  const db = getDatabase();
  const [path] = await db
    .select({
      id: helpTrainingPaths.id,
      slug: helpTrainingPaths.slug,
      title: helpTrainingPaths.title,
      audience: helpTrainingPaths.audience,
      welcomeMessage: helpTrainingPaths.welcomeMessage,
      currentVersion: helpTrainingPaths.currentVersion,
    })
    .from(helpTrainingPaths)
    .where(
      and(
        eq(helpTrainingPaths.slug, slug),
        eq(helpTrainingPaths.accessMode, "public"),
        ne(helpTrainingPaths.status, "archived"),
        gt(helpTrainingPaths.currentVersion, 0),
      ),
    )
    .limit(1);
  if (!path) return null;

  const [version] = await db
    .select({ id: helpTrainingVersions.id, snapshot: helpTrainingVersions.snapshot })
    .from(helpTrainingVersions)
    .where(
      and(
        eq(helpTrainingVersions.pathId, path.id),
        eq(helpTrainingVersions.version, path.currentVersion),
      ),
    )
    .limit(1);
  if (!version) return null;

  return {
    pathId: path.id,
    slug: path.slug,
    title: version.snapshot.title,
    audience: version.snapshot.audience,
    welcomeMessage: version.snapshot.welcomeMessage,
    versionId: version.id,
  };
}

export async function startPublicHelpTrainingSession(slug: string) {
  const landing = await getPublicHelpTrainingLanding(slug);
  if (!landing) throw new Error("PUBLIC_TRAINING_NOT_FOUND");
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + PUBLIC_SESSION_TTL_MS);
  const db = getDatabase();
  const [session] = await db
    .insert(helpTrainingPublicSessions)
    .values({
      versionId: landing.versionId,
      sessionTokenHash: sha256(rawToken),
      expiresAt,
    })
    .returning({ id: helpTrainingPublicSessions.id });
  if (!session) throw new Error("PUBLIC_TRAINING_SESSION_NOT_CREATED");
  await db.insert(helpTrainingPublicEvents).values({
    sessionId: session.id,
    eventType: "training_started",
  });
  return { sessionToken: rawToken, expiresAt };
}

export async function getPublicHelpTrainingSession(rawSessionToken: string) {
  const db = getDatabase();
  const [session] = await db
    .select()
    .from(helpTrainingPublicSessions)
    .where(eq(helpTrainingPublicSessions.sessionTokenHash, sha256(rawSessionToken)))
    .limit(1);
  if (!session || session.expiresAt <= new Date()) return null;

  const [version] = await db
    .select()
    .from(helpTrainingVersions)
    .where(eq(helpTrainingVersions.id, session.versionId))
    .limit(1);
  if (!version) return null;

  const currentStep = version.snapshot.steps[session.currentStepIndex] ?? null;
  const [progress] = currentStep
    ? await db
        .select()
        .from(helpTrainingPublicStepProgress)
        .where(
          and(
            eq(helpTrainingPublicStepProgress.sessionId, session.id),
            eq(helpTrainingPublicStepProgress.stepKey, currentStep.id),
          ),
        )
        .limit(1)
    : [];

  await db
    .update(helpTrainingPublicSessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(helpTrainingPublicSessions.id, session.id));

  return {
    session,
    version,
    snapshot: version.snapshot,
    currentStep,
    progress: progress ?? null,
    completed: Boolean(session.completedAt) || session.currentStepIndex >= version.snapshot.steps.length,
  };
}

export function toPublicHelpTrainingClientState(
  state: NonNullable<Awaited<ReturnType<typeof getPublicHelpTrainingSession>>>,
) {
  return {
    session: {
      id: state.session.id,
      startedAt: state.session.startedAt,
      completedAt: state.session.completedAt,
    },
    training: {
      slug: state.snapshot.slug,
      title: state.snapshot.title,
      audience: state.snapshot.audience,
      welcomeMessage: state.snapshot.welcomeMessage,
    },
    sourceContent: state.snapshot.sourceContent,
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

export async function markPublicHelpTrainingStepViewed(
  sessionId: string,
  stepKey: string,
): Promise<void> {
  await getDatabase().insert(helpTrainingPublicEvents).values({
    sessionId,
    stepKey,
    eventType: "step_viewed",
  });
}

export async function completePublicHelpTrainingStep(rawSessionToken: string) {
  const state = await getPublicHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("PUBLIC_TRAINING_SESSION_INVALID");
  const db = getDatabase();
  const now = new Date();
  const nextIndex = state.session.currentStepIndex + 1;
  const completed = nextIndex >= state.snapshot.steps.length;
  const interactionMode = state.currentStep.interactionMode ?? "action";
  const progressStatus = interactionMode === "presentation" ? "continued" : "succeeded";

  await db.transaction(async (tx) => {
    await tx
      .insert(helpTrainingPublicStepProgress)
      .values({
        sessionId: state.session.id,
        stepKey: state.currentStep!.id,
        status: progressStatus,
        attemptCount: Math.max(1, (state.progress?.attemptCount ?? 0) + 1),
        completedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [helpTrainingPublicStepProgress.sessionId, helpTrainingPublicStepProgress.stepKey],
        set: {
          status: progressStatus,
          attemptCount: sql`${helpTrainingPublicStepProgress.attemptCount} + 1`,
          completedAt: now,
          updatedAt: now,
        },
      });
    await tx
      .update(helpTrainingPublicSessions)
      .set({
        currentStepIndex: nextIndex,
        completedAt: completed ? now : null,
        lastActivityAt: now,
      })
      .where(eq(helpTrainingPublicSessions.id, state.session.id));
    await tx.insert(helpTrainingPublicEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep!.id,
      eventType: completed
        ? "training_completed"
        : interactionMode === "presentation"
          ? "step_continued"
          : "step_succeeded",
      metadata: { nextStepIndex: nextIndex },
    });
  });

  return { completed, successMessage: state.currentStep.successMessage };
}

export async function reportPublicHelpTrainingFailure(
  rawSessionToken: string,
  input: { reasonKey: string; detail: string },
) {
  const state = await getPublicHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("PUBLIC_TRAINING_SESSION_INVALID");
  if ((state.currentStep.interactionMode ?? "action") !== "action") {
    throw new Error("PUBLIC_TRAINING_FAILURE_NOT_ALLOWED");
  }
  const reason = state.currentStep.failureReasons.find((item) => item.key === input.reasonKey);
  if (!reason) throw new Error("PUBLIC_TRAINING_FAILURE_REASON_INVALID");
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
        failureReasonKey: reason.key,
        failureDetail: input.detail.trim().slice(0, 4000),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [helpTrainingPublicStepProgress.sessionId, helpTrainingPublicStepProgress.stepKey],
        set: {
          status: "blocked",
          attemptCount: sql`${helpTrainingPublicStepProgress.attemptCount} + 1`,
          failureReasonKey: reason.key,
          failureDetail: input.detail.trim().slice(0, 4000),
          updatedAt: now,
        },
      });
    await tx.insert(helpTrainingPublicEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep!.id,
      eventType: "step_failed",
      metadata: { reasonKey: reason.key },
    });
  });
  return reason;
}

export async function publicTrainingSessionCanReadAsset(
  rawSessionToken: string,
  assetId: string,
): Promise<boolean> {
  const state = await getPublicHelpTrainingSession(rawSessionToken);
  if (!state?.currentStep) return false;
  if (state.currentStep.images.some((image) => image.assetId === assetId)) return true;
  return state.currentStep.videoUrl === `asset:${assetId}`;
}
