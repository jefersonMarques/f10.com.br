import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  addHelpTrainingFailureReason,
  deleteHelpTrainingDraftPath,
  deleteHelpTrainingFailureReason,
  moveHelpTrainingFailureReason,
  moveHelpTrainingStep,
  publishHelpTrainingPathDraft,
  updateHelpTrainingPathDraft,
  updateHelpTrainingStepDraft,
} from "$lib/server/help/helpTrainingAuthoringRepository";
import { getCombinedHelpTrainingInsights } from "$lib/server/help/helpTrainingInsightsRepository";
import { getTrainingBaseUrl, sendHelpTrainingInvite } from "$lib/server/help/helpTrainingMailer";
import {
  addHelpTrainingStep,
  archiveHelpTrainingPath,
  createHelpTrainingInvite,
  deleteHelpTrainingMedia,
  deleteHelpTrainingStep,
  getHelpTrainingPath,
  listHelpTrainingParticipants,
  listTrainingSupportQueues,
  updateHelpTrainingFailureReason,
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

function direction(value: string): "up" | "down" | null {
  return value === "up" || value === "down" ? value : null;
}

function publishErrorMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "TRAINING_PUBLISH_FAILED";
  if (code === "TRAINING_STEP_INCOMPLETE") return "Toda microação precisa ter título e conteúdo.";
  if (code === "TRAINING_STEP_RESULT_REQUIRED") return "Toda microação do tipo ação precisa informar o resultado esperado.";
  if (code === "TRAINING_FAILURE_REASON_REQUIRED") return "Toda microação do tipo ação precisa ter ao menos um motivo para “Não consegui”.";
  if (code === "TRAINING_VIDEO_INVALID" || code === "INVALID_MEDIA_URL") return "Há um vídeo inválido em uma das microações.";
  return "Não foi possível publicar. Revise as microações e tente novamente.";
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.pathId)) throw error(404, "Trilha não encontrada.");
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const path = await getHelpTrainingPath(params.pathId);
  if (!path) throw error(404, "Trilha não encontrada.");
  const [queues, participants, insights] = await Promise.all([
    listTrainingSupportQueues(),
    listHelpTrainingParticipants(params.pathId),
    getCombinedHelpTrainingInsights(params.pathId),
  ]);
  const canEditPermission = hasPermission(permissions, "help.edit");
  const canPublishPermission = hasPermission(permissions, "help.publish");

  return {
    path,
    queues,
    participants,
    insights,
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
    const slug = read(formData, "slug");
    const audience = read(formData, "audience");
    const description = read(formData, "description");
    const welcomeMessage = read(formData, "welcomeMessage");
    const supportQueueId = read(formData, "supportQueueId");
    const accessMode = read(formData, "accessMode") === "public" ? "public" : "invite_only";
    if (title.length < 4 || title.length > 160 || audience.length > 160 || description.length > 1200 || welcomeMessage.length > 1200) {
      return fail(400, { success: false, message: "Revise os dados da trilha." });
    }
    try {
      await updateHelpTrainingPathDraft(session.user.id, params.pathId, {
        title,
        slug,
        audience,
        description,
        welcomeMessage,
        supportQueueId: isUuid(supportQueueId) ? supportQueueId : null,
        accessMode,
      });
      return { success: true, message: "Configuração salva." };
    } catch {
      return fail(409, { success: false, message: "Não foi possível salvar a trilha. Verifique se o endereço já está em uso." });
    }
  },

  addStep: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    try {
      const stepId = await addHelpTrainingStep(session.user.id, params.pathId);
      return { success: true, message: "Microação adicionada.", openStepId: stepId };
    } catch {
      return fail(409, { success: false, message: "Não foi possível adicionar a microação." });
    }
  },

  updateStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    if (!isUuid(stepId)) return fail(400, { success: false, message: "Microação inválida." });
    const interactionMode = read(formData, "interactionMode") === "presentation" ? "presentation" : "action";
    const estimatedSeconds = Number.parseInt(read(formData, "estimatedSeconds") || "45", 10);
    try {
      await updateHelpTrainingStepDraft(session.user.id, params.pathId, stepId, {
        title: read(formData, "title"),
        instruction: read(formData, "instruction"),
        expectedResult: read(formData, "expectedResult"),
        successMessage: read(formData, "successMessage"),
        estimatedSeconds,
        interactionMode,
      });
      return { success: true, message: "Microação salva.", openStepId: stepId };
    } catch {
      return fail(409, { success: false, message: "Não foi possível salvar esta microação.", openStepId: stepId });
    }
  },

  moveStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const moveDirection = direction(read(formData, "direction"));
    if (!isUuid(stepId) || !moveDirection) return fail(400, { success: false, message: "Movimentação inválida." });
    try {
      await moveHelpTrainingStep(session.user.id, params.pathId, stepId, moveDirection);
      return { success: true, message: "Ordem atualizada.", openStepId: stepId };
    } catch {
      return fail(409, { success: false, message: "Não foi possível reordenar esta microação.", openStepId: stepId });
    }
  },

  deleteStep: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    if (!isUuid(stepId)) return fail(400, { success: false, message: "Microação inválida." });
    try {
      await deleteHelpTrainingStep(session.user.id, params.pathId, stepId);
      return { success: true, message: "Microação removida." };
    } catch (cause) {
      return fail(409, {
        success: false,
        message: cause instanceof Error && cause.message === "LAST_TRAINING_STEP_REQUIRED"
          ? "A trilha precisa manter pelo menos uma microação."
          : "Não foi possível remover esta microação.",
      });
    }
  },

  deleteMedia: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const mediaId = read(formData, "mediaId");
    if (!isUuid(stepId) || !isUuid(mediaId)) return fail(400, { success: false, message: "Mídia inválida." });
    try {
      await deleteHelpTrainingMedia(session.user.id, params.pathId, stepId, mediaId);
      return { success: true, message: "Mídia removida.", openStepId: stepId };
    } catch {
      return fail(409, { success: false, message: "Não foi possível remover a mídia.", openStepId: stepId });
    }
  },

  addReason: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    if (!isUuid(stepId)) return fail(400, { success: false, message: "Microação inválida." });
    try {
      await addHelpTrainingFailureReason(session.user.id, params.pathId, stepId);
      return { success: true, message: "Motivo adicionado.", openStepId: stepId };
    } catch {
      return fail(409, { success: false, message: "Não foi possível adicionar o motivo.", openStepId: stepId });
    }
  },

  updateReason: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const reasonId = read(formData, "reasonId");
    if (!isUuid(stepId) || !isUuid(reasonId)) return fail(400, { success: false, message: "Motivo inválido." });
    try {
      await updateHelpTrainingFailureReason(session.user.id, params.pathId, stepId, reasonId, {
        label: read(formData, "label"),
        recoveryMessage: read(formData, "recoveryMessage"),
      });
      return { success: true, message: "Motivo salvo.", openStepId: stepId };
    } catch {
      return fail(409, { success: false, message: "Não foi possível salvar o motivo.", openStepId: stepId });
    }
  },

  moveReason: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const reasonId = read(formData, "reasonId");
    const moveDirection = direction(read(formData, "direction"));
    if (!isUuid(stepId) || !isUuid(reasonId) || !moveDirection) return fail(400, { success: false, message: "Movimentação inválida." });
    try {
      await moveHelpTrainingFailureReason(session.user.id, params.pathId, stepId, reasonId, moveDirection);
      return { success: true, message: "Ordem dos motivos atualizada.", openStepId: stepId };
    } catch {
      return fail(409, { success: false, message: "Não foi possível reordenar o motivo.", openStepId: stepId });
    }
  },

  deleteReason: async ({ cookies, params, request }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    const formData = await request.formData();
    const stepId = read(formData, "stepId");
    const reasonId = read(formData, "reasonId");
    if (!isUuid(stepId) || !isUuid(reasonId)) return fail(400, { success: false, message: "Motivo inválido." });
    try {
      await deleteHelpTrainingFailureReason(session.user.id, params.pathId, stepId, reasonId);
      return { success: true, message: "Motivo removido.", openStepId: stepId };
    } catch {
      return fail(409, { success: false, message: "Não foi possível remover o motivo.", openStepId: stepId });
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
    } catch (cause) {
      return fail(409, {
        success: false,
        message: cause instanceof Error && cause.message === "TRAINING_DELETE_PUBLISHED_NOT_ALLOWED"
          ? "Uma trilha que já teve versão publicada deve ser arquivada, não excluída."
          : "Não foi possível excluir esta trilha.",
      });
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
      return { success: true, message: `Convite enviado para ${email}.` };
    } catch (cause) {
      return fail(409, {
        success: false,
        message: cause instanceof Error && cause.message === "TRAINING_NOT_AVAILABLE_FOR_INVITE"
          ? "Publique a trilha antes de enviar convites."
          : "Não foi possível enviar o convite. Revise a configuração de e-mail e tente novamente.",
      });
    }
  },
};
