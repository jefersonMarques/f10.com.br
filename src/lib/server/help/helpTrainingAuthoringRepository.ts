import { randomBytes } from "node:crypto";
import { and, asc, eq, max } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingFailureReasons,
  helpTrainingPaths,
  helpTrainingSteps,
  helpTrainingVersions,
  type HelpTrainingAccessMode,
  type HelpTrainingInteractionMode,
  type HelpTrainingSnapshot,
} from "$lib/server/db/helpTrainingSchema";
import { getHelpTrainingPath, normalizeTrainingSlug } from "$lib/server/help/helpTrainingRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function assertVideoReference(value: string, assetId: string | null): void {
  if (value.startsWith("asset:")) {
    const referenceId = value.slice("asset:".length);
    if (!isUuid(referenceId) || (assetId && referenceId !== assetId)) {
      throw new Error("TRAINING_VIDEO_INVALID");
    }
    return;
  }

  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("INVALID_MEDIA_URL");
  }
}

async function getTrainingPathRow(pathId: string) {
  const [path] = await getDatabase()
    .select()
    .from(helpTrainingPaths)
    .where(eq(helpTrainingPaths.id, pathId))
    .limit(1);
  return path ?? null;
}

async function getTrainingStepRow(pathId: string, stepId: string) {
  const [step] = await getDatabase()
    .select()
    .from(helpTrainingSteps)
    .where(and(eq(helpTrainingSteps.id, stepId), eq(helpTrainingSteps.pathId, pathId)))
    .limit(1);
  return step ?? null;
}

async function touchTrainingDraft(pathId: string, actorUserId: string): Promise<void> {
  await getDatabase()
    .update(helpTrainingPaths)
    .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(helpTrainingPaths.id, pathId));
}

export async function updateHelpTrainingPathDraft(
  actorUserId: string,
  pathId: string,
  input: {
    title: string;
    slug: string;
    audience: string;
    description: string;
    welcomeMessage: string;
    supportQueueId: string | null;
    accessMode: HelpTrainingAccessMode;
  },
): Promise<void> {
  const path = await getTrainingPathRow(pathId);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.status === "archived") throw new Error("TRAINING_PATH_ARCHIVED");

  const slug = normalizeTrainingSlug(input.slug || input.title);
  if (!slug || input.title.trim().length < 4) throw new Error("INVALID_TRAINING_PATH");
  if (input.accessMode !== "invite_only" && input.accessMode !== "public") {
    throw new Error("TRAINING_ACCESS_MODE_INVALID");
  }

  await getDatabase()
    .update(helpTrainingPaths)
    .set({
      slug,
      title: input.title.trim(),
      audience: input.audience.trim(),
      description: input.description.trim(),
      welcomeMessage: input.welcomeMessage.trim(),
      supportQueueId: input.supportQueueId,
      accessMode: input.accessMode,
      status: "draft",
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(helpTrainingPaths.id, pathId));
}

export async function updateHelpTrainingStepDraft(
  actorUserId: string,
  pathId: string,
  stepId: string,
  input: {
    title: string;
    instruction: string;
    expectedResult: string;
    successMessage: string;
    estimatedSeconds: number;
    interactionMode: HelpTrainingInteractionMode;
  },
): Promise<void> {
  const step = await getTrainingStepRow(pathId, stepId);
  if (!step) throw new Error("TRAINING_STEP_NOT_FOUND");
  if (input.interactionMode !== "presentation" && input.interactionMode !== "action") {
    throw new Error("TRAINING_INTERACTION_MODE_INVALID");
  }

  const estimatedSeconds = Math.min(Math.max(Math.round(input.estimatedSeconds || 45), 5), 900);
  await getDatabase()
    .update(helpTrainingSteps)
    .set({
      title: input.title.trim(),
      instruction: input.instruction.trim(),
      expectedResult: input.interactionMode === "presentation" ? "" : input.expectedResult.trim(),
      successMessage: input.successMessage.trim(),
      estimatedSeconds,
      interactionMode: input.interactionMode,
      updatedAt: new Date(),
    })
    .where(eq(helpTrainingSteps.id, stepId));
  await touchTrainingDraft(pathId, actorUserId);
}

export async function moveHelpTrainingStep(
  actorUserId: string,
  pathId: string,
  stepId: string,
  direction: "up" | "down",
): Promise<void> {
  const db = getDatabase();
  const steps = await db
    .select({ id: helpTrainingSteps.id, sortOrder: helpTrainingSteps.sortOrder })
    .from(helpTrainingSteps)
    .where(eq(helpTrainingSteps.pathId, pathId))
    .orderBy(asc(helpTrainingSteps.sortOrder));
  const index = steps.findIndex((step) => step.id === stepId);
  if (index < 0) throw new Error("TRAINING_STEP_NOT_FOUND");
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  const target = steps[targetIndex];
  const current = steps[index];
  if (!current || !target) return;
  const temporarySortOrder = Math.min(...steps.map((step) => step.sortOrder)) - 1000;

  await db.transaction(async (tx) => {
    await tx.update(helpTrainingSteps).set({ sortOrder: temporarySortOrder }).where(eq(helpTrainingSteps.id, current.id));
    await tx.update(helpTrainingSteps).set({ sortOrder: current.sortOrder }).where(eq(helpTrainingSteps.id, target.id));
    await tx.update(helpTrainingSteps).set({ sortOrder: target.sortOrder }).where(eq(helpTrainingSteps.id, current.id));
    await tx
      .update(helpTrainingPaths)
      .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
      .where(eq(helpTrainingPaths.id, pathId));
  });
}

export async function addHelpTrainingFailureReason(
  actorUserId: string,
  pathId: string,
  stepId: string,
): Promise<string> {
  if (!(await getTrainingStepRow(pathId, stepId))) throw new Error("TRAINING_STEP_NOT_FOUND");
  const db = getDatabase();
  const [{ value: currentMax }] = await db
    .select({ value: max(helpTrainingFailureReasons.sortOrder) })
    .from(helpTrainingFailureReasons)
    .where(eq(helpTrainingFailureReasons.stepId, stepId));
  const [reason] = await db
    .insert(helpTrainingFailureReasons)
    .values({
      stepId,
      reasonKey: `custom_${randomBytes(8).toString("hex")}`,
      label: "Outro motivo",
      recoveryMessage: "Explique o que aconteceu e tente novamente. Se ainda precisar, peça ajuda à equipe F10.",
      sortOrder: Number(currentMax ?? 0) + 10,
    })
    .returning({ id: helpTrainingFailureReasons.id });
  if (!reason) throw new Error("TRAINING_FAILURE_REASON_NOT_CREATED");
  await touchTrainingDraft(pathId, actorUserId);
  return reason.id;
}

export async function deleteHelpTrainingFailureReason(
  actorUserId: string,
  pathId: string,
  stepId: string,
  reasonId: string,
): Promise<void> {
  if (!(await getTrainingStepRow(pathId, stepId))) throw new Error("TRAINING_STEP_NOT_FOUND");
  await getDatabase()
    .delete(helpTrainingFailureReasons)
    .where(and(eq(helpTrainingFailureReasons.id, reasonId), eq(helpTrainingFailureReasons.stepId, stepId)));
  await touchTrainingDraft(pathId, actorUserId);
}

export async function moveHelpTrainingFailureReason(
  actorUserId: string,
  pathId: string,
  stepId: string,
  reasonId: string,
  direction: "up" | "down",
): Promise<void> {
  if (!(await getTrainingStepRow(pathId, stepId))) throw new Error("TRAINING_STEP_NOT_FOUND");
  const db = getDatabase();
  const reasons = await db
    .select({ id: helpTrainingFailureReasons.id, sortOrder: helpTrainingFailureReasons.sortOrder })
    .from(helpTrainingFailureReasons)
    .where(eq(helpTrainingFailureReasons.stepId, stepId))
    .orderBy(asc(helpTrainingFailureReasons.sortOrder));
  const index = reasons.findIndex((reason) => reason.id === reasonId);
  if (index < 0) throw new Error("TRAINING_FAILURE_REASON_NOT_FOUND");
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  const current = reasons[index];
  const target = reasons[targetIndex];
  if (!current || !target) return;
  const temporarySortOrder = Math.min(...reasons.map((reason) => reason.sortOrder)) - 1000;

  await db.transaction(async (tx) => {
    await tx.update(helpTrainingFailureReasons).set({ sortOrder: temporarySortOrder }).where(eq(helpTrainingFailureReasons.id, current.id));
    await tx.update(helpTrainingFailureReasons).set({ sortOrder: current.sortOrder }).where(eq(helpTrainingFailureReasons.id, target.id));
    await tx.update(helpTrainingFailureReasons).set({ sortOrder: target.sortOrder }).where(eq(helpTrainingFailureReasons.id, current.id));
    await tx
      .update(helpTrainingPaths)
      .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
      .where(eq(helpTrainingPaths.id, pathId));
  });
}

async function buildTrainingSnapshot(pathId: string, version: number): Promise<HelpTrainingSnapshot> {
  const path = await getHelpTrainingPath(pathId);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.steps.length === 0) throw new Error("TRAINING_STEP_REQUIRED");

  const steps = path.steps.map((step) => {
    const interactionMode = step.interactionMode ?? "action";
    if (!step.title.trim() || !step.instruction.trim()) throw new Error("TRAINING_STEP_INCOMPLETE");
    if (interactionMode === "action" && !step.expectedResult.trim()) {
      throw new Error("TRAINING_STEP_RESULT_REQUIRED");
    }
    if (interactionMode === "action" && step.failureReasons.length === 0) {
      throw new Error("TRAINING_FAILURE_REASON_REQUIRED");
    }

    const images = step.media
      .filter((media) => media.mediaType === "image" && media.assetId)
      .map((media) => ({ assetId: media.assetId as string, altText: media.altText }));
    const video = step.media.find((media) => media.mediaType === "video" && media.sourceUrl);
    const caption = step.media.find((media) => media.mediaType === "caption" && media.assetId);
    if (video?.sourceUrl) assertVideoReference(video.sourceUrl, video.assetId);

    return {
      id: step.id,
      title: step.title,
      instruction: step.instruction,
      expectedResult: interactionMode === "presentation" ? "" : step.expectedResult,
      successMessage: step.successMessage,
      interactionMode,
      estimatedSeconds: step.estimatedSeconds,
      images,
      videoUrl: video?.sourceUrl ?? null,
      captionAssetId: caption?.assetId ?? null,
      failureReasons: interactionMode === "presentation"
        ? []
        : step.failureReasons.map((reason) => ({
            key: reason.reasonKey,
            label: reason.label,
            recoveryMessage: reason.recoveryMessage,
          })),
    };
  });

  return {
    pathId: path.id,
    slug: path.slug,
    title: path.title,
    audience: path.audience,
    description: path.description,
    welcomeMessage: path.welcomeMessage,
    version,
    steps,
  };
}

export async function publishHelpTrainingPathDraft(actorUserId: string, pathId: string): Promise<number> {
  const db = getDatabase();
  const path = await getTrainingPathRow(pathId);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.status === "archived") throw new Error("TRAINING_PATH_ARCHIVED");
  const nextVersion = path.currentVersion + 1;
  const snapshot = await buildTrainingSnapshot(pathId, nextVersion);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(helpTrainingVersions).values({
      pathId,
      version: nextVersion,
      snapshot,
      publishedBy: actorUserId,
      publishedAt: now,
    });
    await tx
      .update(helpTrainingPaths)
      .set({
        status: "published",
        currentVersion: nextVersion,
        publishedAt: now,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(helpTrainingPaths.id, pathId));
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.training.published",
    entityType: "help_training_path",
    entityId: pathId,
    metadata: { version: nextVersion, stepCount: snapshot.steps.length },
  });
  return nextVersion;
}

export async function deleteHelpTrainingDraftPath(actorUserId: string, pathId: string): Promise<void> {
  const path = await getTrainingPathRow(pathId);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.currentVersion > 0) throw new Error("TRAINING_DELETE_PUBLISHED_NOT_ALLOWED");

  await getDatabase().delete(helpTrainingPaths).where(eq(helpTrainingPaths.id, pathId));
  await recordAuditEvent({
    actorUserId,
    action: "help.training.deleted",
    entityType: "help_training_path",
    entityId: pathId,
    metadata: { slug: path.slug },
  });
}
