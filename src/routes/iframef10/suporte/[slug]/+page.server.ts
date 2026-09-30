import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getPublishedStructuredHelpBySlug } from "$lib/server/help/publicStructuredHelpRepository";

export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
  const content = await getPublishedStructuredHelpBySlug(params.slug);
  if (!content || content.contentKind !== "support_article") {
    throw error(404, "Artigo não encontrado.");
  }
  return { content };
};
