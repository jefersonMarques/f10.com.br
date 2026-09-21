import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  applyHelpStepSplit,
  suggestHelpStepSplit,
} from "$lib/server/help/helpContentRefinementService";
import type { StructuredHelpStepSplitPart } from "$lib/server/help/structuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readParts(value: unknown): StructuredHelpStepSplitPart[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const description = typeof row.description === "string" ? row.description.trim() : "";
    const instruction = typeof row.instruction === "string" ? row.instruction.trim() : "";
    if (title.length < 2 || title.length > 180 || description.length > 2_000 || !instruction || instruction.length > 50_000) {
      return [];
    }
    return [{ title, description, instruction }];
  }).slice(0, 8);
}

function messageFor(code: string): string {
  if (code === "STEP_SPLIT_SOURCE_CHANGED") return "A etapa mudou. Gere uma nova sugestão antes de aplicar.";
  if (code === "STEP_LIMIT_EXCEEDED") return "O conteúdo já atingiu o limite de etapas.";
  if (code === "STEP_SPLIT_PART_COUNT_INVALID") return "A IA não conseguiu montar a quantidade escolhida. Tente novamente.";
  if (code === "CONTENT_ARCHIVED") return "Conteúdo arquivado não pode ser alterado.";
  if (code === "STEP_NOT_FOUND") return "Etapa não encontrada.";
  if (code === "AI_TASK_DISABLED" || code === "AI_PROVIDER_NOT_CONFIGURED" || code === "AI_CREDENTIAL_UNAVAILABLE") {
    return "A IA de edição não está disponível.";
  }
  return "Não foi possível refinar esta etapa.";
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

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return json({ success: false, message: "Solicitação inválida." }, { status: 400 });
  }

  const action = payload.action;
  try {
    if (action === "preview") {
      const desiredParts = Number(payload.desiredParts);
      if (!Number.isInteger(desiredParts) || desiredParts < 2 || desiredParts > 6) {
        return json({ success: false, message: "Escolha entre 2 e 6 partes." }, { status: 400 });
      }
      const suggestion = await suggestHelpStepSplit(
        session.user.id,
        params.contentId,
        params.stepId,
        desiredParts,
      );
      return json({ success: true, suggestion });
    }

    if (action === "apply") {
      const sourceSignature =
        typeof payload.sourceSignature === "string" ? payload.sourceSignature.trim() : "";
      const parts = readParts(payload.parts);
      if (!sourceSignature || parts.length < 2) {
        return json({ success: false, message: "Sugestão inválida." }, { status: 400 });
      }
      const content = await applyHelpStepSplit({
        actorUserId: session.user.id,
        contentId: params.contentId,
        stepId: params.stepId,
        sourceSignature,
        parts,
      });
      return json({ success: true, content, message: "Etapa reorganizada." });
    }

    return json({ success: false, message: "Ação inválida." }, { status: 400 });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    return json({ success: false, message: messageFor(code) }, { status: 409 });
  }
};
