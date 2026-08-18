import type { PageServerLoad } from "./$types";
import { recordCustomerHelpSearch } from "$lib/server/customerPortal/customerActivityRepository";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

export const load: PageServerLoad = async ({ url, cookies }) => {
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 160);
  const [articles, customer] = await Promise.all([
    listPublishedStructuredHelpCatalog(query),
    getOptionalCustomerF10PortalSession(cookies),
  ]);

  if (query && customer?.selectedUnitId !== null && customer?.selectedUnitId !== undefined) {
    await recordCustomerHelpSearch(customer, query, articles).catch(() => undefined);
  }

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
    openChat: url.searchParams.get("chat") === "1",
    customerSupport: customer && customer.selectedUnitId !== null
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
