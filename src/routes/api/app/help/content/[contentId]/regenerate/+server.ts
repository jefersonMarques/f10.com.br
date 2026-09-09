import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  createHelpVideoProcessingJob,
  getHelpVideoProcessingJobView,
  getLatestHelpVideoProcessingJobView,
  retryHelpVideoProcessingJob,
} from "$lib/server/help/helpVideoProcessingRepository";
import { HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES } from "$lib/server/help/helpVideoImportAutomation";
import { getHelpVideoAutomationSettings } from "$lib/server/settings/operationsSettingsRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorMessage(code: string): string {
  if (code.startsWith("HELP_VIDEO_ALREADY_USED:")) {
    return "Este vídeo já pertence a outro conteúdo.";
  }
  if (code === "HELP_VIDEO_LOCAL_COPY_REQUIRED") {
    return "Este artigo não possui MP4 local para reprocessar.";
  }
  if (code === "HELP_VIDEO_UPLOAD_SIZE_INVALID") {
    return "O vídeo excede o limite permitido.";
  }
  if (code === "CONTENT_ARCHIVED") return "Conteúdo arquivado não pode ser atualizado.";
  if (code === "CONTENT_NOT_FOUND") return "Conteúdo não encontrado.";
  if (code.startsWith("ASSET_STORAGE_")) {
    return "Não foi possível armazenar o vídeo para processamento.";
  }
  return "Não foi possível iniciar o processamento do vídeo.";
}

async function authorize(cookies: Parameters<RequestHandler>[0]["cookies"], contentId: string) {
  return requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/content/${contentId}/images`,
  );
}

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  if (!isUuid(params.contentId)) {
    return json({ success: false, message: "Conteúdo não encontrado." }, { status: 404 });
  }
  await authorize(cookies, params.contentId);

  const jobId = url.searchParams.get("jobId")?.trim() ?? "";
  const job = jobId && isUuid(jobId)
    ? await getHelpVideoProcessingJobView(jobId)
    : await getLatestHelpVideoProcessingJobView(params.contentId);

  if (job && job.contentId !== params.contentId) {
    return json({ success: false, message: "Processamento não encontrado." }, { status: 404 });
  }
  return json({ success: true, job });
};

export const POST: RequestHandler = async ({ cookies, params, request }) => {
  if (!isUuid(params.contentId)) {
    return json({ success: false, message: "Conteúdo não encontrado." }, { status: 404 });
  }

  const { session } = await authorize(cookies, params.contentId);
  const settings = await getHelpVideoAutomationSettings();
  if (!settings.enabled) {
    return json(
      { success: false, message: "A geração automática por vídeo está desabilitada." },
      { status: 403 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const source = contentType.includes("multipart/form-data")
      ? await (async () => {
          const formData = await request.formData();
          const file = formData.get("videoFile");
          if (!(file instanceof File) || file.size < 1) {
            throw new Error("HELP_VIDEO_UPLOAD_FORMAT_INVALID");
          }
          if (file.size > HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES) {
            throw new Error("HELP_VIDEO_UPLOAD_SIZE_INVALID");
          }
          return {
            type: "upload" as const,
            fileName: file.name || "video-atualizado.mp4",
            mimeType: file.type || "video/mp4",
            bytes: new Uint8Array(await file.arrayBuffer()),
          };
        })()
      : { type: "current" as const };

    const job = await createHelpVideoProcessingJob({
      actorUserId: session.user.id,
      contentId: params.contentId,
      source,
    });

    return json(
      {
        success: true,
        message: "Processamento iniciado no servidor. Você pode fechar esta tela.",
        job,
      },
      { status: 202 },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    return json({ success: false, message: errorMessage(code) }, { status: 400 });
  }
};

export const PATCH: RequestHandler = async ({ cookies, params, request }) => {
  if (!isUuid(params.contentId)) {
    return json({ success: false, message: "Conteúdo não encontrado." }, { status: 404 });
  }
  await authorize(cookies, params.contentId);

  const body = await request.json().catch(() => ({})) as {
    jobId?: unknown;
    action?: unknown;
  };
  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!isUuid(jobId) || body.action !== "retry") {
    return json({ success: false, message: "Ação inválida." }, { status: 400 });
  }

  const currentJob = await getHelpVideoProcessingJobView(jobId);
  if (!currentJob || currentJob.contentId !== params.contentId) {
    return json({ success: false, message: "Processamento não encontrado." }, { status: 404 });
  }

  const job = await retryHelpVideoProcessingJob(jobId);
  return json({
    success: true,
    message: "Retomada agendada a partir do último checkpoint.",
    job,
  });
};
