import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getActiveIframeF10UpdateBySlug } from "$lib/server/iframeF10/updateRepository";

export const prerender = false;

export const load: PageServerLoad = async ({ params }) => {
  const update = await getActiveIframeF10UpdateBySlug(params.slug);
  if (!update) throw error(404, "Novidade não encontrada.");
  return { update };
};
