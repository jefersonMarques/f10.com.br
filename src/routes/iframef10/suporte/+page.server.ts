import type { PageServerLoad } from "./$types";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

export const load: PageServerLoad = async () => {
  const articles = await listPublishedStructuredHelpCatalog("", "support_article");
  const categories = new Map<string, {
    id: string;
    name: string;
    description: string;
    icon: string;
    articles: typeof articles;
  }>();

  for (const article of articles) {
    for (const category of article.categories) {
      const current = categories.get(category.id) ?? {
        id: category.id,
        name: category.name,
        description: category.description,
        icon: category.icon,
        articles: [],
      };
      current.articles.push(article);
      categories.set(category.id, current);
    }
  }

  return {
    articleCount: articles.length,
    categories: Array.from(categories.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
  };
};
