import { redirect, type RequestHandler } from "@sveltejs/kit";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { markNotificationRead } from "$lib/server/notifications/notificationRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ cookies, params }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  const notificationId = params.notificationId ?? "";
  const returnTo = encodeURIComponent(`/app/notifications/open/${notificationId}`);

  if (!token) throw redirect(303, `/login?returnTo=${returnTo}`);
  const session = await getSessionUser(token);
  if (!session) {
    cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
    throw redirect(303, `/login?returnTo=${returnTo}`);
  }

  if (!isUuid(notificationId)) throw redirect(303, "/app");
  const href = await markNotificationRead(session.user.id, notificationId);
  throw redirect(303, href && href.startsWith("/app/") ? href : "/app");
};
