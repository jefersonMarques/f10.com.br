import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  createManagedHelpAsset,
  deleteManagedHelpAsset,
} from "$lib/server/help/helpAssetRepository";
import {
  createTrainingCaptionAsset,
  validateTrainingCaptions,
} from "$lib/server/help/helpTrainingCaption";
import {
  attachHelpTrainingCaption,
  attachHelpTrainingVideo,
} from "$lib/server/help/helpTrainingVideoAttachment";
import { validateTrainingVideo } from "$lib/server/help/helpTrainingVideo";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MAX_CAPTION_BYTES = 1024 * 1024;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "TRAINING_VIDEO_UPLOAD_FAILED";
  if (code === "TRAINING_VIDEO_TOO_SHORT") return "O vídeo deve ter pelo menos 30 segundos. Junte instruções relacionadas para evitar uma demonstração cortada demais.";
  if (code === "TRAINING_VIDEO_TOO_LONG") return "O vídeo deve ter no máximo 60 segundos. Divida somente quando houver outra ação independente.";
  if (code === "TRAINING_VIDEO_FORMAT" || code === "ASSET_MIME_NOT_ALLOWED") return "Use um vídeo MP4.";
  if (code === "TRAINING_VIDEO_INVALID" || code === "ASSET_CONTENT_MISMATCH") return "Não foi possível validar este MP4. Exporte o vídeo novamente e tente outra vez.";
  if (code === "ASSET_SIZE_NOT_ALLOWED") return "O vídeo deve ter no máximo 25 MB.";
  if (code === "TRAINING_CAPTION_SIZE_INVALID") return "A legenda deve ter no máximo 1 MB.";
  if (code === "TRAINING_CAPTION_INVALID") return "Use uma legenda WebVTT válida (.vtt), iniciando com WEBVTT.";
  if (code === "TRAINING_LOCAL_VIDEO_REQUIRED") return "Envie primeiro um vídeo MP4 local antes de anexar somente a legenda.";
  if (code === "ASSET_STORAGE_NOT_CONFIGURED") return "O armazenamento de arquivos não está configurado.";
  if (code === "TRAINING_STEP_NOT_FOUND") return "A microação selecionada não está mais disponível.";
  return "Não foi possível enviar o vídeo ou a legenda.";
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
  const pathId = params.pathId ?? "";
  const stepId = params.stepId ?? "";
  if (!isUuid(pathId) || !isUuid(stepId)) {
    return json({ success: false, message: "Microação inválida." }, { status: 400 });
  }

  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/trilhas/${pathId}`,
  );

  const formData = await request.formData();
  const fileValue = formData.get("file");
  const captionsValue = formData.get("captions");
  const file = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  const captions = captionsValue instanceof File && captionsValue.size > 0 ? captionsValue : null;

  if (!file && !captions) {
    return json({ success: false, message: "Selecione um vídeo MP4 ou uma legenda .vtt." }, { status: 400 });
  }
  if (file && file.type.toLowerCase() !== "video/mp4") {
    return json({ success: false, message: "Use um vídeo MP4." }, { status: 400 });
  }
  if (file && file.size > MAX_VIDEO_BYTES) {
    return json({ success: false, message: "O vídeo deve ter no máximo 25 MB." }, { status: 400 });
  }
  if (captions && (!captions.name.toLowerCase().endsWith(".vtt") || captions.size > MAX_CAPTION_BYTES)) {
    return json({ success: false, message: "Use uma legenda WebVTT (.vtt) de até 1 MB." }, { status: 400 });
  }

  let videoAssetId: string | null = null;
  let videoReused = false;
  let captionAssetId: string | null = null;
  let captionReused = false;

  try {
    let durationSeconds: number | null = null;
    if (file) {
      const videoBytes = new Uint8Array(await file.arrayBuffer());
      durationSeconds = validateTrainingVideo(videoBytes, file.type);
      const videoResult = await createManagedHelpAsset(session.user.id, {
        fileName: file.name || "demonstracao.mp4",
        mimeType: file.type,
        bytes: videoBytes,
        contentId: null,
      });
      videoAssetId = videoResult.asset.id;
      videoReused = videoResult.reused;
    }

    if (captions) {
      const captionBytes = new Uint8Array(await captions.arrayBuffer());
      validateTrainingCaptions(captionBytes);
      const captionResult = await createTrainingCaptionAsset(
        session.user.id,
        captions.name || "legendas.vtt",
        captionBytes,
      );
      captionAssetId = captionResult.assetId;
      captionReused = captionResult.reused;
    }

    if (videoAssetId) {
      await attachHelpTrainingVideo(
        session.user.id,
        pathId,
        stepId,
        videoAssetId,
        captionAssetId,
      );
    } else if (captionAssetId) {
      await attachHelpTrainingCaption(session.user.id, pathId, stepId, captionAssetId);
    }

    return json({
      success: true,
      assetId: videoAssetId,
      captionAssetId,
      durationSeconds: durationSeconds === null ? null : Math.round(durationSeconds * 10) / 10,
      reused: videoReused,
      message: videoAssetId && captionAssetId
        ? "Vídeo e legenda adicionados à microação."
        : videoAssetId
          ? "Vídeo adicionado. Anexe a legenda .vtt antes de publicar."
          : "Legenda adicionada ao vídeo existente.",
    });
  } catch (cause) {
    if (captionAssetId && !captionReused) {
      await deleteManagedHelpAsset(session.user.id, captionAssetId).catch(() => undefined);
    }
    if (videoAssetId && !videoReused) {
      await deleteManagedHelpAsset(session.user.id, videoAssetId).catch(() => undefined);
    }
    return json({ success: false, message: errorMessage(cause) }, { status: 400 });
  }
};
