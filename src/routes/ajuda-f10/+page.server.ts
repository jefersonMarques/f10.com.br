import type { PageServerLoad } from "./$types";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

export const load: PageServerLoad = async ({ url }) => {
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 160);
  const articles = await listPublishedStructuredHelpCatalog(query);
  const categories = Array.from(
    articles.reduce((groups, article) => {
      const category = article.category.trim() || "Geral";
      const group = groups.get(category) ?? [];
      group.push(article);
      groups.set(category, group);
      return groups;
    }, new Map<string, typeof articles>()),
  ).map(([name, items]) => ({ name, articles: items }));

  return {
    query,
    articleCount: articles.length,
    categories,
  };
};
