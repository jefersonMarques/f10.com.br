import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { consumeCustomerPortalLoginToken } from "$lib/server/customerPortal/customerPortalRepository";
import { setCustomerPortalSessionCookie } from "$lib/server/customerPortal/customerPortalSession";

export const load: PageServerLoad = async ({ url, cookies }) => {
  const token = (url.searchParams.get("token") ?? "").trim();
  if (!/^[A-Za-z0-9_-]{40,120}$/.test(token)) return { invalid: true };

  const session = await consumeCustomerPortalLoginToken(token);
  if (!session) return { invalid: true };

  setCustomerPortalSessionCookie(cookies, session.token, session.expiresAt);
  throw redirect(303, "/cliente/chamados");
};
