import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import {
  createStructuredHelpContent,
  listStructuredHelpContents,
} from "$lib/server/help/structuredHelpRepository";
import { listPublishedStructuredHelpLinks } from "$lib/server/help/publicStructuredHelpRepository";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((item) => [item.code, item.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const [contents, publications, categories] = await Promise.all([
    listStructuredHelpContents(),
    listPublishedStructuredHelpLinks(),
    listHelpCategories(true),
  ]);
  const publishedById = new Map(publications.map((item) => [item.entityId, item]));

  return {
    contents: contents
      .filter((content) => content.contentKind === "update")
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .map((content) => ({
        ...content,
        publishedSlug: publishedById.get(content.id)?.slug ?? null,
      })),
    categories: categories.filter(
      (category) => category.active && category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG,
    ),
    canEdit: hasPermission(permissions, "help.edit"),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/novidades");
    const formData = await request.formData();
    const title = read(formData, "title");
    const summary = read(formData, "summary");
    const categoryId = read(formData, "categoryId");

    if (title.length < 4 || title.length > 160 || summary.length > 320 || !isUuid(categoryId)) {
      return fail(400, { success: false, message: "Revise título, resumo e categoria." });
    }

    const categories = await listHelpCategories(true);
    if (!categories.some((category) => category.id === categoryId && category.active && category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG)) {
      return fail(400, { success: false, message: "Selecione uma categoria ativa." });
    }

    try {
      const content = await createStructuredHelpContent(session.user.id, {
        title,
        contentKind: "update",
        slug: "",
        summary,
        searchAliases: [],
        assistantKnowledge: "",
        internalSupportNotes: "",
        categories: [{ categoryId, destinationUrl: "", sortOrder: 10 }],
      });
      throw redirect(303, `/app/help/content/${content.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, message: "Não foi possível criar a atualização." });
    }
  },
};
