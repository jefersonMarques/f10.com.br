import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";

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

  return {
    user: session.user,
    roles: session.roles,
    permissions: Array.from(permissionMap, ([code, scope]) => ({ code, scope })),
  };
};
