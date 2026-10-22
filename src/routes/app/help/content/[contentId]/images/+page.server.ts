import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

// Preserve existing review links while keeping a single editing experience.
export const load: PageServerLoad = ({ params, url }) => {
  throw redirect(307, `/app/help/content/${params.contentId}${url.search}`);
};
