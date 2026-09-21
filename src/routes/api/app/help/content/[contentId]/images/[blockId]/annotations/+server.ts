import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { parseHelpImageAnnotationsJson } from "$lib/help/helpImageAnnotations";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { updateHelpImageBlockAnnotations } from "$lib/server/help/helpImageAnnotationRepository";

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

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ success: false, message: "Marcações inválidas." }, { status: 400 });
  }

  const raw =
    payload && typeof payload === "object" && "annotations" in payload
      ? JSON.stringify((payload as { annotations: unknown }).annotations)
      : "";
  const annotations = parseHelpImageAnnotationsJson(raw);
  if (!annotations) {
    return json({ success: false, message: "Marcações inválidas." }, { status: 400 });
  }

  try {
    await updateHelpImageBlockAnnotations(
      session.user.id,
      params.contentId,
      params.blockId,
      annotations,
    );
    return json({ success: true, message: "Marcações salvas." });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    return json(
      {
        success: false,
        message:
          code === "CONTENT_ARCHIVED"
            ? "Conteúdos arquivados não podem ser alterados."
            : "Não foi possível salvar as marcações desta imagem.",
      },
      { status: 409 },
    );
  }
};
