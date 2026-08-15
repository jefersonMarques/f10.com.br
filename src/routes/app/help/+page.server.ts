import {
  error,
  fail,
  redirect,
  type Actions,
  type Cookies,
  type PageServerLoad,
} from "@sveltejs/kit";
import {
  hasPermission,
  resolveUserPermissions,
} from "$lib/server/auth/permissions";
import {
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "$lib/server/auth/session";
import {
  createHelpArticle,
  getHelpAdminSummary,
  importLegacyHelpContent,
  listHelpArticles,
  normalizeHelpSlug,
  publishHelpArticle,
} from "$lib/server/help/helpRepository";

async function authorize(cookies: Cookies, permissionCode: string) {
  const token = cookies.get(SESSION_COOKIE_NAME);

  if (!token) {
    throw redirect(303, "/login?returnTo=%2Fapp%2Fhelp");
  }

  const session = await getSessionUser(token);

  if (!session) {
    cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
    throw redirect(303, "/login?returnTo=%2Fapp%2Fhelp");
  }

  const permissions = await resolveUserPermissions(session.user.id);

  if (!hasPermission(permissions, permissionCode)) {
    throw error(403, "Acesso não autorizado.");
  }

  return { session, permissions };
}

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
    const { session } = await authorize(cookies, "help.edit");
    const imported = await importLegacyHelpContent(session.user.id);

    return {
      success: true,
      action: "importLegacy",
      message: `Conteúdo atual importado: ${imported.destinations} destinos, ${imported.questions} perguntas e ${imported.trainings} treinamentos.`,
    };
  },

  createArticle: async ({ cookies, request }) => {
    const { session } = await authorize(cookies, "help.edit");
    const formData = await request.formData();
    const title = readFormValue(formData, "title");
    const requestedSlug = readFormValue(formData, "slug");
    const summary = readFormValue(formData, "summary");
    const bodyText = readFormValue(formData, "bodyText");
    const slug = normalizeHelpSlug(requestedSlug || title);

    if (title.length < 4 || title.length > 160) {
      return fail(400, {
        success: false,
        action: "createArticle",
        message: "Informe um título entre 4 e 160 caracteres.",
      });
    }

    if (!slug || slug.length > 120) {
      return fail(400, {
        success: false,
        action: "createArticle",
        message: "O endereço do conteúdo é inválido.",
      });
    }

    if (summary.length > 320) {
      return fail(400, {
        success: false,
        action: "createArticle",
        message: "O resumo deve ter no máximo 320 caracteres.",
      });
    }

    if (bodyText.length < 10 || bodyText.length > 50_000) {
      return fail(400, {
        success: false,
        action: "createArticle",
        message: "O conteúdo deve ter entre 10 e 50.000 caracteres.",
      });
    }

    try {
      await createHelpArticle(session.user.id, {
        title,
        slug,
        summary,
        bodyText,
      });

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
    const { session } = await authorize(cookies, "help.publish");
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
