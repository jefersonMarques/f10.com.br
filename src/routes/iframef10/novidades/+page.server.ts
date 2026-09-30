import type { PageServerLoad } from "./$types";
import { listActiveIframeF10Updates } from "$lib/server/iframeF10/updateRepository";

export const load: PageServerLoad = async () => ({
  updates: await listActiveIframeF10Updates(),
});
