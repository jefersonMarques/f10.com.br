import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { parseHelpImageAnnotationsJson } from "$lib/help/helpImageAnnotations";
import type { HelpHumanReviewInteraction } from "$lib/help/helpHumanReview";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { saveHelpHumanReviewBatch } from "$lib/server/help/helpScreenshotReviewRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseInteractions(value: unknown): HelpHumanReviewInteraction[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is HelpHumanReviewInteraction =>
      item === "confirmed" ||
      item === "image_selected" ||
      item === "annotated" ||
      item === "image_replaced",
  );
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
  if (!isUuid(params.contentId)) {
    return json({ success: false, message: "Conteúdo não encontrado." }, { status: 404 });
  }
  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/content/${params.contentId}/images`,
  );

  let payload: {
    confirmUntouched?: unknown;
    items?: Array<{
      blockId?: unknown;
      assetId?: unknown;
      annotations?: unknown;
      interactions?: unknown;
    }>;
  };
  try {
    payload = await request.json();
  } catch {
    return json({ success: false, message: "Revisão inválida." }, { status: 400 });
  }

  const items = (payload.items ?? []).flatMap((item) => {
    const blockId = typeof item.blockId === "string" ? item.blockId.trim() : "";
    const assetId = typeof item.assetId === "string" ? item.assetId.trim() : "";
    const annotations = parseHelpImageAnnotationsJson(JSON.stringify(item.annotations ?? []));
    if (!isUuid(blockId) || !isUuid(assetId) || !annotations) return [];
    return [{
      blockId,
      assetId,
      annotations,
      interactions: parseInteractions(item.interactions),
    }];
  });

  if (items.length === 0 || items.length !== (payload.items?.length ?? 0)) {
    return json({ success: false, message: "Existem imagens com dados de revisão inválidos." }, { status: 400 });
  }

  try {
    const status = await saveHelpHumanReviewBatch({
      actorUserId: session.user.id,
      contentId: params.contentId,
      confirmUntouched: payload.confirmUntouched === true,
      items,
    });
    return json({
      success: true,
      message: "Revisão humana salva para todas as imagens.",
      status,
    });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    const message =
      code === "HUMAN_REVIEW_CONFIRMATION_REQUIRED"
        ? "Existem imagens ainda sem interação. Confirme a revisão visual antes de salvar tudo."
        : code === "HUMAN_REVIEW_INCOMPLETE"
          ? "A revisão precisa incluir todas as imagens atuais do conteúdo."
          : code === "CONTENT_ARCHIVED"
            ? "Conteúdos arquivados não podem ser alterados."
            : code === "SCREENSHOT_REVIEW_ASSET_INVALID"
              ? "Uma das imagens selecionadas não pertence mais a esta revisão."
              : "Não foi possível salvar toda a revisão humana.";
    return json({ success: false, message }, { status: 409 });
  }
};
