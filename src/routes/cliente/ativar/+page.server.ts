import type { PageServerLoad } from "./$types";
import { activateCustomerPortalCredential } from "$lib/server/customerPortal/customerAuthService";

export const load: PageServerLoad = async ({ url }) => {
  const token = (url.searchParams.get("token") ?? "").trim();
  const activated = token ? await activateCustomerPortalCredential(token) : false;
  return { activated };
};
