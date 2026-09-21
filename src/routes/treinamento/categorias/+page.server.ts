import type { PageServerLoad } from "./$types";
import { listPublicHelpCategories } from "$lib/server/help/helpCategoryRepository";

export const load: PageServerLoad = async () => ({
  categories: await listPublicHelpCategories(),
});
