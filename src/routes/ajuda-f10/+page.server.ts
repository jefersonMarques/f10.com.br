import type { PageServerLoad } from "./$types";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";
import { searchPublishedHelp } from "$lib/server/help/helpSearchRepository";
import { listPublicHelpCollections } from "$lib/server/help/helpCollectionRepository";

export const load: PageServerLoad = async ({ url, cookies }) => {
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 500);
  const [articles, customer] = await Promise.all([
    listPublishedStructuredHelpCatalog("", "support_article"),
    getOptionalCustomerF10PortalSession(cookies),
  ]);
  const collections = await listPublicHelpCollections(articles);

  // Busca textual independente de modelos, saldo ou configuração de IA.
  // Confere os IDs no catálogo publicado antes de enviar resultados ao público.
  let searchResults: Array<{
    contentId: string;
    slug: string;
    title: string;
    summary: string;
    categoryText: string;
  }> = [];
  let searchError = false;
  if (query.length >= 2) {
    try {
      const search = await searchPublishedHelp({
        query,
        source: "public",
        includeAssistantKnowledge: false,
        relevanceMode: "broad",
        limit: 20,
      });
      const publicIds = new Set(articles.map((article) => article.contentId));
      searchResults = search.results
        .filter((result) => publicIds.has(result.contentId))
        .slice(0, 12)
        .map(({ contentId, slug, title, summary, categoryText }) => ({
          contentId, slug, title, summary, categoryText,
        }));
    } catch (cause) {
      searchError = true;
      console.error("[help.public.search]", {
        cause: cause instanceof Error ? cause.name : typeof cause,
      });
    }
  }

  const categoryMap = new Map<
    string,
    {
      id: string;
      slug: string;
      name: string;
      description: string;
      icon: string;
      articles: typeof articles;
    }
  >();

  for (const article of articles) {
    for (const category of article.categories) {
      const current = categoryMap.get(category.id) ?? {
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        articles: [],
      };
      current.articles.push(article);
      categoryMap.set(category.id, current);
    }
  }

  return {
    search: { query, results: searchResults, error: searchError },
    articleCount: articles.length,
    collections,
    categories: Array.from(categoryMap.values()).sort((left, right) =>
      left.name.localeCompare(right.name, "pt-BR"),
    ),
    openChat: url.searchParams.get("chat") === "1",
    customerSupport: customer
      ? {
          authenticated: true,
          name: customer.name,
          email: customer.email,
          groupName: customer.selectedGroupName,
          unitName: customer.selectedUnitName,
          requiresUnitSelection: customer.selectedUnitId === null,
          groups: customer.groups.map((group) => ({
            id: group.grupo_id,
            name: group.grupo,
            units: group.unidades.map((unit) => ({
              id: unit.unidade_id,
              name: unit.unidade,
            })),
          })),
        }
      : {
          authenticated: false,
          name: "",
          email: "",
          groupName: null,
          unitName: null,
          requiresUnitSelection: false,
          groups: [],
        },
  };
};
