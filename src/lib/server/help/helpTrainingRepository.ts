import { createHash, randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, max, sql } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingEvents,
  helpTrainingFailureReasons,
  helpTrainingInvites,
  helpTrainingPaths,
  helpTrainingSessions,
  helpTrainingStepMedia,
  helpTrainingStepProgress,
  helpTrainingSteps,
  helpTrainingVersions,
  type HelpTrainingSnapshot,
} from "$lib/server/db/helpTrainingSchema";
import { helpAssets } from "$lib/server/db/structuredHelpSchema";
import {
  customerContacts,
  supportQueues,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const DEFAULT_FAILURE_REASONS = [
  {
    key: "option_not_found",
    label: "Não encontrei a opção",
    recoveryMessage: "Confira novamente o menu e as imagens desta etapa. Se ainda não localizar, tente uma vez mais antes de pedir ajuda.",
  },
  {
    key: "system_error",
    label: "Deu erro no sistema",
    recoveryMessage: "Anote a mensagem exibida pelo F10 e, se possível, faça uma captura da tela. Você pode tentar novamente ou pedir ajuda com esse contexto.",
  },
  {
    key: "permission_missing",
    label: "Não tenho permissão",
    recoveryMessage: "Essa ação pode depender do perfil liberado pela sua empresa. Não fique repetindo a tentativa: peça ajuda para verificarmos a permissão correta.",
  },
  {
    key: "instruction_unclear",
    label: "Não entendi o que preciso fazer",
    recoveryMessage: "Releia somente o objetivo desta etapa e use a demonstração rápida, se houver. Depois tente a ação novamente.",
  },
];

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeTrainingSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function assertHttpUrl(value: string): void {
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

async function getTrainingStepRow(stepId: string) {
  const [step] = await getDatabase()
    .select()
    .from(helpTrainingSteps)
    .where(eq(helpTrainingSteps.id, stepId))
    .limit(1);
  return step ?? null;
}

async function touchTrainingDraft(pathId: string, actorUserId: string): Promise<void> {
  await getDatabase()
    .update(helpTrainingPaths)
    .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(helpTrainingPaths.id, pathId));
}

async function insertDefaultFailureReasons(stepId: string): Promise<void> {
  await getDatabase().insert(helpTrainingFailureReasons).values(
    DEFAULT_FAILURE_REASONS.map((reason, index) => ({
      stepId,
      reasonKey: reason.key,
      label: reason.label,
      recoveryMessage: reason.recoveryMessage,
      sortOrder: (index + 1) * 10,
    })),
  );
}

export async function listHelpTrainingPaths() {
  const db = getDatabase();
  const paths = await db
    .select()
    .from(helpTrainingPaths)
    .orderBy(desc(helpTrainingPaths.updatedAt));

  return Promise.all(
    paths.map(async (path) => {
      const [{ stepCount }] = await db
        .select({ stepCount: count() })
        .from(helpTrainingSteps)
        .where(eq(helpTrainingSteps.pathId, path.id));
      const invites = await db
        .select({
          id: helpTrainingInvites.id,
          sessionCompletedAt: helpTrainingSessions.completedAt,
          sessionStartedAt: helpTrainingSessions.startedAt,
        })
        .from(helpTrainingInvites)
        .leftJoin(helpTrainingSessions, eq(helpTrainingSessions.inviteId, helpTrainingInvites.id))
        .where(eq(helpTrainingInvites.pathId, path.id));

      return {
        ...path,
        stepCount: Number(stepCount ?? 0),
        participantCount: invites.length,
        startedCount: invites.filter((invite) => invite.sessionStartedAt).length,
        completedCount: invites.filter((invite) => invite.sessionCompletedAt).length,
      };
    }),
  );
}

export async function getHelpTrainingPath(pathId: string) {
  const db = getDatabase();
  const path = await getTrainingPathRow(pathId);
  if (!path) return null;

  const steps = await db
    .select()
    .from(helpTrainingSteps)
    .where(eq(helpTrainingSteps.pathId, pathId))
    .orderBy(asc(helpTrainingSteps.sortOrder));

  const enrichedSteps = await Promise.all(
    steps.map(async (step) => {
      const [media, failureReasons] = await Promise.all([
        db
          .select({
            id: helpTrainingStepMedia.id,
            mediaType: helpTrainingStepMedia.mediaType,
            assetId: helpTrainingStepMedia.assetId,
            sourceUrl: helpTrainingStepMedia.sourceUrl,
            altText: helpTrainingStepMedia.altText,
            sortOrder: helpTrainingStepMedia.sortOrder,
            assetName: helpAssets.originalName,
            assetMimeType: helpAssets.mimeType,
          })
          .from(helpTrainingStepMedia)
          .leftJoin(helpAssets, eq(helpTrainingStepMedia.assetId, helpAssets.id))
          .where(eq(helpTrainingStepMedia.stepId, step.id))
          .orderBy(asc(helpTrainingStepMedia.sortOrder)),
        db
          .select()
          .from(helpTrainingFailureReasons)
          .where(eq(helpTrainingFailureReasons.stepId, step.id))
          .orderBy(asc(helpTrainingFailureReasons.sortOrder)),
      ]);
      return { ...step, media, failureReasons };
    }),
  );

  return { ...path, steps: enrichedSteps };
}

export async function listTrainingSupportQueues() {
  return getDatabase()
    .select({ id: supportQueues.id, code: supportQueues.code, name: supportQueues.name })
    .from(supportQueues)
    .where(eq(supportQueues.active, true))
    .orderBy(asc(supportQueues.name));
}

export async function createHelpTrainingPath(
  _actorUserId: string,
  _input: { title: string; slug: string; audience: string; description: string },
) {
  throw new Error("TRAINING_SOURCE_CONTENT_REQUIRED");
}

export async function updateHelpTrainingPath(
  actorUserId: string,
  pathId: string,
  input: {
    title: string;
    slug: string;
    audience: string;
    description: string;
    welcomeMessage: string;
    supportQueueId: string | null;
  },
): Promise<void> {
  const path = await getTrainingPathRow(pathId);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.status === "archived") throw new Error("TRAINING_PATH_ARCHIVED");
  const slug = normalizeTrainingSlug(input.slug || input.title);
  if (!slug || input.title.trim().length < 4) throw new Error("INVALID_TRAINING_PATH");

  await getDatabase()
    .update(helpTrainingPaths)
    .set({
      slug,
      title: input.title.trim(),
      audience: input.audience.trim(),
      description: input.description.trim(),
      welcomeMessage: input.welcomeMessage.trim(),
      supportQueueId: input.supportQueueId,
      status: "draft",
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(helpTrainingPaths.id, pathId));
}

export async function addHelpTrainingStep(actorUserId: string, pathId: string): Promise<string> {
  const path = await getTrainingPathRow(pathId);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.status === "archived") throw new Error("TRAINING_PATH_ARCHIVED");
  const db = getDatabase();
  const [{ value: currentMax }] = await db
    .select({ value: max(helpTrainingSteps.sortOrder) })
    .from(helpTrainingSteps)
    .where(eq(helpTrainingSteps.pathId, pathId));
  const sortOrder = Number(currentMax ?? 0) + 10;
  const [step] = await db
    .insert(helpTrainingSteps)
    .values({
      pathId,
      title: "Nova ação",
      instruction: "Explique somente a próxima ação.",
      expectedResult: "O que o usuário deve ver ao concluir?",
      successMessage: "Feito. Vamos para a próxima ação.",
      estimatedSeconds: 45,
      sortOrder,
    })
    .returning({ id: helpTrainingSteps.id });
  if (!step) throw new Error("TRAINING_STEP_NOT_CREATED");
  await insertDefaultFailureReasons(step.id);
  await touchTrainingDraft(pathId, actorUserId);
  return step.id;
}

export async function updateHelpTrainingStep(
  actorUserId: string,
  pathId: string,
  stepId: string,
  input: {
    title: string;
    instruction: string;
    expectedResult: string;
    successMessage: string;
    estimatedSeconds: number;
  },
): Promise<void> {
  const step = await getTrainingStepRow(stepId);
  if (!step || step.pathId !== pathId) throw new Error("TRAINING_STEP_NOT_FOUND");
  const estimatedSeconds = Math.min(Math.max(Math.round(input.estimatedSeconds || 45), 5), 900);
  await getDatabase()
    .update(helpTrainingSteps)
    .set({
      title: input.title.trim(),
      instruction: input.instruction.trim(),
      expectedResult: input.expectedResult.trim(),
      successMessage: input.successMessage.trim(),
      estimatedSeconds,
      updatedAt: new Date(),
    })
    .where(eq(helpTrainingSteps.id, stepId));
  await touchTrainingDraft(pathId, actorUserId);
}

export async function deleteHelpTrainingStep(
  actorUserId: string,
  pathId: string,
  stepId: string,
): Promise<void> {
  const db = getDatabase();
  const steps = await db
    .select({ id: helpTrainingSteps.id })
    .from(helpTrainingSteps)
    .where(eq(helpTrainingSteps.pathId, pathId));
  if (steps.length <= 1) throw new Error("LAST_TRAINING_STEP_REQUIRED");
  if (!steps.some((step) => step.id === stepId)) throw new Error("TRAINING_STEP_NOT_FOUND");
  await db.delete(helpTrainingSteps).where(eq(helpTrainingSteps.id, stepId));
  await touchTrainingDraft(pathId, actorUserId);
}

export async function addHelpTrainingImage(
  actorUserId: string,
  pathId: string,
  stepId: string,
  assetId: string,
  altText: string,
): Promise<void> {
  const step = await getTrainingStepRow(stepId);
  if (!step || step.pathId !== pathId) throw new Error("TRAINING_STEP_NOT_FOUND");
  const db = getDatabase();
  const [asset] = await db
    .select({ id: helpAssets.id, assetType: helpAssets.assetType })
    .from(helpAssets)
    .where(eq(helpAssets.id, assetId))
    .limit(1);
  if (!asset || asset.assetType !== "image") throw new Error("TRAINING_IMAGE_INVALID");
  const [{ value: currentMax }] = await db
    .select({ value: max(helpTrainingStepMedia.sortOrder) })
    .from(helpTrainingStepMedia)
    .where(eq(helpTrainingStepMedia.stepId, stepId));
  await db.insert(helpTrainingStepMedia).values({
    stepId,
    mediaType: "image",
    assetId,
    altText: altText.trim().slice(0, 500),
    sortOrder: Number(currentMax ?? 0) + 10,
  });
  await touchTrainingDraft(pathId, actorUserId);
}

export async function addHelpTrainingVideo(
  actorUserId: string,
  pathId: string,
  stepId: string,
  sourceUrl: string,
): Promise<void> {
  const step = await getTrainingStepRow(stepId);
  if (!step || step.pathId !== pathId) throw new Error("TRAINING_STEP_NOT_FOUND");
  assertHttpUrl(sourceUrl);
  const db = getDatabase();
  const existing = await db
    .select({ id: helpTrainingStepMedia.id })
    .from(helpTrainingStepMedia)
    .where(and(eq(helpTrainingStepMedia.stepId, stepId), eq(helpTrainingStepMedia.mediaType, "video")))
    .limit(1);
  if (existing[0]) {
    await db
      .update(helpTrainingStepMedia)
      .set({ sourceUrl: sourceUrl.trim() })
      .where(eq(helpTrainingStepMedia.id, existing[0].id));
  } else {
    const [{ value: currentMax }] = await db
      .select({ value: max(helpTrainingStepMedia.sortOrder) })
      .from(helpTrainingStepMedia)
      .where(eq(helpTrainingStepMedia.stepId, stepId));
    await db.insert(helpTrainingStepMedia).values({
      stepId,
      mediaType: "video",
      sourceUrl: sourceUrl.trim(),
      sortOrder: Number(currentMax ?? 0) + 10,
    });
  }
  await touchTrainingDraft(pathId, actorUserId);
}

export async function deleteHelpTrainingMedia(
  actorUserId: string,
  pathId: string,
  stepId: string,
  mediaId: string,
): Promise<void> {
  const step = await getTrainingStepRow(stepId);
  if (!step || step.pathId !== pathId) throw new Error("TRAINING_STEP_NOT_FOUND");
  await getDatabase()
    .delete(helpTrainingStepMedia)
    .where(and(eq(helpTrainingStepMedia.id, mediaId), eq(helpTrainingStepMedia.stepId, stepId)));
  await touchTrainingDraft(pathId, actorUserId);
}

export async function updateHelpTrainingFailureReason(
  actorUserId: string,
  pathId: string,
  stepId: string,
  reasonId: string,
  input: { label: string; recoveryMessage: string },
): Promise<void> {
  const step = await getTrainingStepRow(stepId);
  if (!step || step.pathId !== pathId) throw new Error("TRAINING_STEP_NOT_FOUND");
  await getDatabase()
    .update(helpTrainingFailureReasons)
    .set({
      label: input.label.trim().slice(0, 180),
      recoveryMessage: input.recoveryMessage.trim().slice(0, 4000),
      updatedAt: new Date(),
    })
    .where(and(eq(helpTrainingFailureReasons.id, reasonId), eq(helpTrainingFailureReasons.stepId, stepId)));
  await touchTrainingDraft(pathId, actorUserId);
}

async function buildTrainingSnapshot(pathId: string, version: number): Promise<HelpTrainingSnapshot> {
  const path = await getHelpTrainingPath(pathId);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.steps.length === 0) throw new Error("TRAINING_STEP_REQUIRED");

  const steps = path.steps.map((step) => {
    if (!step.title.trim() || !step.instruction.trim() || !step.expectedResult.trim()) {
      throw new Error("TRAINING_STEP_INCOMPLETE");
    }
    const images = step.media
      .filter((media) => media.mediaType === "image" && media.assetId)
      .map((media) => ({ assetId: media.assetId as string, altText: media.altText }));
    const video = step.media.find((media) => media.mediaType === "video" && media.sourceUrl);
    if (video?.sourceUrl) assertHttpUrl(video.sourceUrl);
    return {
      id: step.id,
      title: step.title,
      instruction: step.instruction,
      expectedResult: step.expectedResult,
      successMessage: step.successMessage,
      estimatedSeconds: step.estimatedSeconds,
      sourceContentStepId: step.sourceContentStepId,
      videoStartSeconds: step.videoStartSeconds,
      images,
      videoUrl: video?.sourceUrl ?? null,
      failureReasons: step.failureReasons.map((reason) => ({
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
    sourceContent: path.sourcePublicationSnapshot,
    steps,
  };
}

export async function publishHelpTrainingPath(actorUserId: string, pathId: string): Promise<number> {
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

export async function archiveHelpTrainingPath(actorUserId: string, pathId: string): Promise<void> {
  const path = await getTrainingPathRow(pathId);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.currentVersion < 1) throw new Error("TRAINING_NEVER_PUBLISHED");
  await getDatabase()
    .update(helpTrainingPaths)
    .set({ status: "archived", updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(helpTrainingPaths.id, pathId));
  await recordAuditEvent({
    actorUserId,
    action: "help.training.archived",
    entityType: "help_training_path",
    entityId: pathId,
    metadata: { version: path.currentVersion },
  });
}

export async function createHelpTrainingInvite(
  actorUserId: string,
  pathId: string,
  input: { name: string; email: string; organizationName: string },
) {
  const db = getDatabase();
  const path = await getTrainingPathRow(pathId);
  if (!path || path.currentVersion < 1 || path.status === "archived") {
    throw new Error("TRAINING_NOT_AVAILABLE_FOR_INVITE");
  }
  const [version] = await db
    .select({ id: helpTrainingVersions.id })
    .from(helpTrainingVersions)
    .where(and(eq(helpTrainingVersions.pathId, pathId), eq(helpTrainingVersions.version, path.currentVersion)))
    .limit(1);
  if (!version) throw new Error("TRAINING_VERSION_NOT_FOUND");
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
  const [invite] = await db
    .insert(helpTrainingInvites)
    .values({
      pathId,
      versionId: version.id,
      participantName: input.name.trim(),
      participantEmail: input.email.trim().toLowerCase(),
      organizationName: input.organizationName.trim(),
      tokenHash: sha256(rawToken),
      expiresAt,
      createdBy: actorUserId,
    })
    .returning({ id: helpTrainingInvites.id });
  if (!invite) throw new Error("TRAINING_INVITE_NOT_CREATED");

  await recordAuditEvent({
    actorUserId,
    action: "help.training.invited",
    entityType: "help_training_invite",
    entityId: invite.id,
    metadata: { pathId, version: path.currentVersion, email: input.email.trim().toLowerCase() },
  });
  return { inviteId: invite.id, token: rawToken, expiresAt, title: path.title };
}

export async function consumeHelpTrainingInvite(rawToken: string) {
  const db = getDatabase();
  const tokenHash = sha256(rawToken);
  const [invite] = await db
    .select()
    .from(helpTrainingInvites)
    .where(eq(helpTrainingInvites.tokenHash, tokenHash))
    .limit(1);
  if (!invite || invite.revokedAt || invite.expiresAt <= new Date()) throw new Error("TRAINING_INVITE_INVALID");
  if (invite.consumedAt) throw new Error("TRAINING_INVITE_ALREADY_USED");

  const rawSessionToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const [session] = await db.transaction(async (tx) => {
    await tx
      .update(helpTrainingInvites)
      .set({ consumedAt: now })
      .where(and(eq(helpTrainingInvites.id, invite.id), eq(helpTrainingInvites.tokenHash, tokenHash)));
    return tx
      .insert(helpTrainingSessions)
      .values({
        inviteId: invite.id,
        sessionTokenHash: sha256(rawSessionToken),
        expiresAt,
      })
      .returning({ id: helpTrainingSessions.id });
  });
  if (!session) throw new Error("TRAINING_SESSION_NOT_CREATED");
  await db.insert(helpTrainingEvents).values({ sessionId: session.id, eventType: "invite_opened" });
  return { sessionId: session.id, sessionToken: rawSessionToken, expiresAt };
}

export async function getHelpTrainingSession(rawSessionToken: string) {
  const db = getDatabase();
  const [session] = await db
    .select()
    .from(helpTrainingSessions)
    .where(eq(helpTrainingSessions.sessionTokenHash, sha256(rawSessionToken)))
    .limit(1);
  if (!session || session.expiresAt <= new Date()) return null;

  const [invite] = await db
    .select()
    .from(helpTrainingInvites)
    .where(eq(helpTrainingInvites.id, session.inviteId))
    .limit(1);
  if (!invite || invite.revokedAt) return null;
  const [version] = await db
    .select()
    .from(helpTrainingVersions)
    .where(eq(helpTrainingVersions.id, invite.versionId))
    .limit(1);
  if (!version) return null;

  const currentStep = version.snapshot.steps[session.currentStepIndex] ?? null;
  const [progress] = currentStep
    ? await db
        .select()
        .from(helpTrainingStepProgress)
        .where(
          and(
            eq(helpTrainingStepProgress.sessionId, session.id),
            eq(helpTrainingStepProgress.stepKey, currentStep.id),
          ),
        )
        .limit(1)
    : [];

  await db
    .update(helpTrainingSessions)
    .set({ lastActivityAt: new Date() })
    .where(eq(helpTrainingSessions.id, session.id));

  return {
    session,
    invite,
    version,
    snapshot: version.snapshot,
    currentStep,
    progress: progress ?? null,
    completed: Boolean(session.completedAt) || session.currentStepIndex >= version.snapshot.steps.length,
  };
}

export async function startHelpTrainingSession(rawSessionToken: string): Promise<void> {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state) throw new Error("TRAINING_SESSION_INVALID");
  if (state.session.startedAt) return;
  const now = new Date();
  await getDatabase().transaction(async (tx) => {
    await tx
      .update(helpTrainingSessions)
      .set({ startedAt: now, lastActivityAt: now })
      .where(eq(helpTrainingSessions.id, state.session.id));
    await tx.insert(helpTrainingEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep?.id ?? null,
      eventType: "training_started",
    });
  });
}

export async function completeHelpTrainingStep(rawSessionToken: string) {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("TRAINING_SESSION_INVALID");
  const db = getDatabase();
  const now = new Date();
  const nextIndex = state.session.currentStepIndex + 1;
  const completed = nextIndex >= state.snapshot.steps.length;

  await db.transaction(async (tx) => {
    await tx
      .insert(helpTrainingStepProgress)
      .values({
        sessionId: state.session.id,
        stepKey: state.currentStep.id,
        status: "succeeded",
        attemptCount: Math.max(1, (state.progress?.attemptCount ?? 0) + 1),
        completedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [helpTrainingStepProgress.sessionId, helpTrainingStepProgress.stepKey],
        set: {
          status: "succeeded",
          attemptCount: sql`${helpTrainingStepProgress.attemptCount} + 1`,
          completedAt: now,
          updatedAt: now,
        },
      });
    await tx
      .update(helpTrainingSessions)
      .set({
        currentStepIndex: nextIndex,
        completedAt: completed ? now : null,
        lastActivityAt: now,
      })
      .where(eq(helpTrainingSessions.id, state.session.id));
    await tx.insert(helpTrainingEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep.id,
      eventType: completed ? "training_completed" : "step_succeeded",
      metadata: { nextStepIndex: nextIndex },
    });
  });

  return { completed, successMessage: state.currentStep.successMessage };
}

export async function reportHelpTrainingFailure(
  rawSessionToken: string,
  input: { reasonKey: string; detail: string },
) {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("TRAINING_SESSION_INVALID");
  const reason = state.currentStep.failureReasons.find((item) => item.key === input.reasonKey);
  if (!reason) throw new Error("TRAINING_FAILURE_REASON_INVALID");
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
        failureReasonKey: reason.key,
        failureDetail: input.detail.trim().slice(0, 4000),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [helpTrainingStepProgress.sessionId, helpTrainingStepProgress.stepKey],
        set: {
          status: "blocked",
          attemptCount: sql`${helpTrainingStepProgress.attemptCount} + 1`,
          failureReasonKey: reason.key,
          failureDetail: input.detail.trim().slice(0, 4000),
          updatedAt: now,
        },
      });
    await tx.insert(helpTrainingEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep!.id,
      eventType: "step_failed",
      metadata: { reasonKey: reason.key },
    });
  });
  return reason;
}

async function findOrCreateTrainingContact(name: string, email: string) {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const [existing] = await db
    .select({ id: customerContacts.id })
    .from(customerContacts)
    .where(and(eq(customerContacts.email, normalizedEmail), eq(customerContacts.active, true)))
    .limit(1);
  if (existing) return existing.id;
  const [created] = await db
    .insert(customerContacts)
    .values({ name: name.trim(), email: normalizedEmail })
    .returning({ id: customerContacts.id });
  if (!created) throw new Error("TRAINING_CONTACT_NOT_CREATED");
  return created.id;
}

export async function requestHelpForTrainingStep(rawSessionToken: string, detail: string) {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state || !state.currentStep) throw new Error("TRAINING_SESSION_INVALID");
  if (state.session.supportTicketId) return { ticketId: state.session.supportTicketId, reused: true };
  const db = getDatabase();
  const path = await getTrainingPathRow(state.snapshot.pathId);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  let queueId = path.supportQueueId;
  if (!queueId) {
    const [queue] = await db
      .select({ id: supportQueues.id })
      .from(supportQueues)
      .where(and(eq(supportQueues.code, "support"), eq(supportQueues.active, true)))
      .limit(1);
    queueId = queue?.id ?? null;
  }
  if (!queueId) throw new Error("TRAINING_SUPPORT_QUEUE_NOT_CONFIGURED");
  const contactId = await findOrCreateTrainingContact(
    state.invite.participantName,
    state.invite.participantEmail,
  );
  const failureLabel = state.progress?.failureReasonKey
    ? state.currentStep.failureReasons.find((reason) => reason.key === state.progress?.failureReasonKey)?.label
    : null;
  const body = [
    "Solicitação de ajuda originada em uma Trilha F10.",
    `Participante: ${state.invite.participantName} <${state.invite.participantEmail}>`,
    state.invite.organizationName ? `Empresa: ${state.invite.organizationName}` : "",
    `Trilha: ${state.snapshot.title} · versão ${state.snapshot.version}`,
    `Microação atual: ${state.currentStep.title}`,
    failureLabel ? `Motivo informado: ${failureLabel}` : "",
    state.progress ? `Tentativas registradas: ${state.progress.attemptCount}` : "",
    detail.trim() ? `Detalhes: ${detail.trim().slice(0, 4000)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const now = new Date();

  const [ticket] = await db.transaction(async (tx) => {
    const created = await tx
      .insert(tickets)
      .values({
        customerContactId: contactId,
        queueId: queueId as string,
        subject: `Treinamento: ${state.snapshot.title} — ${state.currentStep!.title}`.slice(0, 240),
        status: "new",
        priority: "normal",
        channel: "portal",
      })
      .returning({ id: tickets.id, ticketNumber: tickets.ticketNumber });
    if (!created[0]) throw new Error("TRAINING_SUPPORT_TICKET_NOT_CREATED");
    await tx.insert(ticketMessages).values({
      ticketId: created[0].id,
      authorType: "customer",
      customerContactId: contactId,
      visibility: "public",
      channel: "portal",
      body,
    });
    await tx.insert(ticketEvents).values({
      ticketId: created[0].id,
      eventType: "training.help_requested",
      metadata: {
        trainingPathId: state.snapshot.pathId,
        trainingVersion: state.snapshot.version,
        trainingSessionId: state.session.id,
        trainingStepId: state.currentStep!.id,
      },
    });
    await tx
      .update(helpTrainingSessions)
      .set({ supportTicketId: created[0].id, lastActivityAt: now })
      .where(eq(helpTrainingSessions.id, state.session.id));
    await tx
      .insert(helpTrainingStepProgress)
      .values({
        sessionId: state.session.id,
        stepKey: state.currentStep!.id,
        status: "help_requested",
        attemptCount: Math.max(1, state.progress?.attemptCount ?? 1),
        failureReasonKey: state.progress?.failureReasonKey ?? null,
        failureDetail: detail.trim().slice(0, 4000),
        helpTicketId: created[0].id,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [helpTrainingStepProgress.sessionId, helpTrainingStepProgress.stepKey],
        set: {
          status: "help_requested",
          failureDetail: detail.trim().slice(0, 4000),
          helpTicketId: created[0].id,
          updatedAt: now,
        },
      });
    await tx.insert(helpTrainingEvents).values({
      sessionId: state.session.id,
      stepKey: state.currentStep!.id,
      eventType: "human_help_requested",
      metadata: { ticketId: created[0].id, ticketNumber: created[0].ticketNumber },
    });
    return created;
  });

  return { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, reused: false };
}

export async function listHelpTrainingParticipants(pathId: string) {
  const db = getDatabase();
  const rows = await db
    .select({
      inviteId: helpTrainingInvites.id,
      name: helpTrainingInvites.participantName,
      email: helpTrainingInvites.participantEmail,
      organizationName: helpTrainingInvites.organizationName,
      inviteCreatedAt: helpTrainingInvites.createdAt,
      inviteExpiresAt: helpTrainingInvites.expiresAt,
      consumedAt: helpTrainingInvites.consumedAt,
      version: helpTrainingVersions.version,
      snapshot: helpTrainingVersions.snapshot,
      sessionId: helpTrainingSessions.id,
      currentStepIndex: helpTrainingSessions.currentStepIndex,
      startedAt: helpTrainingSessions.startedAt,
      completedAt: helpTrainingSessions.completedAt,
      lastActivityAt: helpTrainingSessions.lastActivityAt,
      supportTicketId: helpTrainingSessions.supportTicketId,
    })
    .from(helpTrainingInvites)
    .innerJoin(helpTrainingVersions, eq(helpTrainingVersions.id, helpTrainingInvites.versionId))
    .leftJoin(helpTrainingSessions, eq(helpTrainingSessions.inviteId, helpTrainingInvites.id))
    .where(eq(helpTrainingInvites.pathId, pathId))
    .orderBy(desc(helpTrainingInvites.createdAt));

  return Promise.all(
    rows.map(async (row) => {
      const progress = row.sessionId
        ? await db
            .select({ status: helpTrainingStepProgress.status, attemptCount: helpTrainingStepProgress.attemptCount })
            .from(helpTrainingStepProgress)
            .where(eq(helpTrainingStepProgress.sessionId, row.sessionId))
        : [];
      const currentStep = row.snapshot.steps[row.currentStepIndex ?? 0] ?? null;
      return {
        ...row,
        totalSteps: row.snapshot.steps.length,
        completedSteps: progress.filter((item) => item.status === "succeeded").length,
        failureCount: progress.reduce((sum, item) => sum + Math.max(0, item.attemptCount - (item.status === "succeeded" ? 1 : 0)), 0),
        currentStepTitle: currentStep?.title ?? null,
        status: row.completedAt ? "completed" : row.startedAt ? "in_progress" : row.consumedAt ? "opened" : "invited",
      };
    }),
  );
}

export async function getHelpTrainingInsights(pathId: string) {
  const db = getDatabase();
  const participants = await listHelpTrainingParticipants(pathId);
  const path = await getTrainingPathRow(pathId);
  const latestVersion = path && path.currentVersion > 0
    ? await db
        .select({ snapshot: helpTrainingVersions.snapshot })
        .from(helpTrainingVersions)
        .where(and(eq(helpTrainingVersions.pathId, pathId), eq(helpTrainingVersions.version, path.currentVersion)))
        .limit(1)
    : [];
  const snapshot = latestVersion[0]?.snapshot ?? null;
  const stepStats = new Map<string, { failures: number; helpRequests: number }>();
  const reasonCounts = new Map<string, number>();

  const sessionIds = participants.flatMap((participant) => (participant.sessionId ? [participant.sessionId] : []));
  for (const sessionId of sessionIds) {
    const rows = await db
      .select({
        stepKey: helpTrainingStepProgress.stepKey,
        status: helpTrainingStepProgress.status,
        attemptCount: helpTrainingStepProgress.attemptCount,
        failureReasonKey: helpTrainingStepProgress.failureReasonKey,
      })
      .from(helpTrainingStepProgress)
      .where(eq(helpTrainingStepProgress.sessionId, sessionId));
    for (const row of rows) {
      const current = stepStats.get(row.stepKey) ?? { failures: 0, helpRequests: 0 };
      current.failures += Math.max(0, row.attemptCount - (row.status === "succeeded" ? 1 : 0));
      if (row.status === "help_requested") current.helpRequests += 1;
      stepStats.set(row.stepKey, current);
      if (row.failureReasonKey) {
        reasonCounts.set(row.failureReasonKey, (reasonCounts.get(row.failureReasonKey) ?? 0) + 1);
      }
    }
  }

  const stepRanking = (snapshot?.steps ?? [])
    .map((step) => ({
      stepId: step.id,
      title: step.title,
      failures: stepStats.get(step.id)?.failures ?? 0,
      helpRequests: stepStats.get(step.id)?.helpRequests ?? 0,
    }))
    .sort((a, b) => b.failures - a.failures || b.helpRequests - a.helpRequests);
  const reasonLabels = new Map(
    (snapshot?.steps ?? []).flatMap((step) => step.failureReasons.map((reason) => [reason.key, reason.label] as const)),
  );
  const reasonRanking = Array.from(reasonCounts.entries())
    .map(([key, occurrences]) => ({ key, label: reasonLabels.get(key) ?? key, occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences);

  return {
    invited: participants.length,
    started: participants.filter((participant) => participant.startedAt).length,
    completed: participants.filter((participant) => participant.completedAt).length,
    humanHelp: participants.filter((participant) => participant.supportTicketId).length,
    stepRanking,
    reasonRanking,
  };
}

export async function trainingSessionCanReadAsset(rawSessionToken: string, assetId: string): Promise<boolean> {
  const state = await getHelpTrainingSession(rawSessionToken);
  if (!state) return false;
  return state.snapshot.steps.some((step) => step.images.some((image) => image.assetId === assetId));
}
