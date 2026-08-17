import { randomBytes } from "node:crypto";
import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  buildGoogleCalendarAuthorizationUrl,
  isGoogleCalendarConfigured,
} from "$lib/server/calendar/googleCalendarRepository";

const GOOGLE_CALENDAR_STATE_COOKIE = "f10_google_calendar_state";
const STATE_MAX_AGE_SECONDS = 10 * 60;

export const GET: RequestHandler = async ({ cookies, url }) => {
  const { session } = await requireAppPermission(
    cookies,
    "tasks.view",
    "/app/tasks/calendar",
  );

  if (!isGoogleCalendarConfigured()) {
    throw error(503, "Google Calendar ainda não está configurado neste ambiente.");
  }

  const state = randomBytes(32).toString("base64url");
  cookies.set(GOOGLE_CALENDAR_STATE_COOKIE, state, {
    path: "/app/tasks/calendar/google",
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    maxAge: STATE_MAX_AGE_SECONDS,
  });

  throw redirect(
    303,
    buildGoogleCalendarAuthorizationUrl(state, session.user.email),
  );
};
