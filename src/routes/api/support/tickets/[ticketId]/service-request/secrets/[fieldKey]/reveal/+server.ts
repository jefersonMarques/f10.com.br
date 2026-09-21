import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { revealSupportServiceRequestSecret } from "$lib/server/serviceRequests/serviceRequestOperations";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isSafeFieldKey(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(value);
}

export const POST: RequestHandler = async ({ cookies, params, url, request }) => {
  const ticketId = params.ticketId ?? "";
  const fieldKey = params.fieldKey ?? "";
  if (!isUuid(ticketId) || !isSafeFieldKey(fieldKey)) throw error(404, "Credencial não encontrada.");

  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) throw error(403, "Origem inválida.");

  const { session, permissions } = await requireAppPermission(
    cookies,
    "tickets.reply",
    url.pathname,
  );
  const scope = getPermissionScope(permissions, "tickets.reply");
  if (!scope) throw error(403, "Acesso não autorizado.");

  try {
    const value = await revealSupportServiceRequestSecret(
      session.user.id,
      scope,
      ticketId,
      fieldKey,
    );
    return json(
      { success: true, value },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          Pragma: "no-cache",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "SERVICE_REQUEST_SECRET_REVEAL_FAILED";
    if (code === "SERVICE_REQUEST_SECRET_NOT_SET") {
      return json({ success: false, error: code }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    if (code === "TICKET_NOT_ACCESSIBLE") throw error(403, "Acesso não autorizado.");
    if (code.startsWith("SERVICE_REQUEST_")) {
      return json({ success: false, error: code }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    throw error(500, "Não foi possível revelar a credencial.");
  }
};
