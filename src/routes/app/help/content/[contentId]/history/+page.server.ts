import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  listHelpContentReleases,
  restoreHelpContentReleaseAsDraft,
} from "$lib/server/help/helpContentReleaseRepository";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.contentId)) throw error(404, "Conteúdo não encontrado.");
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const [content, releases] = await Promise.all([
    getStructuredHelpContent(params.contentId),
    listHelpContentReleases(params.contentId),
  ]);
  if (!content) throw error(404, "Conteúdo não encontrado.");

  return {
    content,
    releases,
    currentReleaseNumber: releases[0]?.releaseNumber ?? null,
    canEdit: content.status !== "archived" && hasPermission(permissions, "help.edit"),
  };
};

export const actions: Actions = {
  restore: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId)) {
      return fail(404, { success: false, message: "Conteúdo não encontrado." });
    }
    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      `/app/help/content/${params.contentId}/history`,
    );
    const formData = await request.formData();
    const releaseNumber = Number(formData.get("releaseNumber"));
    if (!Number.isInteger(releaseNumber) || releaseNumber < 1) {
      return fail(400, { success: false, message: "Versão inválida." });
    }

    try {
      await restoreHelpContentReleaseAsDraft({
        actorUserId: session.user.id,
        contentId: params.contentId,
        releaseNumber,
      });
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      return fail(409, {
        success: false,
        message:
          code === "HELP_RELEASE_NOT_RESTORABLE"
            ? "Esta versão antiga é somente para consulta."
            : "Não foi possível restaurar esta versão.",
      });
    }
    throw redirect(303, `/app/help/content/${params.contentId}/images`);
  },
};
