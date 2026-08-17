import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  createManagedHelpAsset,
  deleteManagedHelpAsset,
} from "$lib/server/help/helpAssetRepository";
import { attachHelpTrainingVideo } from "$lib/server/help/helpTrainingVideoAttachment";
import { validateTrainingVideo } from "$lib/server/help/helpTrainingVideo";

const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function errorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "TRAINING_VIDEO_UPLOAD_FAILED";
  if (code === "TRAINING_VIDEO_TOO_LONG") return "O vídeo deve ter no máximo 60 segundos. Quebre a demonstração em microações menores.";
  if (code === "TRAINING_VIDEO_FORMAT" || code === "ASSET_MIME_NOT_ALLOWED") return "Use um vídeo MP4.";
  if (code === "TRAINING_VIDEO_INVALID" || code === "ASSET_CONTENT_MISMATCH") return "Não foi possível validar este MP4. Exporte o vídeo novamente e tente outra vez.";
  if (code === "ASSET_SIZE_NOT_ALLOWED") return "O vídeo deve ter no máximo 25 MB.";
  if (code === "ASSET_STORAGE_NOT_CONFIGURED") return "O armazenamento de arquivos não está configurado.";
  if (code === "TRAINING_STEP_NOT_FOUND") return "A microação selecionada não está mais disponível.";
  return "Não foi possível enviar o vídeo.";
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
  const file = formData.get("file");
  if (!(file instanceof File) || file.size < 1) {
    return json({ success: false, message: "Selecione um vídeo MP4." }, { status: 400 });
  }
  if (file.type.toLowerCase() !== "video/mp4") {
    return json({ success: false, message: "Use um vídeo MP4." }, { status: 400 });
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return json({ success: false, message: "O vídeo deve ter no máximo 25 MB." }, { status: 400 });
  }

  let createdAssetId: string | null = null;
  let reused = false;

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const durationSeconds = validateTrainingVideo(bytes, file.type);
    const result = await createManagedHelpAsset(session.user.id, {
      fileName: file.name || "demonstracao.mp4",
      mimeType: file.type,
      bytes,
      contentId: null,
    });
    createdAssetId = result.asset.id;
    reused = result.reused;

    await attachHelpTrainingVideo(session.user.id, pathId, stepId, result.asset.id);

    return json({
      success: true,
      assetId: result.asset.id,
      durationSeconds: Math.round(durationSeconds * 10) / 10,
      reused,
      message: reused ? "Vídeo existente reutilizado nesta microação." : "Vídeo adicionado à microação.",
    });
  } catch (cause) {
    if (createdAssetId && !reused) {
      await deleteManagedHelpAsset(session.user.id, createdAssetId).catch(() => undefined);
    }
    return json({ success: false, message: errorMessage(cause) }, { status: 400 });
  }
};
