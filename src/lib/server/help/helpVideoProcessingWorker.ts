import { env } from "$env/dynamic/private";
import { regenerateHelpContentFromVideo } from "$lib/server/help/helpContentRegenerationService";
import {
  claimNextHelpVideoProcessingJob,
  completeHelpVideoProcessingJob,
  failHelpVideoProcessingJob,
  heartbeatHelpVideoProcessingJob,
  loadHelpVideoProcessingCheckpoint,
  readHelpVideoProcessingSource,
  recoverStaleHelpVideoProcessingJobs,
  saveHelpVideoProcessingCheckpoint,
  updateHelpVideoProcessingProgress,
  type HelpVideoProcessingJob,
} from "$lib/server/help/helpVideoProcessingRepository";

const POLL_INTERVAL_MS = 4_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

let started = false;
let stopping = false;

function failureCode(cause: unknown): string {
  if (!(cause instanceof Error)) return "HELP_VIDEO_PROCESSING_FAILED";
  const message = cause.message.trim();
  const prefix = message.split(":", 1)[0]?.trim() ?? "";
  return /^[A-Z][A-Z0-9_]*$/.test(prefix)
    ? prefix
    : "HELP_VIDEO_PROCESSING_FAILED";
}

function failureMessage(cause: unknown): string {
  return cause instanceof Error
    ? cause.message.slice(0, 2_000)
    : "Falha inesperada no processamento do vídeo.";
}

async function processJob(job: HelpVideoProcessingJob): Promise<void> {
  if (!job.actorUserId) {
    throw new Error("HELP_VIDEO_PROCESSING_ACTOR_MISSING");
  }

  const heartbeat = setInterval(() => {
    void heartbeatHelpVideoProcessingJob(job.id).catch(() => undefined);
  }, HEARTBEAT_INTERVAL_MS);

  try {
    const [source, checkpoint] = await Promise.all([
      readHelpVideoProcessingSource(job),
      loadHelpVideoProcessingCheckpoint(job),
    ]);

    const result = await regenerateHelpContentFromVideo({
      actorUserId: job.actorUserId,
      contentId: job.contentId,
      source: {
        type: "upload",
        fileName: source.fileName,
        mimeType: source.mimeType,
        bytes: source.bytes,
      },
      checkpoint,
      onCheckpoint: (nextCheckpoint) =>
        saveHelpVideoProcessingCheckpoint(job.id, nextCheckpoint),
      onProgress: (progress) =>
        updateHelpVideoProcessingProgress({
          jobId: job.id,
          stage: progress.stage,
          label: progress.label,
          detail: progress.detail,
        }),
    });

    await completeHelpVideoProcessingJob(job, {
      summary: result.summary,
      contentId: result.content.id,
    });
  } finally {
    clearInterval(heartbeat);
  }
}

async function runWorkerLoop(): Promise<void> {
  await recoverStaleHelpVideoProcessingJobs();

  while (!stopping) {
    await recoverStaleHelpVideoProcessingJobs();
    const job = await claimNextHelpVideoProcessingJob();
    if (!job) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    try {
      await processJob(job);
    } catch (cause) {
      console.error("[help-video-worker] processing failed", {
        jobId: job.id,
        contentId: job.contentId,
        attempt: job.attemptCount,
        code: failureCode(cause),
        cause,
      });
      await failHelpVideoProcessingJob(
        job,
        failureCode(cause),
        failureMessage(cause),
      ).catch((failureCause) => {
        console.error("[help-video-worker] failed to persist job failure", {
          jobId: job.id,
          failureCause,
        });
      });
    }
  }
}

export function startHelpVideoProcessingWorker(): void {
  if (started || env.F10_HELP_VIDEO_WORKER !== "1") return;
  started = true;
  stopping = false;
  void runWorkerLoop().catch((cause) => {
    started = false;
    console.error("[help-video-worker] loop stopped", { cause });
    setTimeout(() => startHelpVideoProcessingWorker(), POLL_INTERVAL_MS);
  });
}

export function stopHelpVideoProcessingWorker(): void {
  stopping = true;
}
