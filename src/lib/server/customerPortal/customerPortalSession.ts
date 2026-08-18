import { dev } from "$app/environment";
import { redirect, type Cookies } from "@sveltejs/kit";
import {
  authorizeCustomerPortalSession,
  revokeCustomerPortalSession,
} from "$lib/server/customerPortal/customerPortalRepository";
import { authorizeF10CustomerPortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";

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

export function getCustomerPortalSessionToken(cookies: Cookies): string {
  return cookies.get(CUSTOMER_PORTAL_SESSION_COOKIE) ?? "";
}

export async function getOptionalCustomerPortalSession(cookies: Cookies) {
  const token = getCustomerPortalSessionToken(cookies);
  if (!token) return null;

  const session = await authorizeCustomerPortalSession(token);
  if (!session) clearCustomerPortalSessionCookie(cookies);
  return session;
}

export async function getOptionalCustomerF10PortalSession(cookies: Cookies) {
  const token = getCustomerPortalSessionToken(cookies);
  if (!token) return null;

  const session = await authorizeF10CustomerPortalSession(token);
  if (!session) return null;
  return session;
}

export async function requireCustomerPortalSession(cookies: Cookies) {
  const session = await getOptionalCustomerPortalSession(cookies);
  if (!session) throw redirect(303, "/cliente");
  return session;
}

function loginUrl(returnTo: string): string {
  const params = new URLSearchParams();
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    params.set("returnTo", returnTo);
  }
  const query = params.toString();
  return query ? `/cliente?${query}` : "/cliente";
}

export async function requireCustomerF10PortalSession(
  cookies: Cookies,
  returnTo = "/cliente/chamados",
  requireUnit = true,
) {
  const session = await getOptionalCustomerF10PortalSession(cookies);
  if (!session) throw redirect(303, loginUrl(returnTo));
  if (requireUnit && session.selectedUnitId === null) {
    const params = new URLSearchParams({ returnTo });
    throw redirect(303, `/cliente/unidade?${params.toString()}`);
  }
  return session;
}

export async function logoutCustomerPortal(cookies: Cookies): Promise<void> {
  const token = getCustomerPortalSessionToken(cookies);
  if (token) await revokeCustomerPortalSession(token);
  clearCustomerPortalSessionCookie(cookies);
}
