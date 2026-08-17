import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { listManagedHelpAssets } from "$lib/server/help/helpAssetRepository";
import { getTrainingBaseUrl, sendHelpTrainingInvite } from "$lib/server/help/helpTrainingMailer";
import {
  addHelpTrainingImage,
  addHelpTrainingStep,
  addHelpTrainingVideo,
  archiveHelpTrainingPath,
  createHelpTrainingInvite,
  deleteHelpTrainingMedia,
  deleteHelpTrainingStep,
  getHelpTrainingInsights,
  getHelpTrainingPath,
  listHelpTrainingParticipants,
  listTrainingSupportQueues,
  publishHelpTrainingPath,
  updateHelpTrainingFailureReason,
  updateHelpTrainingPath,
  updateHelpTrainingStep,
} from "$lib/server/help/helpTrainingRepository";

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

function redirectToEditor(pathId: string): never {
  throw redirect(303, editorPath(pathId));
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.pathId)) throw error(404, "Trilha não encontrada.");
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const path = await getHelpTrainingPath(params.pathId);
  if (!path) throw error(404, "Trilha não encontrada.");
  const [assets, queues, participants, insights] = await Promise.all([
    listManagedHelpAssets(300),
    listTrainingSupportQueues(),
    listHelpTrainingParticipants(params.pathId),
    getHelpTrainingInsights(params.pathId),
  ]);

  return {
    path,
    imageAssets: assets.filter((asset) => asset.assetType === "image"),
    queues,
    participants,
    insights,
    canEdit: hasPermission(permissions, "help.edit") && path.status !== "archived",
    canPublish: hasPermission(permissions, "help.publish") && path.status !== "archived",
  };
};

export const actions: Actions = {
  updatePath: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const title = read(formData, "title");
    const slug = read(formData, "slug");
    const audience = read(formData, "audience");
    const description = read(formData, "description");
    const welcomeMessage = read(formData, "welcomeMessage");
    const supportQueueId = read(formData, "supportQueueId");
    if (title.length < 4 || title.length > 160 || description.length > 1200 || welcomeMessage.length > 1200) {
      return fail(400, { success: false, message: "Revise os dados da trilha." });
    }
    try {
      await updateHelpTrainingPath(session.user.id, params.pathId, {
        title,
        slug,
        audience,
        description,
        welcomeMessage,
        supportQueueId: isUuid(supportQueueId) ? supportQueueId : null,
      });
    } catch {
      return fail(409, { success: false, message: "Não foi possível salvar a trilha." });
    }
    redirectToEditor(params.pathId);
  },

  addStep: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    await addHelpTrainingStep(session.user.id, params.pathId);
    redirectToEditor(params.pathId);
  },

  updateStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    if (!isUuid(stepId)) return fail(400, { success: false, message: "Microação inválida." });
    const estimatedSeconds = Number.parseInt(read(formData, "estimatedSeconds") || "45", 10);
    try {
      await updateHelpTrainingStep(session.user.id, params.pathId, stepId, {
        title: read(formData, "title"),
        instruction: read(formData, "instruction"),
        expectedResult: read(formData, "expectedResult"),
        successMessage: read(formData, "successMessage"),
        estimatedSeconds,
      });
    } catch {
      return fail(409, { success: false, message: "Não foi possível salvar esta microação." });
    }
    redirectToEditor(params.pathId);
  },

  deleteStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    if (!isUuid(stepId)) return fail(400, { success: false, message: "Microação inválida." });
    try {
      await deleteHelpTrainingStep(session.user.id, params.pathId, stepId);
    } catch (cause) {
      return fail(409, {
        success: false,
        message: cause instanceof Error && cause.message === "LAST_TRAINING_STEP_REQUIRED"
          ? "A trilha precisa manter pelo menos uma microação."
          : "Não foi possível remover esta microação.",
      });
    }
    redirectToEditor(params.pathId);
  },

  addImage: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const assetId = read(formData, "assetId");
    if (!isUuid(stepId) || !isUuid(assetId)) return fail(400, { success: false, message: "Selecione uma imagem válida." });
    try {
      await addHelpTrainingImage(session.user.id, params.pathId, stepId, assetId, read(formData, "altText"));
    } catch {
      return fail(409, { success: false, message: "Não foi possível adicionar a imagem." });
    }
    redirectToEditor(params.pathId);
  },

  addVideo: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const sourceUrl = read(formData, "sourceUrl");
    if (!isUuid(stepId) || !sourceUrl) return fail(400, { success: false, message: "Informe o vídeo." });
    try {
      await addHelpTrainingVideo(session.user.id, params.pathId, stepId, sourceUrl);
    } catch {
      return fail(400, { success: false, message: "Informe uma URL HTTP/HTTPS válida para a demonstração." });
    }
    redirectToEditor(params.pathId);
  },

  deleteMedia: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const mediaId = read(formData, "mediaId");
    if (!isUuid(stepId) || !isUuid(mediaId)) return fail(400, { success: false, message: "Mídia inválida." });
    await deleteHelpTrainingMedia(session.user.id, params.pathId, stepId, mediaId);
    redirectToEditor(params.pathId);
  },

  updateReason: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const reasonId = read(formData, "reasonId");
    if (!isUuid(stepId) || !isUuid(reasonId)) return fail(400, { success: false, message: "Motivo inválido." });
    await updateHelpTrainingFailureReason(session.user.id, params.pathId, stepId, reasonId, {
      label: read(formData, "label"),
      recoveryMessage: read(formData, "recoveryMessage"),
    });
    redirectToEditor(params.pathId);
  },

  publish: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.publish", editorPath(params.pathId));
    try {
      await publishHelpTrainingPath(session.user.id, params.pathId);
    } catch (cause) {
      const message = cause instanceof Error && cause.message === "TRAINING_STEP_INCOMPLETE"
        ? "Todas as microações precisam ter título, instrução e resultado esperado."
        : "Não foi possível publicar. Revise as microações e tente novamente.";
      return fail(409, { success: false, message });
    }
    redirectToEditor(params.pathId);
  },

  archive: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.publish", editorPath(params.pathId));
    try {
      await archiveHelpTrainingPath(session.user.id, params.pathId);
    } catch {
      return fail(409, { success: false, message: "Não foi possível arquivar esta trilha." });
    }
    redirectToEditor(params.pathId);
  },

  invite: async ({ cookies, params, request, url }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const name = read(formData, "name");
    const email = read(formData, "email").toLowerCase();
    const organizationName = read(formData, "organizationName");
    if (name.length < 2 || name.length > 160 || !/^\S+@\S+\.\S+$/.test(email)) {
      return fail(400, { success: false, message: "Informe nome e e-mail válidos para o participante." });
    }
    try {
      const invite = await createHelpTrainingInvite(session.user.id, params.pathId, { name, email, organizationName });
      const magicUrl = `${getTrainingBaseUrl(url.origin)}/treinamento/${invite.token}`;
      await sendHelpTrainingInvite({
        email,
        name,
        trainingTitle: invite.title,
        magicUrl,
        expiresAt: invite.expiresAt,
      });
    } catch (cause) {
      return fail(409, {
        success: false,
        message: cause instanceof Error && cause.message === "TRAINING_NOT_AVAILABLE_FOR_INVITE"
          ? "Publique a trilha antes de enviar convites."
          : "Não foi possível enviar o convite. Revise a configuração de e-mail e tente novamente.",
      });
    }
    redirectToEditor(params.pathId);
  },
};
