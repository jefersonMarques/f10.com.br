import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  generateAdditionalHelpScreenshotCandidates,
  type HelpScreenshotGenerationMode,
} from "$lib/server/help/helpContentRefinementService";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function messageFor(code: string): string {
  if (code === "HELP_VIDEO_LOCAL_COPY_REQUIRED") return "Este conteúdo não possui vídeo local para gerar novos prints.";
  if (code === "HELP_VIDEO_TIMELINE_REQUIRED") return "A timeline do vídeo não está disponível.";
  if (code === "HELP_VIDEO_FFMPEG_NOT_AVAILABLE") return "A geração de frames não está disponível no servidor.";
  if (code === "CONTENT_ARCHIVED") return "Conteúdo arquivado não pode ser alterado.";
  if (code === "IMAGE_BLOCK_NOT_FOUND") return "Imagem não encontrada.";
  if (code === "AI_TASK_DISABLED" || code === "AI_PROVIDER_NOT_CONFIGURED" || code === "AI_CREDENTIAL_UNAVAILABLE") {
    return "A IA de edição não está disponível.";
  }
  return "Não foi possível gerar novas imagens.";
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
  if (!isUuid(params.contentId) || !isUuid(params.blockId)) {
    return json({ success: false, message: "Imagem não encontrada." }, { status: 404 });
  }
  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/content/${params.contentId}/images`,
  );

  let mode: HelpScreenshotGenerationMode = "auto";
  let baseTimeSeconds: number | null = null;
  let selectedAssetId: string | null = null;
  try {
    const payload = await request.json() as {
      mode?: string;
      baseTimeSeconds?: unknown;
      selectedAssetId?: unknown;
    };
    if (payload.mode === "before" || payload.mode === "after" || payload.mode === "auto") {
      mode = payload.mode;
    }
    const suppliedBaseTime = Number(payload.baseTimeSeconds);
    if (Number.isFinite(suppliedBaseTime) && suppliedBaseTime >= 0) {
      baseTimeSeconds = suppliedBaseTime;
    }
    if (typeof payload.selectedAssetId === "string" && isUuid(payload.selectedAssetId)) {
      selectedAssetId = payload.selectedAssetId;
    }
  } catch {
    // Usa o modo automático quando o corpo vier vazio.
  }

  try {
    const result = await generateAdditionalHelpScreenshotCandidates({
      actorUserId: session.user.id,
      contentId: params.contentId,
      blockId: params.blockId,
      mode,
      baseTimeSeconds,
      selectedAssetId,
    });
    return json({
      success: true,
      message: `${result.addedCount} novas imagens adicionadas.`,
      candidates: result.candidates,
    });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    return json({ success: false, message: messageFor(code) }, { status: 409 });
  }
};
