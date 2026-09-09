import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  deleteStructuredHelpStep,
  getStructuredHelpContent,
} from "$lib/server/help/structuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const DELETE: RequestHandler = async ({ cookies, params }) => {
  if (!isUuid(params.contentId) || !isUuid(params.stepId)) {
    return json({ success: false, message: "Etapa não encontrada." }, { status: 404 });
  }

  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/content/${params.contentId}/images`,
  );

  try {
    await deleteStructuredHelpStep(session.user.id, params.contentId, params.stepId);
    const content = await getStructuredHelpContent(params.contentId);
    return json({ success: true, content, message: "Etapa excluída." });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    return json(
      {
        success: false,
        message:
          code === "LAST_STEP_REQUIRED"
            ? "O conteúdo precisa manter pelo menos uma etapa."
            : "Não foi possível excluir a etapa.",
      },
      { status: 409 },
    );
  }
};
