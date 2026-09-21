import { json, type RequestHandler } from "@sveltejs/kit";
import {
  selectF10CustomerUnit,
  type CustomerF10PortalSession,
} from "$lib/server/customerPortal/customerF10AuthRepository";
import { getCustomerPortalSessionToken } from "$lib/server/customerPortal/customerPortalSession";

const MAX_BODY_BYTES = 2 * 1024;

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function parseId(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function publicCustomer(session: CustomerF10PortalSession) {
  return {
    authenticated: session.selectedUnitId !== null,
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

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  if (isBodyTooLarge(request)) return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const groupId = parseId(body.groupId);
  const unitId = parseId(body.unitId);
  if (groupId === null || unitId === null) {
    return json({ error: "INVALID_UNIT" }, { status: 400 });
  }

  const token = getCustomerPortalSessionToken(cookies);
  if (!token) return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401 });

  try {
    const session = await selectF10CustomerUnit(token, groupId, unitId);
    return json(publicCustomer(session), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    if (code === "F10_CUSTOMER_UNIT_NOT_AUTHORIZED") {
      return json({ error: "UNIT_NOT_AUTHORIZED" }, { status: 403 });
    }
    if (code === "F10_CUSTOMER_SESSION_INVALID" || code === "F10_CUSTOMER_TOKEN_REJECTED") {
      return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401 });
    }

    console.error("[support.chat.auth.unit]", {
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return json({ error: "UNIT_SELECTION_UNAVAILABLE" }, { status: 503 });
  }
};
