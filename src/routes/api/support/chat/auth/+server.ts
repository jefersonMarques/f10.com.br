import { json, type RequestHandler } from "@sveltejs/kit";
import {
  authorizeF10CustomerPortalSession,
  createF10CustomerPortalSession,
  type CustomerF10PortalSession,
} from "$lib/server/customerPortal/customerF10AuthRepository";
import { setCustomerPortalSessionCookie } from "$lib/server/customerPortal/customerPortalSession";
import { consumeSupportPublicRateLimit } from "$lib/server/support/supportPublicRateLimit";

const MAX_BODY_BYTES = 4 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_BLOCK_MS = 30 * 60 * 1000;

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function publicCustomer(session: CustomerF10PortalSession) {
  return {
    authenticated: true,
    name: session.name,
    email: session.email,
    groupName: session.selectedGroupName,
    unitName: session.selectedUnitName,
    requiresUnitSelection: session.selectedUnitId === null,
    groups: session.groups.map((group) => ({
      id: group.grupo_id,
      name: group.grupo,
      units: group.unidades.map((unit) => ({
        id: unit.unidade_id,
        name: unit.unidade,
      })),
    })),
  };
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress, url }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (isBodyTooLarge(request)) return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!isValidEmail(email) || password.length < 1 || password.length > 512) {
    return json({ error: "INVALID_CREDENTIALS" }, { status: 400 });
  }

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  try {
    const allowed = await consumeSupportPublicRateLimit("chat-auth", clientAddress, {
      maxRequests: 8,
      windowMs: RATE_WINDOW_MS,
      blockMs: RATE_BLOCK_MS,
    });
    if (!allowed) return json({ error: "RATE_LIMITED" }, { status: 429 });

    const created = await createF10CustomerPortalSession(email, password);
    setCustomerPortalSessionCookie(cookies, created.token, created.expiresAt);
    const session = await authorizeF10CustomerPortalSession(created.token);
    if (!session) return json({ error: "AUTH_SESSION_INVALID" }, { status: 503 });

    return json(publicCustomer(session), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    if (code === "F10_CUSTOMER_LOGIN_INVALID" || code === "F10_CUSTOMER_TOKEN_EXPIRED") {
      return json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    console.error("[support.chat.auth]", {
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return json({ error: "AUTH_UNAVAILABLE" }, { status: 503 });
  }
};
