import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  archiveStructuredHelpContent,
  discardStructuredHelpContent,
} from "$lib/server/help/helpContentLifecycle";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import {
  createStructuredHelpContent,
  listStructuredHelpContents,
} from "$lib/server/help/structuredHelpRepository";
import { listPublishedStructuredHelpLinks } from "$lib/server/help/publicStructuredHelpRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const [contents, publishedLinks, categories] = await Promise.all([
    listStructuredHelpContents(),
    listPublishedStructuredHelpLinks(),
    listHelpCategories(true),
  ]);
  const publishedById = new Map(
    publishedLinks.map((publication) => [publication.entityId, publication]),
  );

  return {
    contents: contents.map((content) => ({
      ...content,
      publishedSlug: publishedById.get(content.id)?.slug ?? null,
    })),
    categories: categories.filter(
      (category) => category.active && category.slug !== UNCATEGORIZED_HELP_CATEGORY_SLUG,
    ),
    canEdit: hasPermission(permissions, "help.edit"),
    canArchive: hasPermission(permissions, "help.publish"),
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
    const categoryId = readFormValue(formData, "categoryId");
    const values = { title, slug, summary, categoryId };

    if (title.length < 4 || title.length > 160) {
      return fail(400, {
        success: false,
        message: "Informe um título entre 4 e 160 caracteres.",
        values,
      });
    }
    if (summary.length > 320) {
      return fail(400, {
        success: false,
        message: "O resumo deve ter no máximo 320 caracteres.",
        values,
      });
    }
    if (!isUuid(categoryId)) {
      return fail(400, {
        success: false,
        message: "Selecione uma categoria para o conteúdo.",
        values,
      });
    }

    try {
      const content = await createStructuredHelpContent(session.user.id, {
        title,
        slug,
        summary,
        searchAliases: [],
        assistantKnowledge: "",
        internalSupportNotes: "",
        categories: [{ categoryId, destinationUrl: "", sortOrder: 10 }],
      });
      throw redirect(303, `/app/help/content/${content.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) {
        throw cause;
      }
      return fail(409, {
        success: false,
        message:
          cause instanceof Error && cause.message.startsWith("CONTENT_CATEGORY")
            ? "Selecione uma categoria ativa para o conteúdo."
            : "Não foi possível criar o conteúdo. Verifique se o endereço já está em uso.",
        values,
      });
    }
  },

  discard: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/content");
    const contentId = readFormValue(await request.formData(), "contentId");
    if (!isUuid(contentId)) {
      return fail(400, { success: false, message: "Conteúdo inválido." });
    }

    try {
      await discardStructuredHelpContent(session.user.id, contentId);
    } catch (cause) {
      return fail(409, {
        success: false,
        message:
          cause instanceof Error && cause.message === "CONTENT_ALREADY_PUBLISHED"
            ? "Conteúdo que já foi publicado não pode ser descartado. Arquive-o para retirá-lo da Central e da IA."
            : "Não foi possível descartar este conteúdo.",
      });
    }
    throw redirect(303, "/app/help/content");
  },

  archive: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.publish", "/app/help/content");
    const contentId = readFormValue(await request.formData(), "contentId");
    if (!isUuid(contentId)) {
      return fail(400, { success: false, message: "Conteúdo inválido." });
    }

    try {
      await archiveStructuredHelpContent(session.user.id, contentId);
    } catch (cause) {
      return fail(409, {
        success: false,
        message:
          cause instanceof Error && cause.message === "CONTENT_NEVER_PUBLISHED"
            ? "Este conteúdo nunca foi publicado. Use Descartar se não quiser mantê-lo."
            : "Não foi possível arquivar este conteúdo.",
      });
    }
    throw redirect(303, "/app/help/content");
  },
};
