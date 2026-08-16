import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { getNotificationSummary } from "$lib/server/notifications/notificationRepository";
import { getSupportAgentPresence } from "$lib/server/support/supportAgentPresence";

const OFFLINE_PRESENCE = {
  manualStatus: "offline" as const,
  effectiveStatus: "offline" as const,
  lastActivityAt: null,
};

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);

  if (!token) {
    throw redirect(303, `/login?returnTo=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
  }

  const session = await getSessionUser(token);

  if (!session) {
    cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
    throw redirect(303, `/login?returnTo=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
  }

  const permissionMap = await resolveUserPermissions(session.user.id);
  const [notifications, presence] = await Promise.all([
    getNotificationSummary(session.user.id),
    hasPermission(permissionMap, "chat.respond")
      ? getSupportAgentPresence(session.user.id).catch(() => OFFLINE_PRESENCE)
      : Promise.resolve(null),
  ]);

  return {
    user: session.user,
    roles: session.roles,
    permissions: Array.from(permissionMap, ([code, scope]) => ({ code, scope })),
    notifications,
    presence,
  };
};
