import { error, redirect, type Cookies } from "@sveltejs/kit";
import {
  hasPermission,
  resolveUserPermissions,
  type PermissionCode,
} from "$lib/server/auth/permissions";
import {
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "$lib/server/auth/session";

export async function requireAppPermission(
  cookies: Cookies,
  permissionCode: PermissionCode,
  returnTo: string,
) {
  const token = cookies.get(SESSION_COOKIE_NAME);
  const encodedReturnTo = encodeURIComponent(returnTo);

  if (!token) {
    throw redirect(303, `/login?returnTo=${encodedReturnTo}`);
  }

  const session = await getSessionUser(token);

  if (!session) {
    cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
    throw redirect(303, `/login?returnTo=${encodedReturnTo}`);
  }

  const permissions = await resolveUserPermissions(session.user.id);

  if (!hasPermission(permissions, permissionCode)) {
    throw error(403, "Acesso não autorizado.");
  }

  return { session, permissions };
}
