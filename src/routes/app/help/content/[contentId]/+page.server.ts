import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  addStructuredHelpBlock,
  addStructuredHelpStep,
  deleteStructuredHelpBlock,
  deleteStructuredHelpStep,
  getStructuredHelpContent,
  publishStructuredHelpContent,
  updateStructuredHelpBlock,
  updateStructuredHelpContent,
  updateStructuredHelpStep,
  type StructuredHelpBlockInput,
  type StructuredHelpBlockType,
} from "$lib/server/help/structuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isBlockType(value: string): value is StructuredHelpBlockType {
  return (
    value === "text" ||
    value === "image" ||
    value === "video" ||
    value === "notice" ||
    value === "link"
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseBlockInput(formData: FormData): StructuredHelpBlockInput | null {
  const blockType = readFormValue(formData, "blockType");
  if (!isBlockType(blockType)) return null;

  return {
    blockType,
    textContent: readFormValue(formData, "textContent"),
    sourceUrl: readFormValue(formData, "sourceUrl"),
    altText: readFormValue(formData, "altText"),
    transcript: readFormValue(formData, "transcript"),
    aiSummary: readFormValue(formData, "aiSummary"),
    linkUrl: readFormValue(formData, "linkUrl"),
    linkLabel: readFormValue(formData, "linkLabel"),
    noticeVariant: readFormValue(formData, "noticeVariant"),
  };
}

function validateBlockInput(input: StructuredHelpBlockInput): string | null {
  if (input.textContent.length > 50_000) return "O bloco de texto excede 50.000 caracteres.";
  if (input.altText.length > 500) return "O texto alternativo excede 500 caracteres.";
  if (input.transcript.length > 100_000) return "A transcrição excede 100.000 caracteres.";
  if (input.aiSummary.length > 20_000) return "O resumo para IA excede 20.000 caracteres.";
  if (input.linkLabel.length > 240) return "O texto do link excede 240 caracteres.";

  if (
    (input.blockType === "image" || input.blockType === "video") &&
    !isHttpUrl(input.sourceUrl)
  ) {
    return "Informe uma URL HTTP ou HTTPS válida para a mídia.";
  }

  if (input.blockType === "link" && !isHttpUrl(input.linkUrl)) {
    return "Informe uma URL HTTP ou HTTPS válida para o link.";
  }

  return null;
}

function getPublishErrorMessage(cause: unknown): string {
  if (!(cause instanceof Error)) return "Não foi possível publicar este conteúdo.";

  switch (cause.message) {
    case "CONTENT_STEP_REQUIRED":
      return "Adicione pelo menos um passo antes de publicar.";
    case "STEP_TITLE_REQUIRED":
      return "Todos os passos precisam de um título.";
    case "STEP_BLOCK_REQUIRED":
      return "Todos os passos precisam ter pelo menos um conteúdo: texto, imagem, vídeo, aviso ou link.";
    case "MEDIA_AI_KNOWLEDGE_REQUIRED":
      return "Um passo possui somente mídia. Adicione conhecimento para a IA no passo ou uma transcrição/resumo da mídia.";
    default:
      return "Não foi possível publicar. Revise os passos e tente novamente.";
  }
}

function contentEditorPath(contentId: string): string {
  return `/app/help/content/${contentId}`;
}

function redirectToContentEditor(contentId: string): never {
  throw redirect(303, contentEditorPath(contentId));
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.contentId)) throw error(404, "Conteúdo não encontrado.");

  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const content = await getStructuredHelpContent(params.contentId);
  if (!content) throw error(404, "Conteúdo não encontrado.");

  return {
    content,
    canEdit: hasPermission(permissions, "help.edit"),
    canPublish: hasPermission(permissions, "help.publish"),
  };
};

export const actions: Actions = {
  updateContent: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const title = readFormValue(formData, "title");
    const slug = readFormValue(formData, "slug");
    const summary = readFormValue(formData, "summary");
    const category = readFormValue(formData, "category");
    const aiGeneralKnowledge = readFormValue(formData, "aiGeneralKnowledge");

    if (title.length < 4 || title.length > 160 || summary.length > 320 || category.length > 120) {
      return fail(400, { success: false, message: "Revise título, resumo e categoria." });
    }
    if (aiGeneralKnowledge.length > 20_000) {
      return fail(400, { success: false, message: "O conhecimento geral da IA deve ter no máximo 20.000 caracteres." });
    }

    try {
      await updateStructuredHelpContent(session.user.id, params.contentId, {
        title,
        slug,
        summary,
        category,
        aiGeneralKnowledge,
      });
    } catch {
      return fail(409, { success: false, message: "Não foi possível salvar. Verifique se o endereço já está em uso." });
    }

    redirectToContentEditor(params.contentId);
  },

  addStep: async ({ cookies, params }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));

    try {
      await addStructuredHelpStep(session.user.id, params.contentId);
    } catch {
      return fail(409, { success: false, message: "Não foi possível adicionar o passo." });
    }

    redirectToContentEditor(params.contentId);
  },

  updateStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const stepId = readFormValue(formData, "stepId");
    const title = readFormValue(formData, "title");
    const description = readFormValue(formData, "description");
    const aiKnowledge = readFormValue(formData, "aiKnowledge");

    if (!isUuid(stepId) || title.length < 2 || title.length > 180 || description.length > 2000 || aiKnowledge.length > 20_000) {
      return fail(400, { success: false, message: "Revise os dados deste passo." });
    }

    try {
      await updateStructuredHelpStep(session.user.id, params.contentId, stepId, { title, description, aiKnowledge });
    } catch {
      return fail(404, { success: false, message: "Passo não encontrado." });
    }

    redirectToContentEditor(params.contentId);
  },

  deleteStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const stepId = readFormValue(formData, "stepId");
    if (!isUuid(stepId)) return fail(400, { success: false, message: "Passo inválido." });

    try {
      await deleteStructuredHelpStep(session.user.id, params.contentId, stepId);
    } catch (cause) {
      return fail(409, {
        success: false,
        message: cause instanceof Error && cause.message === "LAST_STEP_REQUIRED"
          ? "O conteúdo precisa manter pelo menos um passo."
          : "Não foi possível remover o passo.",
      });
    }

    redirectToContentEditor(params.contentId);
  },

  addBlock: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const stepId = readFormValue(formData, "stepId");
    const input = parseBlockInput(formData);
    if (!isUuid(stepId) || !input) return fail(400, { success: false, message: "Bloco inválido." });
    const validationMessage = validateBlockInput(input);
    if (validationMessage) return fail(400, { success: false, message: validationMessage });

    try {
      await addStructuredHelpBlock(session.user.id, params.contentId, stepId, input);
    } catch {
      return fail(409, { success: false, message: "Não foi possível adicionar este bloco." });
    }

    redirectToContentEditor(params.contentId);
  },

  updateBlock: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const blockId = readFormValue(formData, "blockId");
    const input = parseBlockInput(formData);
    if (!isUuid(blockId) || !input) return fail(400, { success: false, message: "Bloco inválido." });
    const validationMessage = validateBlockInput(input);
    if (validationMessage) return fail(400, { success: false, message: validationMessage });

    try {
      await updateStructuredHelpBlock(session.user.id, params.contentId, blockId, input);
    } catch {
      return fail(409, { success: false, message: "Não foi possível atualizar este bloco." });
    }

    redirectToContentEditor(params.contentId);
  },

  deleteBlock: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const blockId = readFormValue(formData, "blockId");
    if (!isUuid(blockId)) return fail(400, { success: false, message: "Bloco inválido." });

    try {
      await deleteStructuredHelpBlock(session.user.id, params.contentId, blockId);
    } catch {
      return fail(404, { success: false, message: "Bloco não encontrado." });
    }

    redirectToContentEditor(params.contentId);
  },

  publish: async ({ cookies, params }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.publish", contentEditorPath(params.contentId));

    try {
      await publishStructuredHelpContent(session.user.id, params.contentId);
    } catch (cause) {
      return fail(409, { success: false, message: getPublishErrorMessage(cause) });
    }

    redirectToContentEditor(params.contentId);
  },
};
