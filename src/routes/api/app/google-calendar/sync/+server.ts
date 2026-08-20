import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppAnyPermission } from "$lib/server/auth/authorization";
import type { PermissionCode } from "$lib/server/auth/permissions";
import { getGoogleCalendarConnection } from "$lib/server/calendar/googleCalendarRepository";
import {
  claimGoogleCalendarBackgroundSync,
  completeGoogleCalendarBackgroundSync,
  releaseGoogleCalendarBackgroundSync,
} from "$lib/server/calendar/googleCalendarPreferenceRepository";
import { synchronizeGoogleCalendar } from "$lib/server/calendar/googleCalendarSyncService";

const GOOGLE_ACCESS_PERMISSIONS: PermissionCode[] = [
  "tasks.view",
  "tickets.view",
  "scheduling.view",
  "scheduling.create",
  "integrations.view",
];

function synchronizationRange(): { timeMin: Date; timeMax: Date } {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  return {
    timeMin: new Date(now - 45 * dayMs),
    timeMax: new Date(now + 120 * dayMs),
  };
}

export const POST: RequestHandler = async ({ cookies }) => {
  const { session, permissions } = await requireAppAnyPermission(
    cookies,
    GOOGLE_ACCESS_PERMISSIONS,
    "/app",
  );
  const connection = await getGoogleCalendarConnection(session.user.id);

  if (!connection.connected) {
    return json({ synced: false, reason: "not_connected" });
  }
  if (!connection.scopesReady) {
    return json({ synced: false, reason: "reconnect_required" });
  }

  const claimed = await claimGoogleCalendarBackgroundSync(session.user.id);
  if (!claimed) {
    return json({ synced: false, reason: "not_due" });
  }

  try {
    const result = await synchronizeGoogleCalendar({
      userId: session.user.id,
      permissions,
      ...synchronizationRange(),
    });

    if (!result.syncedAt) {
      await releaseGoogleCalendarBackgroundSync(
        session.user.id,
        result.warning || "GOOGLE_CALENDAR_BACKGROUND_SYNC_FAILED",
      );
      return json({ synced: false, reason: "failed", warning: result.warning });
    }

    await completeGoogleCalendarBackgroundSync(session.user.id, null);
    return json({
      synced: true,
      syncedAt: result.syncedAt.toISOString(),
      warning: result.warning,
    });
  } catch {
    await releaseGoogleCalendarBackgroundSync(
      session.user.id,
      "GOOGLE_CALENDAR_BACKGROUND_SYNC_FAILED",
    );
    return json({ synced: false, reason: "failed" });
  }
};
