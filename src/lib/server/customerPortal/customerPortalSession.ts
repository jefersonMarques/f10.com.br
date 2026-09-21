import { dev } from "$app/environment";
import { redirect, type Cookies } from "@sveltejs/kit";
import {
  authorizeCustomerPortalSession,
  revokeCustomerPortalSession,
} from "$lib/server/customerPortal/customerPortalRepository";
import type { CustomerF10GroupSnapshot } from "$lib/server/db/customerPortalSchema";
import {
  authorizeF10CustomerPortalSession,
  type AuthorizeF10CustomerSessionOptions,
} from "$lib/server/customerPortal/customerF10AuthRepository";

export const CUSTOMER_PORTAL_SESSION_COOKIE = "f10_customer_session";

export type CustomerTicketPortalSession = {
  sessionId: string;
  contactId: string;
  name: string;
  email: string;
  authProvider: "f10" | "portal";
  legacyUserId: string | null;
  groups: CustomerF10GroupSnapshot[];
  selectedGroupId: number | null;
  selectedGroupName: string | null;
  selectedUnitId: number | null;
  selectedUnitName: string | null;
  selectedUnitSchema: string | null;
  expiresAt: Date;
};

export function normalizeCustomerPortalReturnTo(
  value: string,
  fallback = "/cliente/chamados",
): string {
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (
    value === "/cliente" ||
    value.startsWith("/cliente/") ||
    value === "/ajuda-f10" ||
    value.startsWith("/ajuda-f10/") ||
    value.startsWith("/agendar/")
  ) {
    return value;
  }
  return fallback;
}

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: !dev,
};

export function setCustomerPortalSessionCookie(
  cookies: Cookies,
  token: string,
  _expiresAt: Date,
): void {
  cookies.set(CUSTOMER_PORTAL_SESSION_COOKIE, token, COOKIE_OPTIONS);
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

export async function getOptionalCustomerF10PortalSession(
  cookies: Cookies,
  options: AuthorizeF10CustomerSessionOptions = {},
) {
  const token = getCustomerPortalSessionToken(cookies);
  if (!token) return null;

  return authorizeF10CustomerPortalSession(token, options);
}

export async function requireCustomerPortalSession(cookies: Cookies) {
  const session = await getOptionalCustomerPortalSession(cookies);
  if (!session) throw redirect(303, "/cliente");
  return session;
}

export async function getOptionalCustomerTicketPortalSession(
  cookies: Cookies,
): Promise<CustomerTicketPortalSession | null> {
  const f10Session = await getOptionalCustomerF10PortalSession(cookies, { touchActivity: false });
  if (f10Session) {
    return {
      ...f10Session,
      authProvider: "f10",
    };
  }

  const session = await getOptionalCustomerPortalSession(cookies);
  if (!session) return null;
  return {
    ...session,
    authProvider: "portal",
    legacyUserId: null,
    groups: [],
    selectedGroupId: null,
    selectedGroupName: null,
    selectedUnitId: null,
    selectedUnitName: null,
    selectedUnitSchema: null,
  };
}

export async function requireCustomerTicketPortalSession(
  cookies: Cookies,
  returnTo = "/cliente/chamados",
): Promise<CustomerTicketPortalSession> {
  const session = await getOptionalCustomerTicketPortalSession(cookies);
  if (!session) throw redirect(303, loginUrl(returnTo));
  return session;
}

function loginUrl(returnTo: string): string {
  const params = new URLSearchParams();
  params.set("returnTo", normalizeCustomerPortalReturnTo(returnTo));
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
