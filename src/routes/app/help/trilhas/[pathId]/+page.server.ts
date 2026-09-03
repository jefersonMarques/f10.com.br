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
import { regenerateHelpTrainingFromPublishedContent } from "$lib/server/help/helpTrainingGeneration";
import { getTrainingBaseUrl, sendHelpTrainingInvite } from "$lib/server/help/helpTrainingMailer";
import {
  archiveHelpTrainingPath,
  createHelpTrainingInvite,
  deleteHelpTrainingStep,
  getHelpTrainingPath,
  listHelpTrainingParticipants,
} from "$lib/server/help/helpTrainingRepository";
import { getPublishedStructuredHelpById } from "$lib/server/help/publicStructuredHelpRepository";

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
  const code = cause instanceof Error ? cause.message : "";
  if (code === "TRAINING_STEP_INCOMPLETE") return "Toda orientação precisa ter título e instrução.";
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

  const [participants, insights, currentPublication] = await Promise.all([
    listHelpTrainingParticipants(params.pathId),
    getCombinedHelpTrainingInsights(params.pathId),
    getPublishedStructuredHelpById(path.sourceContentId),
  ]);
  const canEditPermission = hasPermission(permissions, "help.edit");
  const canPublishPermission = hasPermission(permissions, "help.publish");
  const sourceUpdateAvailable = Boolean(
    currentPublication &&
    currentPublication.publishedAt.getTime() > path.sourcePublishedAt.getTime(),
  );

  return {
    path,
    participants,
    insights,
    sourceUpdateAvailable,
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
    } catch {
      return fail(409, { success: false, message: "A trilha precisa manter pelo menos uma orientação." });
    }
  },

  regenerate: async ({ cookies, params }) => {
    if (!isUuid(params.pathId)) return fail(404, { success: false, message: "Trilha não encontrada." });
    const { session } = await requireAppPermission(cookies, "help.edit", editorPath(params.pathId));
    try {
      await regenerateHelpTrainingFromPublishedContent(session.user.id, params.pathId);
      return { success: true, message: "Orientações regeneradas com a publicação mais recente." };
    } catch {
      return fail(409, { success: false, message: "Não foi possível regenerar a trilha. Verifique a configuração da IA e o conteúdo publicado." });
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
