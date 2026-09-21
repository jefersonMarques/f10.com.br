import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { publishHelpKnowledgeContent } from "$lib/server/help/helpKnowledgePublisher";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function publishMessage(code: string): string {
  switch (code) {
    case "CONTENT_REAL_CATEGORY_REQUIRED":
    case "CONTENT_CATEGORY_REQUIRED":
    case "CONTENT_CATEGORY_INVALID":
      return "Revise as categorias antes de publicar.";
    case "STEP_BLOCK_REQUIRED":
      return "Todas as etapas precisam ter conteúdo.";
    case "STEP_IMAGE_LIMIT_EXCEEDED":
      return "Cada etapa pode ter no máximo uma imagem.";
    case "HUMAN_REVIEW_REQUIRED":
      return "Conclua a revisão das imagens antes de publicar.";
    case "FEATURED_VIDEO_SUBTITLES_REQUIRED":
      return "O vídeo precisa de subtitles antes da publicação.";
    default:
      return "Ainda existem pendências para publicação.";
  }
}

export const POST: RequestHandler = async ({ cookies, params }) => {
  if (!isUuid(params.contentId)) {
    return json({ success: false, message: "Conteúdo não encontrado." }, { status: 404 });
  }

  const { session } = await requireAppPermission(
    cookies,
    "help.publish",
    `/app/help/content/${params.contentId}/images`,
  );

  try {
    await publishHelpKnowledgeContent(session.user.id, params.contentId);
    return json({ success: true, message: "Conteúdo publicado." });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    return json({ success: false, message: publishMessage(code) }, { status: 409 });
  }
};
