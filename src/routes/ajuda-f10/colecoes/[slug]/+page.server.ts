import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getPublicHelpCollectionBySlug } from "$lib/server/help/helpCollectionRepository";

export const load: PageServerLoad = async ({ params }) => {
  const collection = await getPublicHelpCollectionBySlug(params.slug);
  if (!collection) throw error(404, "Coleção não encontrada.");
  return { collection };
};
