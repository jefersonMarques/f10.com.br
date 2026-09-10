import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { createHelpVideoImportProcessingJob } from "$lib/server/help/helpVideoImportQueueService";
import { HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES } from "$lib/server/help/helpVideoImportAutomation";
import { getHelpVideoAutomationSettings } from "$lib/server/settings/operationsSettingsRepository";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function errorMessage(code: string): string {
  if (code.startsWith("HELP_VIDEO_ALREADY_USED:")) {
    return "Este vídeo já pertence a outro conteúdo.";
  }
  if (code === "HELP_VIDEO_UPLOAD_SIZE_INVALID") {
    return `O vídeo deve ter no máximo ${Math.round(HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`;
  }
  if (code === "HELP_VIDEO_UPLOAD_FORMAT_INVALID") {
    return "Use um arquivo .mp4 válido.";
  }
  if (code === "CONTENT_ARCHIVED") {
    return "O conteúdo vinculado a este ID externo está arquivado.";
  }
  if (code === "HELP_CATEGORY_UNCATEGORIZED_NOT_FOUND") {
    return "A categoria interna necessária para iniciar a importação não está disponível.";
  }
  if (code.startsWith("ASSET_STORAGE_")) {
    return "Não foi possível armazenar o vídeo para processamento.";
  }
  return "Não foi possível iniciar o processamento do vídeo.";
}

export const POST: RequestHandler = async ({ cookies, request }) => {
  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    "/app/help/content/import",
  );
  const settings = await getHelpVideoAutomationSettings();
  if (!settings.enabled) {
    return json(
      { success: false, message: "A geração automática por vídeo está desabilitada." },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json(
      { success: false, message: "Não foi possível receber o vídeo." },
      { status: 400 },
    );
  }

  if (readString(formData, "sourceType") !== "upload") {
    return json(
      { success: false, message: "Use um arquivo MP4 para iniciar o processamento." },
      { status: 400 },
    );
  }

  const file = formData.get("videoFile");
  if (!(file instanceof File) || file.size < 1) {
    return json(
      { success: false, message: "Selecione um arquivo MP4." },
      { status: 400 },
    );
  }
  if (file.size > HELP_VIDEO_AUTOMATION_MAX_UPLOAD_BYTES) {
    return json(
      { success: false, message: errorMessage("HELP_VIDEO_UPLOAD_SIZE_INVALID") },
      { status: 413 },
    );
  }
  if (
    file.type.toLowerCase() !== "video/mp4"
    && !file.name.toLowerCase().endsWith(".mp4")
  ) {
    return json(
      { success: false, message: errorMessage("HELP_VIDEO_UPLOAD_FORMAT_INVALID") },
      { status: 400 },
    );
  }

  try {
    const job = await createHelpVideoImportProcessingJob({
      actorUserId: session.user.id,
      fileName: file.name || "video.mp4",
      mimeType: file.type || "video/mp4",
      bytes: new Uint8Array(await file.arrayBuffer()),
      externalId: readString(formData, "externalId"),
    });

    return json(
      {
        success: true,
        message: "Vídeo recebido. O processamento continuará no servidor.",
        job,
      },
      { status: 202 },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    const existingContentId = code.startsWith("HELP_VIDEO_ALREADY_USED:")
      ? code.slice("HELP_VIDEO_ALREADY_USED:".length)
      : null;
    return json(
      {
        success: false,
        message: errorMessage(code),
        existingContentId,
      },
      { status: 409 },
    );
  }
};
