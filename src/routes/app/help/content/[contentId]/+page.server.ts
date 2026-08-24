import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import { publishHelpKnowledgeContent } from "$lib/server/help/helpKnowledgePublisher";
import {
  addStructuredHelpBlock,
  addStructuredHelpStep,
  deleteStructuredHelpBlock,
  deleteStructuredHelpFeaturedVideo,
  deleteStructuredHelpStep,
  getStructuredHelpContent,
  updateStructuredHelpBlock,
  updateStructuredHelpContent,
  updateStructuredHelpStep,
  upsertStructuredHelpFeaturedVideo,
  type StructuredHelpBlockInput,
  type StructuredHelpBlockType,
  type StructuredHelpContentCategoryInput,
  type StructuredHelpFeaturedVideoInput,
} from "$lib/server/help/structuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readAliases(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function readCategories(formData: FormData): StructuredHelpContentCategoryInput[] {
  return formData
    .getAll("categoryId")
    .filter((value): value is string => typeof value === "string" && isUuid(value))
    .map((categoryId, index) => ({
      categoryId,
      destinationUrl: readFormValue(formData, `categoryDestination:${categoryId}`),
      sortOrder: (index + 1) * 10,
    }));
}

function isBlockType(value: string): value is StructuredHelpBlockType {
  return (
    value === "text" ||
    value === "image" ||
    value === "notice" ||
    value === "link" ||
    value === "file"
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
    assistantDescription: readFormValue(formData, "assistantDescription"),
    subtitles: readFormValue(formData, "subtitles"),
    assistantSummary: readFormValue(formData, "assistantSummary"),
    extractedText: readFormValue(formData, "extractedText"),
    linkUrl: readFormValue(formData, "linkUrl"),
    linkLabel: readFormValue(formData, "linkLabel"),
    noticeVariant: readFormValue(formData, "noticeVariant"),
  };
}

function parseFeaturedVideoInput(formData: FormData): StructuredHelpFeaturedVideoInput {
  return {
    sourceUrl: readFormValue(formData, "sourceUrl"),
    altText: readFormValue(formData, "altText"),
    subtitles: readFormValue(formData, "subtitles"),
    assistantSummary: readFormValue(formData, "assistantSummary"),
  };
}

function validateBlockInput(input: StructuredHelpBlockInput): string | null {
  if (input.textContent.length > 50_000) return "O bloco de texto excede 50.000 caracteres.";
  if (input.altText.length > 500) return "O texto alternativo excede 500 caracteres.";
  if (input.assistantDescription.length > 20_000) return "A descrição adicional excede 20.000 caracteres.";
  if (input.subtitles.length > 200_000) return "Os subtitles excedem 200.000 caracteres.";
  if (input.assistantSummary.length > 20_000) return "O resumo do assistente excede 20.000 caracteres.";
  if (input.extractedText.length > 200_000) return "O texto extraído excede 200.000 caracteres.";
  if (input.linkLabel.length > 240) return "O texto do link excede 240 caracteres.";
  if (input.blockType === "link" && !isHttpUrl(input.linkUrl)) {
    return "Informe uma URL HTTP ou HTTPS válida para o link.";
  }
  if (input.sourceUrl && !isHttpUrl(input.sourceUrl)) {
    return "Informe uma URL HTTP ou HTTPS válida para a mídia.";
  }
  return null;
}

function validateFeaturedVideoInput(input: StructuredHelpFeaturedVideoInput): string | null {
  if (!isHttpUrl(input.sourceUrl)) {
    return "Informe uma URL HTTP ou HTTPS válida para o vídeo principal.";
  }
  if (input.altText.length > 500) {
    return "A descrição do vídeo deve ter no máximo 500 caracteres.";
  }
  if (!input.subtitles.trim()) {
    return "Adicione os subtitles do vídeo antes de salvá-lo.";
  }
  if (input.subtitles.length > 200_000) {
    return "Os subtitles do vídeo devem ter no máximo 200.000 caracteres.";
  }
  if (input.assistantSummary.length > 20_000) {
    return "O resumo operacional deve ter no máximo 20.000 caracteres.";
  }
  return null;
}

function getPublishErrorMessage(cause: unknown): string {
  if (!(cause instanceof Error)) return "Não foi possível publicar este conteúdo.";
  switch (cause.message) {
    case "CONTENT_REAL_CATEGORY_REQUIRED":
      return "Substitua a categoria “Sem categoria” por uma ou mais categorias reais antes de publicar.";
    case "CONTENT_CATEGORY_REQUIRED":
    case "CONTENT_CATEGORY_INVALID":
      return "Associe o conteúdo a pelo menos uma categoria ativa antes de publicar.";
    case "FEATURED_VIDEO_SUBTITLES_REQUIRED":
      return "O vídeo principal precisa ter subtitles antes da publicação.";
    case "CONTENT_STEP_REQUIRED":
      return "Adicione pelo menos um passo antes de publicar.";
    case "STEP_TITLE_REQUIRED":
      return "Todos os passos precisam de um título.";
    case "STEP_BLOCK_REQUIRED":
      return "Todos os passos precisam ter pelo menos um conteúdo público: texto, imagem, aviso, link ou arquivo.";
    case "IMAGE_DESCRIPTION_REQUIRED":
      return "Um passo formado apenas por imagens possui imagem sem texto alternativo ou descrição para o assistente.";
    default:
      return "Não foi possível publicar. Revise o conteúdo e tente novamente.";
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
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const [content, categories] = await Promise.all([
    getStructuredHelpContent(params.contentId),
    listHelpCategories(),
  ]);
  if (!content) throw error(404, "Conteúdo não encontrado.");

  const archived = content.status === "archived";
  return {
    content,
    categories,
    canEdit: !archived && hasPermission(permissions, "help.edit"),
    canPublish: !archived && hasPermission(permissions, "help.publish"),
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
    const searchAliases = readAliases(readFormValue(formData, "searchAliases"));
    const assistantKnowledge = readFormValue(formData, "assistantKnowledge");
    const internalSupportNotes = readFormValue(formData, "internalSupportNotes");
    const categories = readCategories(formData);

    if (
      title.length < 4 ||
      title.length > 160 ||
      summary.length > 320 ||
      assistantKnowledge.length > 40_000 ||
      internalSupportNotes.length > 40_000 ||
      searchAliases.length > 80 ||
      categories.length === 0
    ) {
      return fail(400, { success: false, message: "Revise as informações gerais e selecione ao menos uma categoria." });
    }

    try {
      await updateStructuredHelpContent(session.user.id, params.contentId, {
        title,
        slug,
        summary,
        searchAliases,
        assistantKnowledge,
        internalSupportNotes,
        categories,
      });
    } catch (cause) {
      return fail(409, {
        success: false,
        message:
          cause instanceof Error && cause.message.startsWith("CONTENT_CATEGORY")
            ? "Selecione somente categorias ativas e mantenha ao menos uma associação."
            : "Não foi possível salvar. Verifique se o endereço já está em uso.",
      });
    }
    redirectToContentEditor(params.contentId);
  },

  updateFeaturedVideo: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const input = parseFeaturedVideoInput(await request.formData());
    const validationMessage = validateFeaturedVideoInput(input);
    if (validationMessage) return fail(400, { success: false, message: validationMessage });

    try {
      await upsertStructuredHelpFeaturedVideo(session.user.id, params.contentId, input);
    } catch {
      return fail(409, { success: false, message: "Não foi possível salvar o vídeo principal." });
    }
    redirectToContentEditor(params.contentId);
  },

  deleteFeaturedVideo: async ({ cookies, params }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    try {
      await deleteStructuredHelpFeaturedVideo(session.user.id, params.contentId);
    } catch {
      return fail(409, { success: false, message: "Não foi possível remover o vídeo principal." });
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
    const assistantKnowledge = readFormValue(formData, "assistantKnowledge");

    if (!isUuid(stepId) || title.length < 2 || title.length > 180 || description.length > 2_000 || assistantKnowledge.length > 20_000) {
      return fail(400, { success: false, message: "Revise os dados deste passo." });
    }
    try {
      await updateStructuredHelpStep(session.user.id, params.contentId, stepId, {
        title,
        description,
        assistantKnowledge,
      });
    } catch {
      return fail(404, { success: false, message: "Passo não encontrado." });
    }
    redirectToContentEditor(params.contentId);
  },

  deleteStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const stepId = readFormValue(await request.formData(), "stepId");
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
    const blockId = readFormValue(await request.formData(), "blockId");
    if (!isUuid(blockId)) return fail(400, { success: false, message: "Bloco inválido." });
    try {
      await deleteStructuredHelpBlock(session.user.id, params.contentId, blockId);
    } catch {
      return fail(409, { success: false, message: "Não foi possível remover este bloco." });
    }
    redirectToContentEditor(params.contentId);
  },

  publish: async ({ cookies, params }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.publish", contentEditorPath(params.contentId));
    try {
      await publishHelpKnowledgeContent(session.user.id, params.contentId);
    } catch (cause) {
      return fail(409, { success: false, message: getPublishErrorMessage(cause) });
    }
    redirectToContentEditor(params.contentId);
  },
};
