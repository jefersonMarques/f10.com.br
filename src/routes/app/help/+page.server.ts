import { error, fail, type Actions, type PageServerLoad } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { parseHelpArticleFormData } from "$lib/server/help/helpArticleForm";
import {
  createHelpArticle,
  getHelpAdminSummary,
  importLegacyHelpContent,
  listHelpArticles,
  publishHelpArticle,
} from "$lib/server/help/helpRepository";

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

  const [summary, articles] = await Promise.all([
    getHelpAdminSummary(),
    listHelpArticles(),
  ]);

  return {
    summary,
    articles,
    canEdit: hasPermission(permissionMap, "help.edit"),
    canPublish: hasPermission(permissionMap, "help.publish"),
  };
};

export const actions: Actions = {
  importLegacy: async ({ cookies }) => {
    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      "/app/help",
    );
    const imported = await importLegacyHelpContent(session.user.id);

    return {
      success: true,
      action: "importLegacy",
      message: `Conteúdo atual importado: ${imported.destinations} destinos, ${imported.questions} perguntas e ${imported.trainings} treinamentos.`,
    };
  },

  createArticle: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      "/app/help",
    );
    const formData = await request.formData();
    const parsed = parseHelpArticleFormData(formData);

    if (!parsed.success) {
      return fail(400, {
        success: false,
        action: "createArticle",
        message: parsed.message,
      });
    }

    try {
      await createHelpArticle(session.user.id, parsed.input);

      return {
        success: true,
        action: "createArticle",
        message: "Conteúdo criado como rascunho.",
      };
    } catch {
      return fail(409, {
        success: false,
        action: "createArticle",
        message:
          "Não foi possível criar o conteúdo. Verifique se o endereço já está em uso.",
      });
    }
  },

  publishArticle: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "help.publish",
      "/app/help",
    );
    const formData = await request.formData();
    const articleId = readFormValue(formData, "articleId");

    if (!/^[0-9a-f-]{36}$/i.test(articleId)) {
      return fail(400, {
        success: false,
        action: "publishArticle",
        message: "Conteúdo inválido.",
      });
    }

    try {
      await publishHelpArticle(session.user.id, articleId);

      return {
        success: true,
        action: "publishArticle",
        message: "Conteúdo publicado.",
      };
    } catch {
      return fail(404, {
        success: false,
        action: "publishArticle",
        message: "Conteúdo não encontrado.",
      });
    }
  },
};
