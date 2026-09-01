import { json, type RequestHandler } from "@sveltejs/kit";
import { resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { listInternalChatConversations } from "$lib/server/support/internalChatConversationRepository";

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const session = await getSessionUser(token);
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const permissions = await resolveUserPermissions(session.user.id);
    const chats = await listInternalChatConversations(session.user.id, permissions);
    return json({ chats }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return json({ error: "CHAT_NOT_ALLOWED" }, { status: 403 });
  }
};
