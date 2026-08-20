import { timingSafeEqual } from "node:crypto";
import { redirect, type RequestHandler } from "@sveltejs/kit";
import { requireAppAnyPermission } from "$lib/server/auth/authorization";
import { connectGoogleCalendar } from "$lib/server/calendar/googleCalendarRepository";

const GOOGLE_CALENDAR_STATE_COOKIE = "f10_google_calendar_state";

function stateMatches(expected: string, received: string): boolean {
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export const GET: RequestHandler = async ({ cookies, url }) => {
  const { session } = await requireAppAnyPermission(
    cookies,
    ["tasks.view", "tickets.view", "scheduling.view", "scheduling.create", "integrations.view"],
    "/app/tasks/calendar",
  );

  const expectedState = cookies.get(GOOGLE_CALENDAR_STATE_COOKIE) ?? "";
  const receivedState = url.searchParams.get("state") ?? "";
  cookies.delete(GOOGLE_CALENDAR_STATE_COOKIE, {
    path: "/app/tasks/calendar/google",
  });

  if (!stateMatches(expectedState, receivedState)) {
    throw redirect(303, "/app/tasks/calendar?google=invalid_state");
  }

  if (url.searchParams.has("error")) {
    throw redirect(303, "/app/tasks/calendar?google=cancelled");
  }

  const code = url.searchParams.get("code")?.trim() ?? "";
  if (!code) {
    throw redirect(303, "/app/tasks/calendar?google=missing_code");
  }

  try {
    await connectGoogleCalendar(session.user.id, code);
    throw redirect(303, "/app/tasks/calendar?google=connected");
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
    throw redirect(303, "/app/tasks/calendar?google=connect_failed");
  }
};
