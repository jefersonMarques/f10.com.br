import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  generateHelpStepScreenshot,
  uploadHelpStepScreenshot,
} from "$lib/server/help/helpContentRefinementService";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function messageFor(code: string): string {
  if (code === "STEP_IMAGE_LIMIT_EXCEEDED") return "Esta etapa já possui uma imagem.";
  if (code === "HELP_VIDEO_LOCAL_COPY_REQUIRED") return "Este conteúdo não possui vídeo local para gerar a imagem.";
  if (code === "HELP_VIDEO_TIMELINE_REQUIRED") return "A timeline do vídeo não está disponível.";
  if (code === "HELP_VIDEO_NO_SCREENSHOTS_SELECTED") return "Não foi possível encontrar um bom frame para esta etapa.";
  if (code === "ASSET_MIME_NOT_ALLOWED" || code === "ASSET_CONTENT_MISMATCH") return "Use uma imagem PNG, JPG, WEBP ou GIF válida.";
  if (code === "ASSET_SIZE_NOT_ALLOWED") return "A imagem deve ter no máximo 10 MB.";
  if (code === "CONTENT_ARCHIVED") return "Conteúdo arquivado não pode ser alterado.";
  if (code === "STEP_NOT_FOUND") return "Etapa não encontrada.";
  return "Não foi possível adicionar a imagem.";
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
  if (!isUuid(params.contentId) || !isUuid(params.stepId)) {
    return json({ success: false, message: "Etapa não encontrada." }, { status: 404 });
  }

  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/content/${params.contentId}/images`,
  );

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const payload = await request.json().catch(() => ({})) as { action?: string };
      if (payload.action !== "generate") {
        return json({ success: false, message: "Ação inválida." }, { status: 400 });
      }
      const result = await generateHelpStepScreenshot({
        actorUserId: session.user.id,
        contentId: params.contentId,
        stepId: params.stepId,
      });
      return json({
        success: true,
        message: `${result.candidateCount} imagens geradas para revisão.`,
      });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return json({ success: false, message: "Selecione uma imagem válida." }, { status: 400 });
    }

    await uploadHelpStepScreenshot({
      actorUserId: session.user.id,
      contentId: params.contentId,
      stepId: params.stepId,
      fileName: file.name,
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return json({ success: true, message: "Imagem adicionada para revisão." });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    return json({ success: false, message: messageFor(code) }, { status: 409 });
  }
};
