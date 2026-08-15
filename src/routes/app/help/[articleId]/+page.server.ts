import { error, fail, type Actions, type PageServerLoad } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { parseHelpArticleFormData } from "$lib/server/help/helpArticleForm";
import {
  getHelpArticleForEdit,
  publishHelpArticle,
  updateHelpArticle,
} from "$lib/server/help/helpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f-]{36}$/i.test(value);
}

export const load: PageServerLoad = async ({ params, parent }) => {
  const layout = await parent();
  const permissionMap = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissionMap, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  if (!isUuid(params.articleId)) {
    throw error(404, "Conteúdo não encontrado.");
  }

  const article = await getHelpArticleForEdit(params.articleId);

  if (!article) {
    throw error(404, "Conteúdo não encontrado.");
  }

  return {
    article,
    canEdit: hasPermission(permissionMap, "help.edit"),
    canPublish: hasPermission(permissionMap, "help.publish"),
  };
};

export const actions: Actions = {
  save: async ({ cookies, params, request }) => {
    if (!isUuid(params.articleId)) {
      return fail(404, {
        success: false,
        action: "save",
        message: "Conteúdo não encontrado.",
      });
    }

    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      `/app/help/${params.articleId}`,
    );
    const formData = await request.formData();
    const parsed = parseHelpArticleFormData(formData);

    if (!parsed.success) {
      return fail(400, {
        success: false,
        action: "save",
        message: parsed.message,
        values: parsed.values,
      });
    }

    try {
      await updateHelpArticle(session.user.id, params.articleId, parsed.input);

      return {
        success: true,
        action: "save",
        message: "Alterações salvas como rascunho.",
      };
    } catch {
      return fail(409, {
        success: false,
        action: "save",
        message:
          "Não foi possível salvar. Verifique se o endereço já está sendo utilizado por outro conteúdo.",
        values: parsed.input,
      });
    }
  },

  publish: async ({ cookies, params }) => {
    if (!isUuid(params.articleId)) {
      return fail(404, {
        success: false,
        action: "publish",
        message: "Conteúdo não encontrado.",
      });
    }

    const { session } = await requireAppPermission(
      cookies,
      "help.publish",
      `/app/help/${params.articleId}`,
    );

    try {
      await publishHelpArticle(session.user.id, params.articleId);

      return {
        success: true,
        action: "publish",
        message: "Versão atual publicada.",
      };
    } catch {
      return fail(404, {
        success: false,
        action: "publish",
        message: "Conteúdo não encontrado.",
      });
    }
  },
};
