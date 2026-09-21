import { json, type RequestHandler } from "@sveltejs/kit";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { getNotificationSummary } from "$lib/server/notifications/notificationRepository";

export const GET: RequestHandler = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const session = await getSessionUser(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
    return json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  return json(await getNotificationSummary(session.user.id), {
    headers: { "Cache-Control": "no-store" },
  });
};
