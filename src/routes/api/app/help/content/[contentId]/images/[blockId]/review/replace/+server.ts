import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { replaceHelpHumanReviewImage } from "$lib/server/help/helpScreenshotReviewRepository";

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return json({ success: false, message: "Não foi possível receber a nova imagem." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json({ success: false, message: "Selecione uma imagem válida." }, { status: 400 });
  }

  try {
    await replaceHelpHumanReviewImage({
      actorUserId: session.user.id,
      contentId: params.contentId,
      blockId: params.blockId,
      fileName: file.name,
      mimeType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return json({
      success: true,
      message: "Imagem substituída. Revise e salve novamente antes de publicar.",
    });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    const message =
      code === "CONTENT_ARCHIVED"
        ? "Conteúdos arquivados não podem ser alterados."
        : code === "ASSET_MIME_NOT_ALLOWED" || code === "ASSET_CONTENT_MISMATCH"
          ? "Use uma imagem PNG, JPG, WEBP ou GIF válida."
          : code === "ASSET_SIZE_NOT_ALLOWED"
            ? "A imagem deve ter no máximo 10 MB."
            : code === "IMAGE_BLOCK_NOT_FOUND"
              ? "Imagem não encontrada."
              : "Não foi possível substituir a imagem.";
    return json({ success: false, message }, { status: 409 });
  }
};
