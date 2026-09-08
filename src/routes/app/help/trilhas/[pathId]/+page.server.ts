import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  deleteHelpTrainingDraftPath,
  moveHelpTrainingStep,
  publishHelpTrainingPathDraft,
  updateHelpTrainingPathDraft,
  updateHelpTrainingStepDraft,
} from "$lib/server/help/helpTrainingAuthoringRepository";
import { getCombinedHelpTrainingInsights } from "$lib/server/help/helpTrainingInsightsRepository";
import { HELP_YOUTUBE_EXTRACTION_ENABLED } from "$lib/server/help/helpVideoImportAutomation";
import {
  addHelpTrainingModuleFromPublishedContent,
  localizeHelpTrainingPathVideos,
  moveHelpTrainingModule,
  regenerateHelpTrainingFromPublishedContent,
  removeHelpTrainingModule,
} from "$lib/server/help/helpTrainingGeneration";
import { getTrainingBaseUrl, sendHelpTrainingInvite } from "$lib/server/help/helpTrainingMailer";
import {
  archiveHelpTrainingPath,
  createHelpTrainingInvite,
  deleteHelpTrainingStep,
  getHelpTrainingPath,
  listHelpTrainingParticipants,
} from "$lib/server/help/helpTrainingRepository";
import {
  getPublishedStructuredHelpById,
  listPublishedStructuredHelpCatalog,
} from "$lib/server/help/publicStructuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function editorPath(pathId: string): string {
  return `/app/help/trilhas/${pathId}`;
}

function direction(value: string): "up" | "down" | null {
  return value === "up" || value === "down" ? value : null;
}

function moduleErrorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "TRAINING_PATH_ITEM_DUPLICATE") return "Este conteúdo já faz parte da trilha.";
  if (code === "TRAINING_SOURCE_CONTENT_LIMIT") return "Uma trilha pode ter até 20 módulos.";
  if (code === "LAST_TRAINING_MODULE_REQUIRED") return "A trilha precisa manter pelo menos um módulo.";
  if (code === "TRAINING_SOURCE_CONTENT_NOT_PUBLISHED") return "Selecione um conteúdo publicado válido.";
  if (code === "TRAINING_SOURCE_CONTENT_VIDEO_REQUIRED") return "O conteúdo publicado precisa ter um vídeo para gerar o módulo.";
  if (code === "TRAINING_SOURCE_CONTENT_STEPS_REQUIRED") return "O conteúdo publicado precisa ter pelo menos uma etapa.";
  if (code === "AI_TIMEOUT") return "A geração do novo módulo demorou além do limite. Tente novamente.";
  if (code === "AI_EMPTY_RESPONSE" || code === "AI_OUTPUT_INCOMPLETE") {
    return "A IA não retornou dados suficientes para montar o novo módulo. Tente novamente.";
  }
  if (code.startsWith("HELP_VIDEO_")) return localVideoErrorMessage(cause);
  return "Não foi possível atualizar os módulos da trilha.";
}

function isYoutubeUrl(value: string | null): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return hostname === "youtu.be"
      || hostname === "youtube.com"
      || hostname === "www.youtube.com"
      || hostname === "m.youtube.com";
  } catch {
    return false;
  }
}

function localVideoErrorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "HELP_VIDEO_YOUTUBE_COOKIES_NOT_FOUND") {
    return "O arquivo de cookies do YouTube configurado no servidor não foi encontrado.";
  }
  if (code === "HELP_VIDEO_YOUTUBE_COOKIES_INVALID") {
    return "Este vídeo exige autenticação no YouTube e os cookies de fallback estão inválidos.";
  }
  if (code === "HELP_VIDEO_YOUTUBE_AUTH_REQUIRED") {
    return "Este vídeo exige autenticação no YouTube. Vídeos públicos usam o fluxo automático sem cookies.";
  }
  if (code === "HELP_VIDEO_YTDLP_POT_PROVIDER_URL_INVALID") {
    return "A URL configurada para o provedor automático do YouTube é inválida.";
  }
  if (code === "HELP_VIDEO_LOCAL_COPY_TOO_LARGE") {
    return "O vídeo não coube no limite da cópia local mesmo na qualidade reduzida.";
  }
  if (code === "HELP_VIDEO_YOUTUBE_DOWNLOAD_NOT_FOUND") {
    return "O YouTube não disponibilizou uma versão MP4 adequada para a trilha.";
  }
  if (code === "HELP_VIDEO_COMMAND_TIMEOUT") {
    return "O download do vídeo demorou além do limite permitido.";
  }
  return "Não foi possível preparar a cópia local do vídeo.";
}

function publishErrorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "TRAINING_STEP_INCOMPLETE") return "Toda orientação precisa ter título e instrução.";
  if (code === "TRAINING_STEP_VIDEO_REQUIRED") return "Cada slide da trilha precisa ter a ajuda em vídeo vinculada.";
  if (code === "TRAINING_VIDEO_INVALID" || code === "INVALID_MEDIA_URL") return "A referência do vídeo publicado não é válida.";
  return "Não foi possível publicar. Revise as orientações.";
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.pathId)) throw error(404, "Trilha não encontrada.");
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const path = await getHelpTrainingPath(params.pathId);
  if (!path) throw error(404, "Trilha não encontrada.");

  const [participants, insights, currentPublications, publishedCatalog] = await Promise.all([
    listHelpTrainingParticipants(params.pathId),
    getCombinedHelpTrainingInsights(params.pathId),
    Promise.all(
      path.items.map((item) => getPublishedStructuredHelpById(item.sourceContentId)),
    ),
    listPublishedStructuredHelpCatalog(),
  ]);
  const canEditPermission = hasPermission(permissions, "help.edit");
  const canPublishPermission = hasPermission(permissions, "help.publish");
  const sourceUpdates = path.items.map((item, index) => {
    const currentPublication = currentPublications[index] ?? null;
    return {
      itemId: item.id,
      title: item.sourcePublicationSnapshot.title,
      updateAvailable: Boolean(
        currentPublication &&
        currentPublication.publishedAt.getTime() > item.sourcePublishedAt.getTime(),
      ),
    };
  });
  const sourceUpdateAvailable = sourceUpdates.some((item) => item.updateAvailable);
  const currentSourceIds = new Set(path.items.map((item) => item.sourceContentId));
  const availableContents = publishedCatalog.filter(
    (content) => !currentSourceIds.has(content.contentId),
  );
  const hasRemoteYoutubeVideos = HELP_YOUTUBE_EXTRACTION_ENABLED && path.steps.some((step) =>
    step.media.some(
      (media) => media.mediaType === "video"
        && Boolean(media.sourceUrl)
        && !media.sourceUrl?.startsWith("asset:")
        && isYoutubeUrl(media.sourceUrl),
    ),
  );

  return {
    path,
    participants,
    insights,
    sourceUpdates,
    sourceUpdateAvailable,
    availableContents,
    hasRemoteYoutubeVideos,
    canEdit: canEditPermission && path.status !== "archived",
    canPublish: canPublishPermission && path.status !== "archived",
    canDelete: canEditPermission && path.currentVersion === 0,
    canArchive: canPublishPermission && path.currentVersion > 0 && path.status !== "archived",
    previewUrl: `/app/help/trilhas/${path.id}/preview`,
    publicUrl: path.accessMode === "public" && path.currentVersion > 0 && path.status !== "archived"
      ? `/treinamento/trilha/${encodeURIComponent(path.slug)}`
      : null,
  };
};

export const actions: Actions = {
  updatePath: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const title = read(formData, "title");
    const audience = read(formData, "audience");
    const description = read(formData, "description");
    const welcomeMessage = read(formData, "welcomeMessage");
    if (title.length < 4 || title.length > 160 || audience.length > 160 || description.length > 1200 || welcomeMessage.length > 1200) {
      return fail(400, { success: false, message: "Revise os dados da trilha." });
    }
    try {
      await updateHelpTrainingPathDraft(session.user.id, params.pathId, {
        title,
        slug: read(formData, "slug"),
        audience,
        description,
        welcomeMessage,
        supportQueueId: null,
        accessMode: read(formData, "accessMode") === "public" ? "public" : "invite_only",
      });
      return { success: true, message: "Configuração salva." };
    } catch {
      return fail(409, { success: false, message: "Não foi possível salvar a trilha." });
    }
  },

  updateStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    if (!isUuid(stepId)) return fail(400, { success: false, message: "Orientação inválida." });
    try {
      await updateHelpTrainingStepDraft(session.user.id, params.pathId, stepId, {
        title: read(formData, "title"),
        question: read(formData, "question"),
        instruction: read(formData, "instruction"),
        expectedResult: read(formData, "expectedResult"),
        successMessage: read(formData, "successMessage"),
        primaryActionLabel: read(formData, "primaryActionLabel"),
        estimatedSeconds: Number.parseInt(read(formData, "estimatedSeconds") || "45", 10),
        videoStartSeconds: Number.parseInt(read(formData, "videoStartSeconds") || "0", 10),
        videoEndSeconds: Number.parseInt(read(formData, "videoEndSeconds") || "0", 10),
        interactionMode: read(formData, "interactionMode") === "presentation" ? "presentation" : "action",
      });
      return { success: true, message: "Orientação salva.", openStepId: stepId };
    } catch {
      return fail(409, { success: false, message: "Não foi possível salvar esta orientação.", openStepId: stepId });
    }
  },

  moveStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const moveDirection = direction(read(formData, "direction"));
    if (!isUuid(stepId) || !moveDirection) return fail(400, { success: false, message: "Movimentação inválida." });
    await moveHelpTrainingStep(session.user.id, params.pathId, stepId, moveDirection);
    return { success: true, message: "Ordem atualizada.", openStepId: stepId };
  },

  deleteStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const stepId = read(await request.formData(), "stepId");
    if (!isUuid(stepId)) return fail(400, { success: false, message: "Orientação inválida." });
    try {
      await deleteHelpTrainingStep(session.user.id, params.pathId, stepId);
      return { success: true, message: "Orientação removida." };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      return fail(409, {
        success: false,
        message: code === "LAST_TRAINING_MODULE_STEP_REQUIRED"
          ? "O módulo precisa manter pelo menos uma orientação. Para removê-lo, exclua o módulo inteiro."
          : "A trilha precisa manter pelo menos uma orientação.",
      });
    }
  },

  addModule: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const contentId = read(await request.formData(), "contentId");
    if (!isUuid(contentId)) return fail(400, { success: false, message: "Selecione um conteúdo publicado." });

    try {
      await addHelpTrainingModuleFromPublishedContent(session.user.id, params.pathId, contentId);
      return { success: true, message: "Módulo adicionado ao rascunho da trilha." };
    } catch (cause) {
      console.error("[help-training] add module failed", {
        pathId: params.pathId,
        technicalCode: cause instanceof Error ? cause.message : "TRAINING_MODULE_ADD_FAILED",
        cause,
      });
      return fail(409, { success: false, message: moduleErrorMessage(cause) });
    }
  },

  moveModule: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const pathItemId = read(formData, "pathItemId");
    const moveDirection = direction(read(formData, "direction"));
    if (!isUuid(pathItemId) || !moveDirection) {
      return fail(400, { success: false, message: "Movimentação de módulo inválida." });
    }

    try {
      await moveHelpTrainingModule(session.user.id, params.pathId, pathItemId, moveDirection);
      return { success: true, message: "Ordem dos módulos atualizada." };
    } catch (cause) {
      return fail(409, { success: false, message: moduleErrorMessage(cause) });
    }
  },

  removeModule: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const pathItemId = read(await request.formData(), "pathItemId");
    if (!isUuid(pathItemId)) return fail(400, { success: false, message: "Módulo inválido." });

    try {
      await removeHelpTrainingModule(session.user.id, params.pathId, pathItemId);
      return { success: true, message: "Módulo removido do rascunho da trilha." };
    } catch (cause) {
      return fail(409, { success: false, message: moduleErrorMessage(cause) });
    }
  },

  localizeVideos: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    if (!HELP_YOUTUBE_EXTRACTION_ENABLED) {
      return fail(403, {
        success: false,
        message: "A preparação de MP4 a partir do YouTube está temporariamente desabilitada.",
      });
    }
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));

    try {
      const updatedSteps = await localizeHelpTrainingPathVideos(session.user.id, params.pathId);
      if (updatedSteps === 0) {
        return { success: true, message: "Os vídeos desta trilha já estão preparados para reprodução local." };
      }
      return {
        success: true,
        message: "MP4 local preparado sem regenerar as orientações. Publique uma nova versão da trilha para disponibilizar a correção.",
      };
    } catch (cause) {
      console.error("[help-training] local video preparation failed", {
        pathId: params.pathId,
        technicalCode: cause instanceof Error ? cause.message : "TRAINING_LOCAL_VIDEO_FAILED",
        cause,
      });
      return fail(409, { success: false, message: localVideoErrorMessage(cause) });
    }
  },

  regenerate: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    try {
      await regenerateHelpTrainingFromPublishedContent(session.user.id, params.pathId);
      return { success: true, message: "Orientações regeneradas com a publicação mais recente." };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      const message =
        code === "TRAINING_SOURCE_CONTENT_VIDEO_REQUIRED"
          ? "O conteúdo publicado precisa ter um vídeo para gerar a trilha."
          : code === "TRAINING_SOURCE_CONTENT_STEPS_REQUIRED"
            ? "O conteúdo publicado precisa ter pelo menos uma etapa."
            : "Não foi possível regenerar a trilha. Verifique a configuração da IA e o conteúdo publicado.";
      return fail(409, { success: false, message });
    }
  },

  publish: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.publish", editorPath(params.pathId));
    try {
      const version = await publishHelpTrainingPathDraft(session.user.id, params.pathId);
      return { success: true, message: `Versão ${version} publicada.` };
    } catch (cause) {
      return fail(409, { success: false, message: publishErrorMessage(cause) });
    }
  },

  archive: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.publish", editorPath(params.pathId));
    try {
      await archiveHelpTrainingPath(session.user.id, params.pathId);
      return { success: true, message: "Trilha arquivada." };
    } catch {
      return fail(409, { success: false, message: "Não foi possível arquivar esta trilha." });
    }
  },

  deletePath: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    try {
      await deleteHelpTrainingDraftPath(session.user.id, params.pathId);
    } catch {
      return fail(409, { success: false, message: "Não foi possível excluir esta trilha." });
    }
    throw redirect(303, "/app/help/trilhas");
  },

  invite: async ({ cookies, params, request, url }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const name = read(formData, "name");
    const email = read(formData, "email").toLowerCase();
    const organizationName = read(formData, "organizationName");
    if (name.length < 2 || name.length > 160 || !/^\S+@\S+\.\S+$/.test(email)) {
      return fail(400, { success: false, message: "Informe nome e e-mail válidos." });
    }
    try {
      const invite = await createHelpTrainingInvite(session.user.id, params.pathId, { name, email, organizationName });
      const magicUrl = `${getTrainingBaseUrl(url.origin)}/treinamento/${invite.token}`;
      await sendHelpTrainingInvite({ email, name, trainingTitle: invite.title, magicUrl, expiresAt: invite.expiresAt });
      return { success: true, message: `Convite enviado para ${email}.` };
    } catch {
      return fail(409, { success: false, message: "Publique a trilha e confirme a configuração de e-mail antes de convidar." });
    }
  },
};
