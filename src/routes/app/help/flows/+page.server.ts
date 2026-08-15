import { error, fail, redirect, type Actions, type PageServerLoad } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createHelpQuestion,
  listHelpQuestionsForAdmin,
  normalizeHelpFlowId,
} from "$lib/server/help/helpFlowRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissionMap = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissionMap, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  return {
    questions: await listHelpQuestionsForAdmin(),
    canEdit: hasPermission(permissionMap, "help.edit"),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      "/app/help/flows",
    );
    const formData = await request.formData();
    const title = readFormValue(formData, "title");
    const requestedId = readFormValue(formData, "questionId");
    const questionId = normalizeHelpFlowId(requestedId || title);

    if (title.length < 4 || title.length > 160) {
      return fail(400, {
        success: false,
        message: "Informe uma pergunta entre 4 e 160 caracteres.",
        values: { title, questionId },
      });
    }

    if (!questionId) {
      return fail(400, {
        success: false,
        message: "Não foi possível gerar um identificador válido para a pergunta.",
        values: { title, questionId },
      });
    }

    let createdId: string;

    try {
      createdId = await createHelpQuestion(
        session.user.id,
        questionId,
        title,
      );
    } catch {
      return fail(409, {
        success: false,
        message:
          "Não foi possível criar a pergunta. Verifique se o identificador já está em uso.",
        values: { title, questionId },
      });
    }

    throw redirect(303, `/app/help/flows/${createdId}`);
  },
};
