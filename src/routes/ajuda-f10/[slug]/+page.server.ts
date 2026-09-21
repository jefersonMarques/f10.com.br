import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { recordCustomerActivity } from "$lib/server/customerPortal/customerActivityRepository";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { getPublicHelpArticleNavigation } from "$lib/server/help/helpArticleSequenceRepository";
import {
  getPublicHelpContentRelease,
  listPublicHelpContentReleases,
} from "$lib/server/help/helpContentReleaseRepository";
import { getPublishedStructuredHelpBySlug } from "$lib/server/help/publicStructuredHelpRepository";

export const prerender = false;

export const load: PageServerLoad = async ({ params, cookies, url }) => {
  const requestedVersion = Number(url.searchParams.get("versao"));
  const collectionSlug = url.searchParams.get("colecao")?.trim().slice(0, 120) || null;
  const currentContent = await getPublishedStructuredHelpBySlug(params.slug);
  if (!currentContent) throw error(404, "Conteúdo de ajuda não encontrado.");
  const historical =
    Number.isInteger(requestedVersion) && requestedVersion > 0
      ? await getPublicHelpContentRelease(currentContent.contentId, requestedVersion)
      : null;
  if (url.searchParams.has("versao") && !historical) {
    throw error(404, "Versão de ajuda não encontrada.");
  }
  const content = historical ?? currentContent;
  const [customer, releases, navigation] = await Promise.all([
    getOptionalCustomerF10PortalSession(cookies),
    listPublicHelpContentReleases(currentContent.contentId),
    getPublicHelpArticleNavigation(currentContent.contentId, collectionSlug),
  ]);
  const currentReleaseNumber = releases[0]?.releaseNumber ?? null;
  const releaseNumber = historical
    ? requestedVersion
    : currentReleaseNumber;

  if (customer?.selectedUnitId !== null && customer?.selectedUnitId !== undefined) {
    await recordCustomerActivity(customer, {
      eventType: "help.article.view",
      source: "help_center",
      path: url.pathname,
      metadata: {
        contentId: content.contentId,
        slug: content.slug,
        title: content.title,
        categories: content.categories.map((category) => ({
          id: category.id,
          slug: category.slug,
          name: category.name,
        })),
        navigationContext: navigation.context,
        collectionSlug: navigation.collection?.slug ?? null,
      },
    }).catch(() => undefined);
  }

  return {
    content,
    releases,
    releaseNumber,
    currentReleaseNumber,
    isHistorical: Boolean(historical && releaseNumber !== currentReleaseNumber),
    routeSlug: currentContent.slug,
    navigation,
  };
};
