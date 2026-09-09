import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  listHelpCollections,
  saveHelpCollection,
} from "$lib/server/help/helpCollectionRepository";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const [collections, publishedContents] = await Promise.all([
    listHelpCollections(),
    listPublishedStructuredHelpCatalog(),
  ]);
  const selectedId = url.searchParams.get("collection") ?? "";
  const newCollection = url.searchParams.get("new") === "1";
  const selectedCollection = selectedId
    ? collections.find((collection) => collection.id === selectedId) ?? null
    : null;

  return {
    collections,
    publishedContents: [...publishedContents].sort((left, right) =>
      left.title.localeCompare(right.title, "pt-BR"),
    ),
    selectedCollection,
    newCollection,
    saved: url.searchParams.get("saved") === "1",
    canEdit: hasPermission(permissions, "help.edit"),
  };
};

export const actions: Actions = {
  save: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      "/app/help/collections",
    );
    const formData = await request.formData();
    const collectionIdValue = read(formData, "collectionId");
    const collectionId = collectionIdValue || null;
    if (collectionId && !isUuid(collectionId)) {
      return fail(400, { success: false, message: "Coleção inválida." });
    }

    const title = read(formData, "title");
    const slug = read(formData, "slug");
    const description = read(formData, "description");
    const sortOrderValue = Number.parseInt(read(formData, "sortOrder") || "10", 10);
    const contentIds = formData
      .getAll("contentId")
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    if (
      title.length < 2 ||
      title.length > 160 ||
      description.length > 600 ||
      contentIds.length < 1 ||
      contentIds.some((contentId) => !isUuid(contentId))
    ) {
      return fail(400, {
        success: false,
        message: "Informe um título e selecione ao menos um conteúdo publicado.",
      });
    }

    try {
      const savedId = await saveHelpCollection(session.user.id, {
        collectionId,
        title,
        slug,
        description,
        sortOrder: Number.isFinite(sortOrderValue) ? sortOrderValue : 10,
        active: formData.get("active") === "on",
        contentIds,
      });
      throw redirect(
        303,
        `/app/help/collections?collection=${encodeURIComponent(savedId)}&saved=1`,
      );
    } catch (cause) {
      if (
        cause &&
        typeof cause === "object" &&
        "status" in cause &&
        cause.status === 303
      ) {
        throw cause;
      }
      const code = cause instanceof Error ? cause.message : "";
      const message = code === "HELP_COLLECTION_CONTENT_NOT_PUBLISHED"
        ? "A coleção contém um conteúdo que não está mais publicado. Remova-o antes de salvar."
        : code === "HELP_COLLECTION_ITEMS_INVALID"
          ? "Selecione entre 1 e 100 conteúdos."
          : "Não foi possível salvar a coleção. Verifique o endereço e os conteúdos selecionados.";
      return fail(409, { success: false, message });
    }
  },
};
