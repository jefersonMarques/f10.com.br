import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createHelpTrainingPath,
  listHelpTrainingPaths,
} from "$lib/server/help/helpTrainingRepository";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  return {
    paths: await listHelpTrainingPaths(),
    canEdit: hasPermission(permissions, "help.edit"),
    canPublish: hasPermission(permissions, "help.publish"),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/trilhas");
    const formData = await request.formData();
    const title = read(formData, "title");
    const slug = read(formData, "slug");
    const audience = read(formData, "audience");
    const description = read(formData, "description");
    const values = { title, slug, audience, description };

    if (title.length < 4 || title.length > 160 || audience.length > 160 || description.length > 1200) {
      return fail(400, { success: false, message: "Revise os dados da trilha.", values });
    }

    try {
      const path = await createHelpTrainingPath(session.user.id, values);
      throw redirect(303, `/app/help/trilhas/${path.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, {
        success: false,
        message: "Não foi possível criar a trilha. Verifique se o endereço já está em uso.",
        values,
      });
    }
  },
};
