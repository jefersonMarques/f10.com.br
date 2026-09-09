import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import { moveHelpBlock, moveHelpStep, type HelpMoveDirection } from "$lib/server/help/helpContentOrdering";
import { publishHelpKnowledgeContent } from "$lib/server/help/helpKnowledgePublisher";
import { findImportedHelpVideoByChecksum } from "$lib/server/help/helpImportedFeaturedVideo";
import {
  createManagedHelpAsset,
  deleteManagedHelpAsset,
} from "$lib/server/help/helpAssetRepository";
import {
  addStructuredHelpBlock,
  addStructuredHelpStep,
  deleteStructuredHelpBlock,
  deleteStructuredHelpFeaturedVideo,
  deleteStructuredHelpStep,
  getStructuredHelpContent,
  setStructuredHelpFeaturedVideoAsset,
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

function readMoveDirection(formData: FormData): HelpMoveDirection | null {
  const value = readFormValue(formData, "direction");
  return value === "up" || value === "down" ? value : null;
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

function validateFeaturedVideoMetadata(input: StructuredHelpFeaturedVideoInput): string | null {
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

function validateFeaturedVideoUrl(input: StructuredHelpFeaturedVideoInput): string | null {
  return isHttpUrl(input.sourceUrl)
    ? null
    : "Informe uma URL HTTP ou HTTPS válida para o vídeo principal ou selecione um MP4.";
}

function featuredVideoUploadErrorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "ASSET_SIZE_NOT_ALLOWED") return "O vídeo MP4 deve ter no máximo 25 MB.";
  if (code === "ASSET_MIME_NOT_ALLOWED" || code === "FEATURED_VIDEO_MP4_REQUIRED") {
    return "Use um arquivo MP4 válido.";
  }
  if (code === "ASSET_CONTENT_MISMATCH") {
    return "O arquivo selecionado não possui uma estrutura MP4 válida.";
  }
  if (code === "HELP_VIDEO_ALREADY_USED") {
    return "Este vídeo já pertence a outro conteúdo.";
  }
  return "Não foi possível salvar o vídeo principal.";
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
    case "STEP_IMAGE_LIMIT_EXCEEDED":
      return "Cada passo pode ter no máximo um screenshot. Remova a imagem excedente antes de publicar.";
    case "HUMAN_REVIEW_REQUIRED":
      return "Conclua a Revisão humana de todas as imagens e use “Salvar tudo” antes de publicar.";
    case "IMAGE_DESCRIPTION_REQUIRED":
      return "Um passo formado apenas por imagens possui imagem sem texto alternativo ou descrição para o assistente.";
    default:
      return "Não foi possível publicar. Revise o conteúdo e tente novamente.";
  }
}

function contentEditorPath(contentId: string, stepId?: string): string {
  const base = `/app/help/content/${contentId}`;
  return stepId && isUuid(stepId)
    ? `${base}?step=${encodeURIComponent(stepId)}`
    : base;
}

function redirectToContentEditor(contentId: string, stepId?: string): never {
  throw redirect(303, contentEditorPath(contentId, stepId));
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

  updateAdvanced: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) {
      return fail(404, { success: false, message: "Conteúdo não encontrado." });
    }
    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      contentEditorPath(params.contentId),
    );
    const formData = await request.formData();
    const content = await getStructuredHelpContent(params.contentId);
    if (!content) {
      return fail(404, { success: false, message: "Conteúdo não encontrado." });
    }

    const searchAliases = readAliases(readFormValue(formData, "searchAliases"));
    const assistantKnowledge = readFormValue(formData, "assistantKnowledge");
    const internalSupportNotes = readFormValue(formData, "internalSupportNotes");
    if (
      searchAliases.length > 80 ||
      assistantKnowledge.length > 40_000 ||
      internalSupportNotes.length > 40_000
    ) {
      return fail(400, { success: false, message: "Revise as configurações avançadas." });
    }

    try {
      await updateStructuredHelpContent(session.user.id, params.contentId, {
        title: content.title,
        slug: content.slug,
        summary: content.summary,
        searchAliases,
        assistantKnowledge,
        internalSupportNotes,
        categories: content.categories.map((category, index) => ({
          categoryId: category.id,
          destinationUrl: category.destinationUrl,
          sortOrder: category.sortOrder || (index + 1) * 10,
        })),
      });
    } catch {
      return fail(409, {
        success: false,
        message: "Não foi possível salvar as configurações avançadas.",
      });
    }
    redirectToContentEditor(params.contentId);
  },

  updateFeaturedVideo: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const input = parseFeaturedVideoInput(formData);
    const metadataValidationMessage = validateFeaturedVideoMetadata(input);
    if (metadataValidationMessage) {
      return fail(400, { success: false, message: metadataValidationMessage });
    }

    const fileValue = formData.get("videoFile");
    const videoFile = fileValue instanceof File && fileValue.size > 0 ? fileValue : null;

    if (videoFile) {
      if (videoFile.type.toLowerCase() !== "video/mp4") {
        return fail(400, { success: false, message: "Use um arquivo MP4 válido." });
      }

      let uploadedAssetId: string | null = null;
      let createdNewAsset = false;
      try {
        const bytes = new Uint8Array(await videoFile.arrayBuffer());
        const duplicate = await findImportedHelpVideoByChecksum(bytes);
        if (duplicate?.contentId && duplicate.contentId !== params.contentId) {
          throw new Error("HELP_VIDEO_ALREADY_USED");
        }

        const uploaded = duplicate?.contentId === params.contentId
          ? { asset: await (async () => {
              const currentContent = await getStructuredHelpContent(params.contentId);
              const existing = currentContent?.featuredVideo?.id === duplicate.assetId
                ? currentContent.featuredVideo
                : null;
              if (existing) return existing;
              const managed = await createManagedHelpAsset(session.user.id, {
                fileName: videoFile.name || "video.mp4",
                mimeType: videoFile.type,
                bytes,
                altText: input.altText,
                assistantSummary: input.assistantSummary,
                contentId: params.contentId,
                deduplicate: true,
              });
              return managed.asset;
            })(), reused: true }
          : await createManagedHelpAsset(session.user.id, {
              fileName: videoFile.name || "video.mp4",
              mimeType: videoFile.type,
              bytes,
              altText: input.altText,
              assistantSummary: input.assistantSummary,
              contentId: params.contentId,
              deduplicate: false,
            });
        uploadedAssetId = uploaded.asset.id;
        createdNewAsset = !uploaded.reused;

        await setStructuredHelpFeaturedVideoAsset(
          session.user.id,
          params.contentId,
          uploaded.asset.id,
          {
            altText: input.altText,
            subtitles: input.subtitles,
            assistantSummary: input.assistantSummary,
          },
        );
      } catch (cause) {
        if (uploadedAssetId && createdNewAsset) {
          await deleteManagedHelpAsset(session.user.id, uploadedAssetId).catch(() => undefined);
        }
        return fail(409, { success: false, message: featuredVideoUploadErrorMessage(cause) });
      }

      redirectToContentEditor(params.contentId);
    }

    try {
      const currentContent = await getStructuredHelpContent(params.contentId);
      if (currentContent?.featuredVideo?.storageKey) {
        await setStructuredHelpFeaturedVideoAsset(
          session.user.id,
          params.contentId,
          currentContent.featuredVideo.id,
          {
            altText: input.altText,
            subtitles: input.subtitles,
            assistantSummary: input.assistantSummary,
          },
        );
      } else {
        const urlValidationMessage = validateFeaturedVideoUrl(input);
        if (urlValidationMessage) {
          return fail(400, { success: false, message: urlValidationMessage });
        }
        await upsertStructuredHelpFeaturedVideo(session.user.id, params.contentId, input);
      }
    } catch (cause) {
      return fail(409, { success: false, message: featuredVideoUploadErrorMessage(cause) });
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
      const stepId = await addStructuredHelpStep(session.user.id, params.contentId);
      redirectToContentEditor(params.contentId, stepId);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível adicionar o passo." });
    }
  },

  moveStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const stepId = readFormValue(formData, "stepId");
    const direction = readMoveDirection(formData);
    if (!isUuid(stepId) || !direction) return fail(400, { success: false, message: "Movimentação inválida." });
    try {
      await moveHelpStep(session.user.id, params.contentId, stepId, direction);
    } catch {
      return fail(409, { success: false, message: "Não foi possível reordenar este passo." });
    }
    redirectToContentEditor(params.contentId, stepId);
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
    redirectToContentEditor(params.contentId, stepId);
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
    redirectToContentEditor(params.contentId, stepId);
  },

  moveBlock: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const stepId = readFormValue(formData, "stepId");
    const blockId = readFormValue(formData, "blockId");
    const direction = readMoveDirection(formData);
    if (!isUuid(blockId) || !direction) return fail(400, { success: false, message: "Movimentação inválida." });
    try {
      await moveHelpBlock(session.user.id, params.contentId, blockId, direction);
    } catch {
      return fail(409, { success: false, message: "Não foi possível reordenar este bloco." });
    }
    redirectToContentEditor(params.contentId, stepId);
  },

  updateBlock: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const stepId = readFormValue(formData, "stepId");
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
    redirectToContentEditor(params.contentId, stepId);
  },

  deleteBlock: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) return fail(404, { success: false, message: "Conteúdo não encontrado." });
    const { session } = await requireAppPermission(cookies, "help.edit", contentEditorPath(params.contentId));
    const formData = await request.formData();
    const stepId = readFormValue(formData, "stepId");
    const blockId = readFormValue(formData, "blockId");
    if (!isUuid(blockId)) return fail(400, { success: false, message: "Bloco inválido." });
    try {
      await deleteStructuredHelpBlock(session.user.id, params.contentId, blockId);
    } catch {
      return fail(409, { success: false, message: "Não foi possível remover este bloco." });
    }
    redirectToContentEditor(params.contentId, stepId);
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
