import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { recordAuditEvent } from "$lib/server/auth/audit";
import {
  getSessionUser,
  revokeSession,
  SESSION_COOKIE_NAME,
} from "$lib/server/auth/session";

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);

  if (token) {
    try {
      const session = await getSessionUser(token);
      await revokeSession(token);

      if (session) {
        await recordAuditEvent({
          actorUserId: session.user.id,
          action: "auth.logout",
        });
      }
    } catch (error) {
      console.error("Failed to revoke F10 Operations session during logout.", error);
    }
  }

  cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
  throw redirect(303, "/login");
};
