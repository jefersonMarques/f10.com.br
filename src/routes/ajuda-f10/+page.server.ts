import type { PageServerLoad } from "./$types";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

export const load: PageServerLoad = async ({ url, cookies }) => {
  const [articles, customer] = await Promise.all([
    listPublishedStructuredHelpCatalog(),
    getOptionalCustomerF10PortalSession(cookies),
  ]);

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
    articleCount: articles.length,
    categories: Array.from(categoryMap.values()).sort((left, right) =>
      left.name.localeCompare(right.name, "pt-BR"),
    ),
    openChat: url.searchParams.get("chat") === "1",
    customerSupport:
      customer && customer.selectedUnitId !== null
        ? {
            authenticated: true,
            name: customer.name,
            email: customer.email,
            groupName: customer.selectedGroupName,
            unitName: customer.selectedUnitName,
          }
        : {
            authenticated: false,
            name: "",
            email: "",
            groupName: null,
            unitName: null,
          },
  };
};
