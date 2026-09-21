import { json, type RequestHandler } from "@sveltejs/kit";
import { resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { listInternalChatRelatedTickets } from "$lib/server/support/internalChatConversationRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const sessionId = params.sessionId ?? "";
  if (!isUuid(sessionId)) {
    return json({ error: "CHAT_NOT_FOUND" }, { status: 404 });
  }

  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const session = await getSessionUser(token);
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const permissions = await resolveUserPermissions(session.user.id);
    const tickets = await listInternalChatRelatedTickets(
      session.user.id,
      permissions,
      sessionId,
    );
    return json({ tickets }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return json({ error: "CHAT_NOT_FOUND" }, { status: 404 });
  }
};
