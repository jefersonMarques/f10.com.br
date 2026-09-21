import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getPublicHelpCategory } from "$lib/server/help/helpCategoryRepository";

export const load: PageServerLoad = async ({ params }) => {
  const category = await getPublicHelpCategory(params.slug);
  if (!category) throw error(404, "Categoria não encontrada.");
  return { category };
};
