import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createStructuredHelpContent,
  listStructuredHelpContents,
} from "$lib/server/help/structuredHelpRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  return {
    contents: await listStructuredHelpContents(),
    canEdit: hasPermission(permissions, "help.edit"),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      "/app/help/content",
    );
    const formData = await request.formData();
    const title = readFormValue(formData, "title");
    const slug = readFormValue(formData, "slug");
    const summary = readFormValue(formData, "summary");
    const category = readFormValue(formData, "category");
    const aiGeneralKnowledge = readFormValue(formData, "aiGeneralKnowledge");
    const values = { title, slug, summary, category, aiGeneralKnowledge };

    if (title.length < 4 || title.length > 160) {
      return fail(400, {
        success: false,
        message: "Informe um título entre 4 e 160 caracteres.",
        values,
      });
    }

    if (summary.length > 320 || category.length > 120) {
      return fail(400, {
        success: false,
        message: "Resumo ou categoria excede o tamanho permitido.",
        values,
      });
    }

    if (aiGeneralKnowledge.length > 20_000) {
      return fail(400, {
        success: false,
        message: "O conhecimento geral da IA deve ter no máximo 20.000 caracteres.",
        values,
      });
    }

    try {
      const content = await createStructuredHelpContent(session.user.id, values);
      throw redirect(303, `/app/help/content/${content.id}`);
    } catch (cause) {
      if (
        cause &&
        typeof cause === "object" &&
        "status" in cause &&
        cause.status === 303
      ) {
        throw cause;
      }

      return fail(409, {
        success: false,
        message: "Não foi possível criar o conteúdo. Verifique se o endereço já está em uso.",
        values,
      });
    }
  },
};
