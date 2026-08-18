import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { recordCustomerActivity } from "$lib/server/customerPortal/customerActivityRepository";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { getPublishedStructuredHelpBySlug } from "$lib/server/help/publicStructuredHelpRepository";

export const prerender = false;

export const load: PageServerLoad = async ({ params, cookies, url }) => {
  const [content, customer] = await Promise.all([
    getPublishedStructuredHelpBySlug(params.slug),
    getOptionalCustomerF10PortalSession(cookies),
  ]);
  if (!content) throw error(404, "Conteúdo de ajuda não encontrado.");

  if (customer?.selectedUnitId !== null && customer?.selectedUnitId !== undefined) {
    await recordCustomerActivity(customer, {
      eventType: "help.article.view",
      source: "help_center",
      path: url.pathname,
      metadata: {
        contentId: content.contentId,
        slug: content.slug,
        title: content.title,
        category: content.category,
      },
    }).catch(() => undefined);
  }

  return { content };
};
