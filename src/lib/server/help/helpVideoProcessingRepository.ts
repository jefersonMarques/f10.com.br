import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpVideoProcessingEvents,
  helpVideoProcessingJobs,
  helpVideoProcessingParts,
  type HelpVideoProcessingEventType,
  type HelpVideoProcessingJobStatus,
  type HelpVideoProcessingOperation,
} from "$lib/server/db/helpVideoProcessingSchema";
import { helpContents } from "$lib/server/db/structuredHelpSchema";
import { readManagedHelpAsset } from "$lib/server/help/helpAssetRepository";
import {
  findImportedHelpVideoByChecksum,
} from "$lib/server/help/helpImportedFeaturedVideo";
import {
  HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES,
  type HelpVideoAutomationCheckpoint,
} from "$lib/server/help/helpVideoImportAutomation";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";
import {
  deleteAssetObject,
  getAssetObject,
  putAssetObject,
} from "$lib/server/storage/assetStorage";

const ACTIVE_STATUSES: HelpVideoProcessingJobStatus[] = [
  "queued",
  "running",
  "retry_waiting",
];
const TERMINAL_STATUSES: HelpVideoProcessingJobStatus[] = [
  "completed",
  "failed",
];
const RECENT_JOB_VISIBILITY_MS = 30 * 60 * 1_000;
const GLOBAL_JOB_LIMIT = 8;
const EVENT_HISTORY_LIMIT = 60;
const LEASE_MS = 90 * 1_000;

export type HelpVideoProcessingSource =
  | { type: "current" }
  | {
      type: "upload";
      fileName: string;
      mimeType: string;
      bytes: Uint8Array;
    };

export type HelpVideoProcessingJob = typeof helpVideoProcessingJobs.$inferSelect;
type CompletedArticlePart = NonNullable<
  NonNullable<HelpVideoAutomationCheckpoint["article"]>["completedParts"]
>[number];

export type HelpVideoProcessingJobView = {
  id: string;
  contentId: string;
  operation: HelpVideoProcessingOperation;
  status: HelpVideoProcessingJobStatus;
  stage: string;
  progressLabel: string;
  progressDetail: string;
  attemptCount: number;
  maxAttempts: number;
  completedParts: number;
  totalParts: number | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type HelpVideoProcessingJobSummary = HelpVideoProcessingJobView & {
  contentTitle: string;
};

export type HelpVideoProcessingEventView = {
  id: string;
  eventType: HelpVideoProcessingEventType;
  stage: string;
  status: HelpVideoProcessingJobStatus;
  label: string;
  detail: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type HelpVideoProcessingJobDetails = HelpVideoProcessingJobView & {
  events: HelpVideoProcessingEventView[];
};

function retryDelayMs(attemptCount: number): number {
  const seconds = Math.min(30 * 2 ** Math.max(0, attemptCount - 1), 5 * 60);
  return seconds * 1_000;
}

async function appendHelpVideoProcessingEvent(input: {
  jobId: string;
  eventType: HelpVideoProcessingEventType;
  stage: string;
  status: HelpVideoProcessingJobStatus;
  label: string;
  detail?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await getDatabase()
      .insert(helpVideoProcessingEvents)
      .values({
        jobId: input.jobId,
        eventType: input.eventType,
        stage: input.stage.slice(0, 80),
        status: input.status,
        label: input.label.slice(0, 500),
        detail: input.detail?.slice(0, 2_000) ?? "",
        metadata: input.metadata ?? {},
      });
  } catch (cause) {
    console.error("[help-video-processing] event persistence failed", {
      jobId: input.jobId,
      eventType: input.eventType,
      cause,
    });
  }
}

function toEventView(
  event: typeof helpVideoProcessingEvents.$inferSelect,
): HelpVideoProcessingEventView {
  return {
    id: event.id,
    eventType: event.eventType,
    stage: event.stage,
    status: event.status,
    label: event.label,
    detail: event.detail,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}

function checkpointTotalParts(job: HelpVideoProcessingJob): number | null {
  const checkpoint = job.checkpoint as HelpVideoAutomationCheckpoint;
  const totalParts = checkpoint.article?.totalParts;
  return typeof totalParts === "number"
    && Number.isInteger(totalParts)
    && totalParts > 0
    ? totalParts
    : null;
}

function toView(
  job: HelpVideoProcessingJob,
  completedParts: number,
): HelpVideoProcessingJobView {
  return {
    id: job.id,
    contentId: job.contentId,
    operation: job.operation,
    status: job.status,
    stage: job.stage,
    progressLabel: job.progressLabel,
    progressDetail: job.progressDetail,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    completedParts,
    totalParts: checkpointTotalParts(job),
    lastErrorCode: job.lastErrorCode,
    lastErrorMessage: job.lastErrorMessage,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
  };
}

async function completedPartCount(jobId: string): Promise<number> {
  const [row] = await getDatabase()
    .select({ value: count() })
    .from(helpVideoProcessingParts)
    .where(eq(helpVideoProcessingParts.jobId, jobId));
  return Number(row?.value ?? 0);
}

export async function getHelpVideoProcessingJobView(
  jobId: string,
): Promise<HelpVideoProcessingJobView | null> {
  const [job] = await getDatabase()
    .select()
    .from(helpVideoProcessingJobs)
    .where(eq(helpVideoProcessingJobs.id, jobId))
    .limit(1);
  if (!job) return null;
  return toView(job, await completedPartCount(job.id));
}

export async function getLatestHelpVideoProcessingJobView(
  contentId: string,
): Promise<HelpVideoProcessingJobView | null> {
  const [job] = await getDatabase()
    .select()
    .from(helpVideoProcessingJobs)
    .where(eq(helpVideoProcessingJobs.contentId, contentId))
    .orderBy(desc(helpVideoProcessingJobs.createdAt))
    .limit(1);
  if (!job) return null;
  return toView(job, await completedPartCount(job.id));
}

export async function listHelpVideoProcessingJobSummaries(
  actorUserId: string,
): Promise<HelpVideoProcessingJobSummary[]> {
  const db = getDatabase();
  const recentCutoff = new Date(Date.now() - RECENT_JOB_VISIBILITY_MS);
  const jobs = await db
    .select()
    .from(helpVideoProcessingJobs)
    .where(
      and(
        eq(helpVideoProcessingJobs.actorUserId, actorUserId),
        or(
          inArray(helpVideoProcessingJobs.status, ACTIVE_STATUSES),
          and(
            inArray(helpVideoProcessingJobs.status, TERMINAL_STATUSES),
            gte(helpVideoProcessingJobs.updatedAt, recentCutoff),
          ),
        ),
      ),
    )
    .orderBy(desc(helpVideoProcessingJobs.updatedAt))
    .limit(GLOBAL_JOB_LIMIT);

  if (jobs.length === 0) return [];

  const jobIds = jobs.map((job) => job.id);
  const contentIds = Array.from(new Set(jobs.map((job) => job.contentId)));
  const [partRows, contentRows] = await Promise.all([
    db
      .select({
        jobId: helpVideoProcessingParts.jobId,
        value: count(),
      })
      .from(helpVideoProcessingParts)
      .where(inArray(helpVideoProcessingParts.jobId, jobIds))
      .groupBy(helpVideoProcessingParts.jobId),
    db
      .select({
        id: helpContents.id,
        title: helpContents.title,
      })
      .from(helpContents)
      .where(inArray(helpContents.id, contentIds)),
  ]);

  const partCounts = new Map(
    partRows.map((row) => [row.jobId, Number(row.value)]),
  );
  const contentTitles = new Map(
    contentRows.map((row) => [row.id, row.title]),
  );

  return jobs.map((job) => ({
    ...toView(job, partCounts.get(job.id) ?? 0),
    contentTitle: contentTitles.get(job.contentId) ?? "Conteúdo",
  }));
}

export async function listLatestHelpVideoProcessingJobDetails(
  contentIds: string[],
): Promise<HelpVideoProcessingJobDetails[]> {
  if (contentIds.length === 0) return [];

  const db = getDatabase();
  const jobs = await db
    .selectDistinctOn([helpVideoProcessingJobs.contentId])
    .from(helpVideoProcessingJobs)
    .where(inArray(helpVideoProcessingJobs.contentId, contentIds))
    .orderBy(
      helpVideoProcessingJobs.contentId,
      desc(helpVideoProcessingJobs.createdAt),
    );

  if (jobs.length === 0) return [];

  const jobIds = jobs.map((job) => job.id);
  const [partRows, eventRows] = await Promise.all([
    db
      .select({
        jobId: helpVideoProcessingParts.jobId,
        value: count(),
      })
      .from(helpVideoProcessingParts)
      .where(inArray(helpVideoProcessingParts.jobId, jobIds))
      .groupBy(helpVideoProcessingParts.jobId),
    db
      .select()
      .from(helpVideoProcessingEvents)
      .where(inArray(helpVideoProcessingEvents.jobId, jobIds))
      .orderBy(
        asc(helpVideoProcessingEvents.createdAt),
        asc(helpVideoProcessingEvents.id),
      ),
  ]);

  const partCounts = new Map(
    partRows.map((row) => [row.jobId, Number(row.value)]),
  );
  const eventsByJobId = new Map<string, HelpVideoProcessingEventView[]>();
  for (const event of eventRows) {
    const current = eventsByJobId.get(event.jobId) ?? [];
    current.push(toEventView(event));
    eventsByJobId.set(event.jobId, current);
  }

  return jobs.map((job) => ({
    ...toView(job, partCounts.get(job.id) ?? 0),
    events: (eventsByJobId.get(job.id) ?? []).slice(-EVENT_HISTORY_LIMIT),
  }));
}

export async function getActiveHelpVideoProcessingJob(
  contentId: string,
): Promise<HelpVideoProcessingJob | null> {
  const [job] = await getDatabase()
    .select()
    .from(helpVideoProcessingJobs)
    .where(
      and(
        eq(helpVideoProcessingJobs.contentId, contentId),
        inArray(helpVideoProcessingJobs.status, ACTIVE_STATUSES),
      ),
    )
    .orderBy(desc(helpVideoProcessingJobs.createdAt))
    .limit(1);
  return job ?? null;
}

export async function createHelpVideoProcessingJob(input: {
  actorUserId: string;
  contentId: string;
  source: HelpVideoProcessingSource;
  operation?: HelpVideoProcessingOperation;
  importExternalId?: string;
}): Promise<HelpVideoProcessingJobView> {
  const existing = await getActiveHelpVideoProcessingJob(input.contentId);
  if (existing) return toView(existing, await completedPartCount(existing.id));

  const current = await getStructuredHelpContent(input.contentId);
  if (!current) throw new Error("CONTENT_NOT_FOUND");
  if (current.status === "archived") throw new Error("CONTENT_ARCHIVED");

  const id = randomUUID();
  let sourceAssetId: string | null = null;
  let sourceStorageKey: string | null = null;
  let sourceFileName = "video.mp4";
  let sourceMimeType = "video/mp4";

  if (input.source.type === "current") {
    if (!current.featuredVideo?.id || !current.featuredVideo.storageKey) {
      throw new Error("HELP_VIDEO_LOCAL_COPY_REQUIRED");
    }
    sourceAssetId = current.featuredVideo.id;
    sourceFileName = current.featuredVideo.originalName || "video-atual.mp4";
    sourceMimeType = current.featuredVideo.mimeType || "video/mp4";
  } else {
    if (
      input.source.bytes.byteLength < 1
      || input.source.bytes.byteLength > HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES
    ) {
      throw new Error("HELP_VIDEO_UPLOAD_SIZE_INVALID");
    }
    const duplicate = await findImportedHelpVideoByChecksum(
      input.source.bytes,
      input.contentId,
    );
    if (duplicate?.contentId && duplicate.contentId !== input.contentId) {
      throw new Error(`HELP_VIDEO_ALREADY_USED:${duplicate.contentId}`);
    }

    sourceFileName = input.source.fileName.trim().slice(0, 240) || "video.mp4";
    sourceMimeType = input.source.mimeType.trim().slice(0, 120) || "video/mp4";
    sourceStorageKey = `help/processing/${id}/source.mp4`;
    await putAssetObject(
      sourceStorageKey,
      input.source.bytes,
      "video/mp4",
    );
  }

  try {
    const [job] = await getDatabase()
      .insert(helpVideoProcessingJobs)
      .values({
        id,
        contentId: input.contentId,
        actorUserId: input.actorUserId,
        sourceKind: input.source.type,
        operation: input.operation ?? "regenerate",
        importExternalId: input.importExternalId?.trim().slice(0, 240) || null,
        sourceAssetId,
        sourceStorageKey,
        sourceFileName,
        sourceMimeType,
        status: "queued",
        stage: "queued",
        progressLabel: "Aguardando processamento",
        progressDetail: "O servidor continuará mesmo com a tela fechada.",
      })
      .returning();
    if (!job) throw new Error("HELP_VIDEO_PROCESSING_JOB_NOT_CREATED");
    await appendHelpVideoProcessingEvent({
      jobId: job.id,
      eventType: "queued",
      stage: "queued",
      status: "queued",
      label: "Vídeo recebido",
      detail: input.operation === "import"
        ? "O conteúdo entrou na fila para criação do rascunho."
        : "O conteúdo entrou na fila para atualização.",
    });
    return toView(job, 0);
  } catch (cause) {
    if (sourceStorageKey) {
      await deleteAssetObject(sourceStorageKey).catch(() => undefined);
    }
    const active = await getActiveHelpVideoProcessingJob(input.contentId)
      .catch(() => null);
    if (active) return toView(active, await completedPartCount(active.id));
    throw cause;
  }
}

export async function recoverStaleHelpVideoProcessingJobs(): Promise<void> {
  const db = getDatabase();
  const now = new Date();

  const exhaustedWaiting = await db
    .update(helpVideoProcessingJobs)
    .set({
      status: "failed",
      stage: "failed",
      progressLabel: "Limite de tentativas atingido",
      progressDetail: "O processamento foi interrompido e precisa de uma retomada manual.",
      nextAttemptAt: null,
      leaseExpiresAt: null,
      lastErrorCode: "HELP_VIDEO_MAX_ATTEMPTS_REACHED",
      lastErrorMessage: "O limite automático de tentativas foi atingido.",
      updatedAt: now,
    })
    .where(
      and(
        eq(helpVideoProcessingJobs.status, "retry_waiting"),
        sql`${helpVideoProcessingJobs.attemptCount} >= ${helpVideoProcessingJobs.maxAttempts}`,
      ),
    )
    .returning();

  const exhaustedRunning = await db
    .update(helpVideoProcessingJobs)
    .set({
      status: "failed",
      stage: "failed",
      progressLabel: "Processamento interrompido",
      progressDetail: "O worker parou durante a última tentativa permitida.",
      nextAttemptAt: null,
      leaseExpiresAt: null,
      lastErrorCode: "HELP_VIDEO_WORKER_INTERRUPTED",
      lastErrorMessage: "O worker deixou de responder durante a última tentativa automática.",
      updatedAt: now,
    })
    .where(
      and(
        eq(helpVideoProcessingJobs.status, "running"),
        isNotNull(helpVideoProcessingJobs.leaseExpiresAt),
        lte(helpVideoProcessingJobs.leaseExpiresAt, now),
        sql`${helpVideoProcessingJobs.attemptCount} >= ${helpVideoProcessingJobs.maxAttempts}`,
      ),
    )
    .returning();

  const recoverableRunning = await db
    .update(helpVideoProcessingJobs)
    .set({
      status: "retry_waiting",
      stage: "resume",
      progressLabel: "Retomando processamento interrompido",
      progressDetail: "O worker continuará a partir do último checkpoint.",
      nextAttemptAt: now,
      leaseExpiresAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(helpVideoProcessingJobs.status, "running"),
        isNotNull(helpVideoProcessingJobs.leaseExpiresAt),
        lte(helpVideoProcessingJobs.leaseExpiresAt, now),
        sql`${helpVideoProcessingJobs.attemptCount} < ${helpVideoProcessingJobs.maxAttempts}`,
      ),
    )
    .returning();

  for (const job of [...exhaustedWaiting, ...exhaustedRunning]) {
    await appendHelpVideoProcessingEvent({
      jobId: job.id,
      eventType: "failed",
      stage: "failed",
      status: "failed",
      label: job.progressLabel,
      detail: job.progressDetail,
      metadata: {
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
      },
    });
  }

  for (const job of recoverableRunning) {
    await appendHelpVideoProcessingEvent({
      jobId: job.id,
      eventType: "retry_scheduled",
      stage: "resume",
      status: "retry_waiting",
      label: "Processamento será retomado",
      detail: `Checkpoint preservado · tentativa ${job.attemptCount} de ${job.maxAttempts}.`,
      metadata: {
        attemptCount: job.attemptCount,
        maxAttempts: job.maxAttempts,
      },
    });
  }
}

export async function claimNextHelpVideoProcessingJob(): Promise<
  HelpVideoProcessingJob | null
> {
  const db = getDatabase();
  const now = new Date();
  const [candidate] = await db
    .select()
    .from(helpVideoProcessingJobs)
    .where(
      and(
        or(
          eq(helpVideoProcessingJobs.status, "queued"),
          and(
            eq(helpVideoProcessingJobs.status, "retry_waiting"),
            or(
              isNull(helpVideoProcessingJobs.nextAttemptAt),
              lte(helpVideoProcessingJobs.nextAttemptAt, now),
            ),
          ),
        ),
        sql`${helpVideoProcessingJobs.attemptCount} < ${helpVideoProcessingJobs.maxAttempts}`,
      ),
    )
    .orderBy(asc(helpVideoProcessingJobs.createdAt))
    .limit(1);
  if (!candidate) return null;

  const [claimed] = await db
    .update(helpVideoProcessingJobs)
    .set({
      status: "running",
      stage: candidate.stage === "queued" ? "starting" : "resume",
      progressLabel:
        candidate.stage === "queued"
          ? "Iniciando processamento"
          : "Retomando do último checkpoint",
      progressDetail: "",
      attemptCount: sql`${helpVideoProcessingJobs.attemptCount} + 1`,
      heartbeatAt: now,
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      nextAttemptAt: null,
      startedAt: candidate.startedAt ?? now,
      updatedAt: now,
    })
    .where(
      and(
        eq(helpVideoProcessingJobs.id, candidate.id),
        inArray(helpVideoProcessingJobs.status, ["queued", "retry_waiting"]),
        sql`${helpVideoProcessingJobs.attemptCount} < ${helpVideoProcessingJobs.maxAttempts}`,
      ),
    )
    .returning();
  if (!claimed) return null;

  const resumed = claimed.attemptCount > 1 || candidate.stage !== "queued";
  await appendHelpVideoProcessingEvent({
    jobId: claimed.id,
    eventType: resumed ? "resumed" : "started",
    stage: claimed.stage,
    status: "running",
    label: resumed ? "Processamento retomado" : "Processamento iniciado",
    detail: `Tentativa ${claimed.attemptCount} de ${claimed.maxAttempts}.`,
    metadata: {
      attemptCount: claimed.attemptCount,
      maxAttempts: claimed.maxAttempts,
    },
  });

  return claimed;
}

export async function heartbeatHelpVideoProcessingJob(
  jobId: string,
): Promise<void> {
  const now = new Date();
  await getDatabase()
    .update(helpVideoProcessingJobs)
    .set({
      heartbeatAt: now,
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      updatedAt: now,
    })
    .where(
      and(
        eq(helpVideoProcessingJobs.id, jobId),
        eq(helpVideoProcessingJobs.status, "running"),
      ),
    );
}

export async function updateHelpVideoProcessingProgress(input: {
  jobId: string;
  stage: string;
  label: string;
  detail?: string;
}): Promise<void> {
  const now = new Date();
  const [updated] = await getDatabase()
    .update(helpVideoProcessingJobs)
    .set({
      stage: input.stage.slice(0, 80),
      progressLabel: input.label.slice(0, 500),
      progressDetail: input.detail?.slice(0, 2_000) ?? "",
      heartbeatAt: now,
      leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
      updatedAt: now,
    })
    .where(
      and(
        eq(helpVideoProcessingJobs.id, input.jobId),
        eq(helpVideoProcessingJobs.status, "running"),
      ),
    )
    .returning({
      id: helpVideoProcessingJobs.id,
      stage: helpVideoProcessingJobs.stage,
      status: helpVideoProcessingJobs.status,
      progressLabel: helpVideoProcessingJobs.progressLabel,
      progressDetail: helpVideoProcessingJobs.progressDetail,
    });

  if (!updated) return;
  await appendHelpVideoProcessingEvent({
    jobId: updated.id,
    eventType: "progress",
    stage: updated.stage,
    status: updated.status,
    label: updated.progressLabel,
    detail: updated.progressDetail,
  });
}

function checkpointWithoutParts(
  checkpoint: HelpVideoAutomationCheckpoint,
): Record<string, unknown> {
  return {
    transcript: checkpoint.transcript,
    article: checkpoint.article
      ? {
          metadata: checkpoint.article.metadata,
          totalParts: checkpoint.article.totalParts,
        }
      : undefined,
  };
}

export async function saveHelpVideoProcessingCheckpoint(
  jobId: string,
  checkpoint: HelpVideoAutomationCheckpoint,
): Promise<void> {
  const db = getDatabase();
  const parts = checkpoint.article?.completedParts ?? [];
  const previousPartCount = await completedPartCount(jobId);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(helpVideoProcessingJobs)
      .set({
        checkpoint: checkpointWithoutParts(checkpoint),
        lastErrorCode: null,
        lastErrorMessage: null,
        heartbeatAt: now,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        updatedAt: now,
      })
      .where(eq(helpVideoProcessingJobs.id, jobId));

    for (const part of parts) {
      await tx
        .insert(helpVideoProcessingParts)
        .values({
          jobId,
          partIndex: part.partIndex,
          segmentIds: part.segmentIds,
          payload: { steps: part.steps },
          completedAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            helpVideoProcessingParts.jobId,
            helpVideoProcessingParts.partIndex,
          ],
          set: {
            segmentIds: part.segmentIds,
            payload: { steps: part.steps },
            updatedAt: now,
          },
        });
    }
  });

  if (parts.length > previousPartCount) {
    const totalParts = checkpoint.article?.totalParts ?? null;
    await appendHelpVideoProcessingEvent({
      jobId,
      eventType: "checkpoint",
      stage: "analyze",
      status: "running",
      label: totalParts
        ? `${parts.length} de ${totalParts} partes concluídas`
        : `${parts.length} parte(s) concluída(s)`,
      detail: "Progresso salvo para retomada automática.",
      metadata: {
        completedParts: parts.length,
        totalParts,
      },
    });
  }
}

export async function loadHelpVideoProcessingCheckpoint(
  job: HelpVideoProcessingJob,
): Promise<HelpVideoAutomationCheckpoint> {
  const base = (job.checkpoint ?? {}) as HelpVideoAutomationCheckpoint;
  const parts = await getDatabase()
    .select()
    .from(helpVideoProcessingParts)
    .where(eq(helpVideoProcessingParts.jobId, job.id))
    .orderBy(asc(helpVideoProcessingParts.partIndex));

  const completedParts: CompletedArticlePart[] = parts.flatMap((part) => {
    const steps = (part.payload as { steps?: CompletedArticlePart["steps"] }).steps;
    return Array.isArray(steps)
      ? [{
          partIndex: part.partIndex,
          segmentIds: part.segmentIds,
          steps,
        }]
      : [];
  });

  return {
    transcript: base.transcript,
    article:
      base.article || completedParts.length > 0
        ? {
            ...(base.article ?? {}),
            completedParts,
          }
        : undefined,
  };
}

export async function readHelpVideoProcessingSource(
  job: HelpVideoProcessingJob,
): Promise<{
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
}> {
  if (job.sourceKind === "current") {
    if (!job.sourceAssetId) throw new Error("HELP_VIDEO_LOCAL_COPY_REQUIRED");
    const managed = await readManagedHelpAsset(job.sourceAssetId);
    return {
      bytes: new Uint8Array(await managed.response.arrayBuffer()),
      fileName: managed.asset.originalName || job.sourceFileName,
      mimeType: managed.asset.mimeType || job.sourceMimeType,
    };
  }

  if (!job.sourceStorageKey) throw new Error("HELP_VIDEO_PROCESSING_SOURCE_MISSING");
  const response = await getAssetObject(job.sourceStorageKey);
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    fileName: job.sourceFileName,
    mimeType: job.sourceMimeType,
  };
}

function completionDetail(result: Record<string, unknown>): string {
  const summary = result.summary;
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return "Conteúdo pronto para revisão.";
  }

  const record = summary as Record<string, unknown>;
  const details: string[] = [];
  const nextStepCount = Number(record.nextStepCount);
  const screenshotCount = Number(record.screenshotCount);
  if (Number.isFinite(nextStepCount) && nextStepCount >= 0) {
    details.push(`${nextStepCount} etapa(s)`);
  }
  if (Number.isFinite(screenshotCount) && screenshotCount >= 0) {
    details.push(`${screenshotCount} screenshot(s)`);
  }
  return details.length > 0
    ? `${details.join(" · ")} · pronto para revisão.`
    : "Conteúdo pronto para revisão.";
}

export async function completeHelpVideoProcessingJob(
  job: HelpVideoProcessingJob,
  result: Record<string, unknown>,
): Promise<void> {
  const now = new Date();
  const label = job.operation === "import"
    ? "Rascunho criado"
    : "Conteúdo atualizado";
  const detail = completionDetail(result);

  await getDatabase()
    .update(helpVideoProcessingJobs)
    .set({
      status: "completed",
      stage: "completed",
      progressLabel: label,
      progressDetail: detail,
      result,
      lastErrorCode: null,
      lastErrorMessage: null,
      heartbeatAt: now,
      leaseExpiresAt: null,
      nextAttemptAt: null,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(helpVideoProcessingJobs.id, job.id));

  await appendHelpVideoProcessingEvent({
    jobId: job.id,
    eventType: "completed",
    stage: "completed",
    status: "completed",
    label,
    detail,
    metadata: {
      attemptCount: job.attemptCount,
    },
  });

  if (job.sourceKind === "upload" && job.sourceStorageKey) {
    await deleteAssetObject(job.sourceStorageKey).catch(() => undefined);
  }
}

export async function failHelpVideoProcessingJob(
  job: HelpVideoProcessingJob,
  code: string,
  message: string,
  retryable = true,
): Promise<void> {
  const now = new Date();
  const retry = retryable && job.attemptCount < job.maxAttempts;
  const status: HelpVideoProcessingJobStatus = retry
    ? "retry_waiting"
    : "failed";
  const label = retry
    ? "Falha temporária. Nova tentativa agendada"
    : "Processamento interrompido";
  const detail = retry
    ? `Retomará do último checkpoint. Tentativa ${job.attemptCount} de ${job.maxAttempts}.`
    : `Limite automático encerrado na tentativa ${job.attemptCount} de ${job.maxAttempts}.`;

  await getDatabase()
    .update(helpVideoProcessingJobs)
    .set({
      status,
      stage: retry ? "retry" : "failed",
      progressLabel: label,
      progressDetail: detail,
      lastErrorCode: code.slice(0, 180),
      lastErrorMessage: message.slice(0, 2_000),
      nextAttemptAt: retry
        ? new Date(now.getTime() + retryDelayMs(job.attemptCount))
        : null,
      leaseExpiresAt: null,
      heartbeatAt: now,
      updatedAt: now,
    })
    .where(eq(helpVideoProcessingJobs.id, job.id));

  await appendHelpVideoProcessingEvent({
    jobId: job.id,
    eventType: retry ? "retry_scheduled" : "failed",
    stage: retry ? "retry" : "failed",
    status,
    label,
    detail,
    metadata: {
      attemptCount: job.attemptCount,
      maxAttempts: job.maxAttempts,
      failureCode: code.slice(0, 180),
    },
  });
}

export async function retryHelpVideoProcessingJob(
  jobId: string,
): Promise<HelpVideoProcessingJobView | null> {
  const now = new Date();
  const [job] = await getDatabase()
    .update(helpVideoProcessingJobs)
    .set({
      status: "queued",
      stage: "resume",
      progressLabel: "Retomada solicitada",
      progressDetail: "O worker continuará do último checkpoint disponível.",
      attemptCount: 0,
      nextAttemptAt: now,
      leaseExpiresAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      completedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(helpVideoProcessingJobs.id, jobId),
        inArray(helpVideoProcessingJobs.status, ["failed", "retry_waiting"]),
      ),
    )
    .returning();

  if (!job) return getHelpVideoProcessingJobView(jobId);

  await appendHelpVideoProcessingEvent({
    jobId: job.id,
    eventType: "manual_retry",
    stage: "resume",
    status: "queued",
    label: "Nova tentativa solicitada",
    detail: "O processamento será retomado do último checkpoint disponível.",
  });

  return toView(job, await completedPartCount(job.id));
}
