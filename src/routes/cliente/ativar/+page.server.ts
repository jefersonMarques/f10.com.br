import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { activateCustomerPortalCredential } from "$lib/server/customerPortal/customerAuthService";
import { setCustomerPortalSessionCookie } from "$lib/server/customerPortal/customerPortalSession";

export const load: PageServerLoad = async ({ url, cookies }) => {
  const token = (url.searchParams.get("token") ?? "").trim();
  const session = token ? await activateCustomerPortalCredential(token) : null;

  if (session) {
    setCustomerPortalSessionCookie(cookies, session.token, session.expiresAt);
    throw redirect(303, "/cliente/chamados");
  }

  return { activated: false };
};
