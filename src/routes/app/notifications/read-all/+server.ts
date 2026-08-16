import { redirect, type RequestHandler } from "@sveltejs/kit";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { markAllNotificationsRead } from "$lib/server/notifications/notificationRepository";

export const POST: RequestHandler = async ({ cookies, request }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) throw redirect(303, "/login?returnTo=%2Fapp");

  const session = await getSessionUser(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
    throw redirect(303, "/login?returnTo=%2Fapp");
  }

  await markAllNotificationsRead(session.user.id);
  const referer = request.headers.get("referer");
  let returnTo = "/app";
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.pathname.startsWith("/app")) returnTo = `${url.pathname}${url.search}`;
    } catch {
      // Mantém o retorno seguro para /app.
    }
  }
  throw redirect(303, returnTo);
};
