import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { parseHelpImageAnnotationsJson } from "$lib/help/helpImageAnnotations";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { confirmHelpScreenshotReviewSelection } from "$lib/server/help/helpScreenshotReviewRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

  let assetId = "";
  let annotations = null;
  try {
    const payload = await request.json() as { assetId?: unknown; annotations?: unknown };
    assetId = typeof payload.assetId === "string" ? payload.assetId.trim() : "";
    annotations = parseHelpImageAnnotationsJson(JSON.stringify(payload.annotations ?? []));
  } catch {
    return json({ success: false, message: "Seleção ou marcações inválidas." }, { status: 400 });
  }

  if (!isUuid(assetId) || !annotations) {
    return json({ success: false, message: "Seleção ou marcações inválidas." }, { status: 400 });
  }

  try {
    await confirmHelpScreenshotReviewSelection({
      actorUserId: session.user.id,
      contentId: params.contentId,
      blockId: params.blockId,
      assetId,
      annotations,
    });
    return json({ success: true, message: "Screenshot e marcações salvos." });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    const message =
      code === "CONTENT_ARCHIVED"
        ? "Conteúdos arquivados não podem ser alterados."
        : code === "SCREENSHOT_REVIEW_ASSET_INVALID"
          ? "A opção selecionada não pertence a esta revisão."
          : code === "IMAGE_BLOCK_NOT_FOUND"
            ? "Imagem não encontrada."
            : "Não foi possível salvar o screenshot e as marcações.";
    return json({ success: false, message }, { status: 409 });
  }
};
