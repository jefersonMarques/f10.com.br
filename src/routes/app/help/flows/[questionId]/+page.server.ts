import { error, fail, type Actions, type PageServerLoad } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  getHelpQuestionForEdit,
  normalizeHelpFlowId,
  publishHelpQuestion,
  updateHelpQuestion,
} from "$lib/server/help/helpFlowRepository";
import { parseHelpQuestionFormData } from "$lib/server/help/helpQuestionForm";

function isValidQuestionId(value: string): boolean {
  return normalizeHelpFlowId(value) === value && value.length > 0;
}

function getSaveErrorMessage(cause: unknown): string {
  if (!(cause instanceof Error)) {
    return "Não foi possível salvar a pergunta.";
  }

  switch (cause.message) {
    case "QUESTION_CYCLE":
      return "Este caminho criaria um ciclo entre perguntas. Altere um dos destinos antes de salvar.";
    case "QUESTION_TARGET_NOT_FOUND":
      return "Uma das opções aponta para uma pergunta que não existe mais.";
    case "DESTINATION_TARGET_NOT_FOUND":
      return "Uma das opções aponta para um destino que não existe mais.";
    case "INVALID_FLOW_TARGET":
      return "Uma das opções possui um destino inválido.";
    default:
      return "Não foi possível salvar a pergunta.";
  }
}

export const load: PageServerLoad = async ({ params, parent }) => {
  const layout = await parent();
  const permissionMap = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissionMap, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  if (!isValidQuestionId(params.questionId)) {
    throw error(404, "Pergunta não encontrada.");
  }

  const question = await getHelpQuestionForEdit(params.questionId);

  if (!question) {
    throw error(404, "Pergunta não encontrada.");
  }

  return {
    question,
    canEdit: hasPermission(permissionMap, "help.edit"),
    canPublish: hasPermission(permissionMap, "help.publish"),
  };
};

export const actions: Actions = {
  save: async ({ cookies, params, request }) => {
    if (!isValidQuestionId(params.questionId)) {
      return fail(404, {
        success: false,
        action: "save",
        message: "Pergunta não encontrada.",
      });
    }

    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      `/app/help/flows/${params.questionId}`,
    );
    const formData = await request.formData();
    const parsed = parseHelpQuestionFormData(formData);

    if (!parsed.success) {
      return fail(400, {
        success: false,
        action: "save",
        message: parsed.message,
        values: parsed.values,
      });
    }

    try {
      await updateHelpQuestion(
        session.user.id,
        params.questionId,
        parsed.input,
      );

      return {
        success: true,
        action: "save",
        message: "Fluxo salvo como rascunho.",
      };
    } catch (cause) {
      return fail(409, {
        success: false,
        action: "save",
        message: getSaveErrorMessage(cause),
        values: parsed.input,
      });
    }
  },

  publish: async ({ cookies, params }) => {
    if (!isValidQuestionId(params.questionId)) {
      return fail(404, {
        success: false,
        action: "publish",
        message: "Pergunta não encontrada.",
      });
    }

    const { session } = await requireAppPermission(
      cookies,
      "help.publish",
      `/app/help/flows/${params.questionId}`,
    );

    try {
      await publishHelpQuestion(session.user.id, params.questionId);

      return {
        success: true,
        action: "publish",
        message: "Versão atual do fluxo publicada.",
      };
    } catch (cause) {
      const message =
        cause instanceof Error && cause.message === "QUESTION_WITHOUT_OPTIONS"
          ? "Adicione ao menos uma opção antes de publicar."
          : "Não foi possível publicar esta pergunta.";

      return fail(409, {
        success: false,
        action: "publish",
        message,
      });
    }
  },
};
