import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpVideoProcessingJobs,
  helpVideoProcessingParts,
  type HelpVideoProcessingJobStatus,
} from "$lib/server/db/helpVideoProcessingSchema";
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
const LEASE_MS = 5 * 60 * 1_000;

export type HelpVideoProcessingSource =
  | { type: "current" }
  | {
      type: "upload";
      fileName: string;
      mimeType: string;
      bytes: Uint8Array;
    };

export type HelpVideoProcessingJob = typeof helpVideoProcessingJobs.$inferSelect;

export type HelpVideoProcessingJobView = {
  id: string;
  contentId: string;
  status: HelpVideoProcessingJobStatus;
  stage: string;
  progressLabel: string;
  progressDetail: string;
  attemptCount: number;
  maxAttempts: number;
  completedParts: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

function retryDelayMs(attemptCount: number): number {
  const seconds = Math.min(30 * 2 ** Math.max(0, attemptCount - 1), 5 * 60);
  return seconds * 1_000;
}

function toView(
  job: HelpVideoProcessingJob,
  completedParts: number,
): HelpVideoProcessingJobView {
  return {
    id: job.id,
    contentId: job.contentId,
    status: job.status,
    stage: job.stage,
    progressLabel: job.progressLabel,
    progressDetail: job.progressDetail,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    completedParts,
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
    return toView(job, 0);
  } catch (cause) {
    if (sourceStorageKey) {
      await deleteAssetObject(sourceStorageKey).catch(() => undefined);
    }
    throw cause;
  }
}

export async function recoverStaleHelpVideoProcessingJobs(): Promise<void> {
  const now = new Date();
  await getDatabase()
    .update(helpVideoProcessingJobs)
    .set({
      status: "retry_waiting",
      stage: "resume",
      progressLabel: "Retomando processamento interrompido",
      progressDetail: "O worker será retomado a partir do último checkpoint.",
      nextAttemptAt: now,
      leaseExpiresAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(helpVideoProcessingJobs.status, "running"),
        lte(helpVideoProcessingJobs.leaseExpiresAt, now),
      ),
    );
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
      ),
    )
    .returning();
  return claimed ?? null;
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
  await getDatabase()
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
    );
}

function checkpointWithoutParts(
  checkpoint: HelpVideoAutomationCheckpoint,
): Record<string, unknown> {
  return {
    transcript: checkpoint.transcript,
    article: checkpoint.article
      ? {
          classifiedSegments: checkpoint.article.classifiedSegments,
          metadata: checkpoint.article.metadata,
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

  await db.transaction(async (tx) => {
    await tx
      .update(helpVideoProcessingJobs)
      .set({
        checkpoint: checkpointWithoutParts(checkpoint),
        heartbeatAt: new Date(),
        leaseExpiresAt: new Date(Date.now() + LEASE_MS),
        updatedAt: new Date(),
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
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            helpVideoProcessingParts.jobId,
            helpVideoProcessingParts.partIndex,
          ],
          set: {
            segmentIds: part.segmentIds,
            payload: { steps: part.steps },
            updatedAt: new Date(),
          },
        });
    }
  });
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

  return {
    transcript: base.transcript,
    article: base.article
      ? {
          ...base.article,
          completedParts: parts.flatMap((part) => {
            const payload = part.payload as {
              steps?: HelpVideoAutomationCheckpoint["article"] extends infer T
                ? unknown
                : never;
            };
            const steps = (
              part.payload as {
                steps?: NonNullable<
                  NonNullable<HelpVideoAutomationCheckpoint["article"]>["completedParts"]
                >[number]["steps"];
              }
            ).steps;
            return Array.isArray(steps)
              ? [{
                  partIndex: part.partIndex,
                  segmentIds: part.segmentIds,
                  steps,
                }]
              : [];
          }),
        }
      : parts.length > 0
        ? {
            completedParts: parts.flatMap((part) => {
              const steps = (
                part.payload as {
                  steps?: NonNullable<
                    NonNullable<HelpVideoAutomationCheckpoint["article"]>["completedParts"]
                  >[number]["steps"];
                }
              ).steps;
              return Array.isArray(steps)
                ? [{
                    partIndex: part.partIndex,
                    segmentIds: part.segmentIds,
                    steps,
                  }]
                : [];
            }),
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

export async function completeHelpVideoProcessingJob(
  job: HelpVideoProcessingJob,
  result: Record<string, unknown>,
): Promise<void> {
  const now = new Date();
  await getDatabase()
    .update(helpVideoProcessingJobs)
    .set({
      status: "completed",
      stage: "completed",
      progressLabel: "Conteúdo atualizado",
      progressDetail: "O novo rascunho está pronto para revisão.",
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

  if (job.sourceKind === "upload" && job.sourceStorageKey) {
    await deleteAssetObject(job.sourceStorageKey).catch(() => undefined);
  }
}

export async function failHelpVideoProcessingJob(
  job: HelpVideoProcessingJob,
  code: string,
  message: string,
): Promise<void> {
  const now = new Date();
  const retry = job.attemptCount < job.maxAttempts;
  await getDatabase()
    .update(helpVideoProcessingJobs)
    .set({
      status: retry ? "retry_waiting" : "failed",
      stage: retry ? "retry" : "failed",
      progressLabel: retry
        ? "Falha temporária. Nova tentativa agendada"
        : "Processamento interrompido",
      progressDetail: retry
        ? `Retomará do último checkpoint. Tentativa ${job.attemptCount}/${job.maxAttempts}.`
        : "Use Tentar novamente para continuar do último checkpoint.",
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
  return toView(job, await completedPartCount(job.id));
}
