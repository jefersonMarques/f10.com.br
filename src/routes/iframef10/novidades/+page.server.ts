import type { PageServerLoad } from "./$types";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

export const load: PageServerLoad = async () => {
  const updates = await listPublishedStructuredHelpCatalog("", "update");
  return {
    updates: updates.sort(
      (left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    ),
  };
};
