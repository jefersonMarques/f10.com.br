import { json, type RequestHandler } from "@sveltejs/kit";
import { hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { listActiveChatDockItems } from "$lib/server/support/chatDockRepository";

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const session = await getSessionUser(token);
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const permissions = await resolveUserPermissions(session.user.id);
  if (!hasPermission(permissions, "chat.respond")) {
    return json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const chats = await listActiveChatDockItems(session.user.id, permissions);
    return json({ chats }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch {
    return json({ error: "CHAT_DOCK_UNAVAILABLE" }, { status: 500 });
  }
};
