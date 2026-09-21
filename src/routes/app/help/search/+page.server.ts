import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  recordHelpSearchSelection,
  searchPublishedHelp,
} from "$lib/server/help/helpSearchRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  return {};
};

export const actions: Actions = {
  search: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "help.view",
      "/app/help/search",
    );
    const formData = await request.formData();
    const query = readFormValue(formData, "query");

    if (query.length < 2 || query.length > 500) {
      return fail(400, {
        success: false,
        query,
        message: "Digite pelo menos 2 caracteres para pesquisar.",
        results: [],
      });
    }

    try {
      const search = await searchPublishedHelp({
        query,
        source: "operations",
        actorUserId: session.user.id,
        limit: 10,
      });

      return {
        success: true,
        query,
        searchEventId: search.searchEventId,
        message:
          search.results.length === 0
            ? "Nenhum conteúdo publicado respondeu a esta pesquisa. Ela já foi registrada para análise."
            : `${search.results.length} conteúdo(s) encontrado(s).`,
        results: search.results,
      };
    } catch {
      return fail(500, {
        success: false,
        query,
        message: "Não foi possível executar a pesquisa.",
        results: [],
      });
    }
  },

  select: async ({ cookies, request }) => {
    await requireAppPermission(cookies, "help.view", "/app/help/search");
    const formData = await request.formData();
    const searchEventId = readFormValue(formData, "searchEventId");
    const contentId = readFormValue(formData, "contentId");

    if (!isUuid(searchEventId) || !isUuid(contentId)) {
      return fail(400, { success: false, message: "Resultado de pesquisa inválido." });
    }

    await recordHelpSearchSelection(searchEventId, contentId);
    throw redirect(303, `/app/help/content/${contentId}`);
  },
};
