import { json, type RequestHandler } from "@sveltejs/kit";
import { hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { markChatDockRead } from "$lib/server/support/chatDockRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const POST: RequestHandler = async ({ params, cookies, request, url }) => {
  const sessionId = params.sessionId ?? "";
  if (!isUuid(sessionId)) return json({ error: "CHAT_NOT_FOUND" }, { status: 404 });
  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }

  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const session = await getSessionUser(token);
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const permissions = await resolveUserPermissions(session.user.id);
  if (!hasPermission(permissions, "chat.respond")) {
    return json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    await markChatDockRead(session.user.id, permissions, sessionId);
    return json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return json({ error: "CHAT_NOT_ACCESSIBLE" }, { status: 404 });
  }
};
