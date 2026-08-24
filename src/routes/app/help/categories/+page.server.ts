import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { normalizeHelpCategoryIcon } from "$lib/help/helpCategoryConstants";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createHelpCategory,
  listHelpCategories,
  updateHelpCategory,
} from "$lib/server/help/helpCategoryRepository";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readSortOrder(formData: FormData): number {
  const value = Number.parseInt(read(formData, "sortOrder") || "10", 10);
  return Number.isFinite(value) ? value : 10;
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");
  return {
    categories: await listHelpCategories(),
    canEdit: hasPermission(permissions, "help.edit"),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/categories");
    const formData = await request.formData();
    const name = read(formData, "name");
    const values = {
      name,
      slug: read(formData, "slug"),
      description: read(formData, "description"),
      icon: normalizeHelpCategoryIcon(read(formData, "icon")),
      destinationUrl: read(formData, "destinationUrl"),
      sortOrder: readSortOrder(formData),
    };
    if (
      name.length < 2 ||
      name.length > 160 ||
      values.description.length > 600 ||
      values.destinationUrl.length > 1000
    ) {
      return fail(400, { success: false, message: "Revise os dados da categoria.", values });
    }
    try {
      await createHelpCategory(session.user.id, values);
      return { success: true, message: "Categoria criada." };
    } catch {
      return fail(409, {
        success: false,
        message: "Não foi possível criar a categoria. Verifique se o endereço já está em uso.",
        values,
      });
    }
  },

  update: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/categories");
    const formData = await request.formData();
    const categoryId = read(formData, "categoryId");
    if (!isUuid(categoryId)) return fail(400, { success: false, message: "Categoria inválida." });
    try {
      await updateHelpCategory(session.user.id, categoryId, {
        name: read(formData, "name"),
        slug: read(formData, "slug"),
        description: read(formData, "description"),
        icon: normalizeHelpCategoryIcon(read(formData, "icon")),
        destinationUrl: read(formData, "destinationUrl"),
        sortOrder: readSortOrder(formData),
        active: formData.get("active") === "on",
      });
      return { success: true, message: "Categoria atualizada." };
    } catch (cause) {
      const causeMessage = cause instanceof Error ? cause.message : "";
      return fail(409, {
        success: false,
        message: causeMessage.includes("HELP_CATEGORY_PUBLISHED_CONTENT")
          ? "Esta categoria está sendo usada por conteúdo publicado. Ajuste ou arquive esses artigos antes de desativá-la."
          : "Não foi possível atualizar a categoria. Verifique se o endereço já está em uso.",
      });
    }
  },
};
