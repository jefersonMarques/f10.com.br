import type { PageServerLoad } from "./$types";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

export const load: PageServerLoad = async ({ cookies, url }) => {
  await requireCustomerF10PortalSession(
    cookies,
    `${url.pathname}${url.search}`,
    false,
  );
  return {};
};
