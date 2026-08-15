import { dev } from "$app/environment";
import { redirect, type Cookies } from "@sveltejs/kit";
import {
  authorizeCustomerPortalSession,
  revokeCustomerPortalSession,
} from "$lib/server/customerPortal/customerPortalRepository";

export const CUSTOMER_PORTAL_SESSION_COOKIE = "f10_customer_session";

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: !dev,
};

export function setCustomerPortalSessionCookie(
  cookies: Cookies,
  token: string,
  expiresAt: Date,
): void {
  cookies.set(CUSTOMER_PORTAL_SESSION_COOKIE, token, {
    ...COOKIE_OPTIONS,
    expires: expiresAt,
  });
}

export function clearCustomerPortalSessionCookie(cookies: Cookies): void {
  cookies.delete(CUSTOMER_PORTAL_SESSION_COOKIE, COOKIE_OPTIONS);
}

export async function getOptionalCustomerPortalSession(cookies: Cookies) {
  const token = cookies.get(CUSTOMER_PORTAL_SESSION_COOKIE) ?? "";
  if (!token) return null;

  const session = await authorizeCustomerPortalSession(token);
  if (!session) clearCustomerPortalSessionCookie(cookies);
  return session;
}

export async function requireCustomerPortalSession(cookies: Cookies) {
  const session = await getOptionalCustomerPortalSession(cookies);
  if (!session) throw redirect(303, "/cliente");
  return session;
}

export async function logoutCustomerPortal(cookies: Cookies): Promise<void> {
  const token = cookies.get(CUSTOMER_PORTAL_SESSION_COOKIE) ?? "";
  if (token) await revokeCustomerPortalSession(token);
  clearCustomerPortalSessionCookie(cookies);
}
