import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

export const load: PageServerLoad = async ({ params, url, cookies }) => {
  const [catalog, customer] = await Promise.all([
    listPublishedStructuredHelpCatalog(),
    getOptionalCustomerF10PortalSession(cookies),
  ]);

  const category = catalog
    .flatMap((article) => article.categories)
    .find((item) => item.slug === params.slug);
  if (!category) throw error(404, "Categoria de ajuda não encontrada.");

  const articles = catalog.filter((article) =>
    article.categories.some((item) => item.id === category.id),
  );

  return {
    category: {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      icon: category.icon,
    },
    articles,
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
