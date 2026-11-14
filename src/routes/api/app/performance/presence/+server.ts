import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getSupportPresenceTimeline } from "$lib/server/reports/supportPresenceTimelineRepository";

export const GET: RequestHandler = async ({ cookies, url }) => {
  await requireAppPermission(cookies, "reports.view", url.pathname);
  try {
    const presence = await getSupportPresenceTimeline(url.searchParams.get("date"));
    return json(presence, { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "INVALID_PRESENCE_DATE") {
      throw error(400, "Data inválida.");
    }
    throw cause;
  }
};
