import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { removeDeviceSubscriptionById } from "$lib/server/notifications/devicePush";
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
        await removeDeviceSubscriptionById(session.user.id, cookies.get("f10_push_device_id"))
          .catch(() => undefined);
        await recordAuditEvent({
          actorUserId: session.user.id,
          action: "auth.logout",
        });
      }
    } catch (error) {
      console.error("Failed to revoke F10 Operations session during logout.", error);
    }
  }

  cookies.delete("f10_push_device_id", { path: "/app" });
  cookies.delete(SESSION_COOKIE_NAME, { path: "/" });
  throw redirect(303, "/login");
};
