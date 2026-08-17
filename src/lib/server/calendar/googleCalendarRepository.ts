import { randomUUID } from "node:crypto";
import { env } from "$env/dynamic/private";
import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { googleCalendarConnections } from "$lib/server/db/googleCalendarSchema";
import {
  decryptGoogleCalendarToken,
  encryptGoogleCalendarToken,
} from "$lib/server/calendar/googleCalendarCrypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
];

export type GoogleCalendarAttendee = {
  email: string;
  displayName: string;
  optional: boolean;
  responseStatus: "needsAction" | "declined" | "tentative" | "accepted" | string;
  self: boolean;
};

export type GoogleCalendarEvent = {
  id: string;
  iCalUID: string | null;
  summary: string;
  description: string;
  location: string;
  htmlLink: string | null;
  meetUrl: string | null;
  conferenceStatus: string | null;
  allDay: boolean;
  startDate: string | null;
  startDateTime: string | null;
  endDate: string | null;
  endDateTime: string | null;
  transparency: string;
  attendees: GoogleCalendarAttendee[];
};

export type GoogleCalendarEventAttendeeInput = {
  email: string;
  optional?: boolean;
};

export type CreateGoogleCalendarEventInput = {
  title: string;
  description: string;
  date: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  timeZone: string;
  addGoogleMeet?: boolean;
  location?: string;
  reminderMinutes?: number | null;
  attendees?: GoogleCalendarEventAttendeeInput[];
};

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  email?: string;
};

type GoogleEventResource = {
  id?: string;
  iCalUID?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  transparency?: string;
  start?: { date?: string; dateTime?: string; timeZone?: string };
  end?: { date?: string; dateTime?: string; timeZone?: string };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    optional?: boolean;
    responseStatus?: string;
    self?: boolean;
  }>;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method?: string; minutes?: number }>;
  };
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
    }>;
    createRequest?: {
      status?: {
        statusCode?: string;
      };
    };
  };
};

type GoogleEventsResponse = {
  items?: GoogleEventResource[];
  nextPageToken?: string;
};

function getGoogleConfig() {
  const clientId = env.GOOGLE_CALENDAR_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() ?? "";
  const tokenKey = env.GOOGLE_CALENDAR_TOKEN_KEY?.trim() ?? "";
  const explicitRedirect = env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ?? "";
  const operationsBaseUrl = env.OPERATIONS_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  const redirectUri = explicitRedirect || (operationsBaseUrl
    ? `${operationsBaseUrl}/app/tasks/calendar/google/callback`
    : "");

  return { clientId, clientSecret, tokenKey, redirectUri };
}

export function isGoogleCalendarConfigured(): boolean {
  const config = getGoogleConfig();
  return Boolean(
    config.clientId &&
    config.clientSecret &&
    config.tokenKey.length >= 32 &&
    config.redirectUri,
  );
}

function requireGoogleConfig() {
  const config = getGoogleConfig();
  if (!isGoogleCalendarConfigured()) throw new Error("GOOGLE_CALENDAR_NOT_CONFIGURED");
  return config;
}

async function parseGoogleResponse<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as T & {
    error?: { message?: string } | string;
    error_description?: string;
  };
  if (!response.ok) {
    const errorValue = body.error;
    const detail = typeof errorValue === "string"
      ? body.error_description || errorValue
      : errorValue?.message || response.statusText;
    throw new Error(`GOOGLE_API_ERROR:${response.status}:${detail}`);
  }
  return body;
}

export function buildGoogleCalendarAuthorizationUrl(state: string, loginHint: string): string {
  const config = requireGoogleConfig();
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  if (loginHint) url.searchParams.set("login_hint", loginHint);
  return url.toString();
}

export async function getGoogleCalendarConnection(userId: string) {
  if (!isGoogleCalendarConfigured()) {
    return { configured: false, connected: false, googleEmail: "" };
  }

  const db = getDatabase();
  const [connection] = await db
    .select({
      googleEmail: googleCalendarConnections.googleEmail,
      connectedAt: googleCalendarConnections.connectedAt,
      lastUsedAt: googleCalendarConnections.lastUsedAt,
    })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);

  return {
    configured: true,
    connected: Boolean(connection),
    googleEmail: connection?.googleEmail ?? "",
    connectedAt: connection?.connectedAt ?? null,
    lastUsedAt: connection?.lastUsedAt ?? null,
  };
}

async function exchangeAuthorizationCode(code: string): Promise<GoogleTokenResponse> {
  const config = requireGoogleConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return parseGoogleResponse<GoogleTokenResponse>(response);
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const config = requireGoogleConfig();
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = await parseGoogleResponse<GoogleTokenResponse>(response);
  if (!token.access_token) throw new Error("GOOGLE_ACCESS_TOKEN_MISSING");
  return token.access_token;
}

async function getGoogleEmail(accessToken: string): Promise<string> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await parseGoogleResponse<GoogleUserInfo>(response);
  return profile.email?.trim().toLowerCase() ?? "";
}

export async function connectGoogleCalendar(userId: string, code: string): Promise<string> {
  const token = await exchangeAuthorizationCode(code);
  if (!token.access_token) throw new Error("GOOGLE_ACCESS_TOKEN_MISSING");

  const db = getDatabase();
  const [existing] = await db
    .select({ refreshTokenEncrypted: googleCalendarConnections.refreshTokenEncrypted })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);

  const refreshTokenEncrypted = token.refresh_token
    ? encryptGoogleCalendarToken(token.refresh_token)
    : existing?.refreshTokenEncrypted;
  if (!refreshTokenEncrypted) throw new Error("GOOGLE_REFRESH_TOKEN_MISSING");

  const googleEmail = await getGoogleEmail(token.access_token);
  const now = new Date();
  await db
    .insert(googleCalendarConnections)
    .values({
      userId,
      googleEmail,
      refreshTokenEncrypted,
      scope: token.scope ?? GOOGLE_SCOPES.join(" "),
      connectedAt: now,
      lastUsedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: googleCalendarConnections.userId,
      set: {
        googleEmail,
        refreshTokenEncrypted,
        scope: token.scope ?? GOOGLE_SCOPES.join(" "),
        connectedAt: now,
        lastUsedAt: now,
        updatedAt: now,
      },
    });
  return googleEmail;
}

async function getUserAccessToken(userId: string): Promise<string> {
  requireGoogleConfig();
  const db = getDatabase();
  const [connection] = await db
    .select({ refreshTokenEncrypted: googleCalendarConnections.refreshTokenEncrypted })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);
  if (!connection) throw new Error("GOOGLE_CALENDAR_NOT_CONNECTED");

  const accessToken = await refreshAccessToken(
    decryptGoogleCalendarToken(connection.refreshTokenEncrypted),
  );
  await db
    .update(googleCalendarConnections)
    .set({ lastUsedAt: new Date() })
    .where(eq(googleCalendarConnections.userId, userId));
  return accessToken;
}

function normalizeGoogleEvent(event: GoogleEventResource): GoogleCalendarEvent | null {
  if (!event.id || event.status === "cancelled" || (!event.start?.date && !event.start?.dateTime)) {
    return null;
  }
  const meetEntry = event.conferenceData?.entryPoints?.find(
    (entryPoint) => entryPoint.entryPointType === "video" && entryPoint.uri,
  );
  return {
    id: event.id,
    iCalUID: event.iCalUID?.trim() || null,
    summary: event.summary?.trim() || "Evento sem título",
    description: event.description?.trim() ?? "",
    location: event.location?.trim() ?? "",
    htmlLink: event.htmlLink ?? null,
    meetUrl: meetEntry?.uri ?? null,
    conferenceStatus: event.conferenceData?.createRequest?.status?.statusCode ?? null,
    allDay: Boolean(event.start.date),
    startDate: event.start.date ?? null,
    startDateTime: event.start.dateTime ?? null,
    endDate: event.end?.date ?? null,
    endDateTime: event.end?.dateTime ?? null,
    transparency: event.transparency ?? "opaque",
    attendees: (event.attendees ?? [])
      .filter((attendee) => attendee.email)
      .map((attendee) => ({
        email: attendee.email?.trim().toLowerCase() ?? "",
        displayName: attendee.displayName?.trim() ?? "",
        optional: Boolean(attendee.optional),
        responseStatus: attendee.responseStatus ?? "needsAction",
        self: Boolean(attendee.self),
      })),
  };
}

export async function listGoogleCalendarEvents(
  userId: string,
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await getUserAccessToken(userId);
  const events: GoogleCalendarEvent[] = [];
  let pageToken = "";

  do {
    const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/primary/events`);
    url.searchParams.set("timeMin", timeMin.toISOString());
    url.searchParams.set("timeMax", timeMax.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("showDeleted", "false");
    url.searchParams.set("maxResults", "2500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const page = await parseGoogleResponse<GoogleEventsResponse>(response);
    for (const resource of page.items ?? []) {
      const event = normalizeGoogleEvent(resource);
      if (event) events.push(event);
    }
    pageToken = page.nextPageToken ?? "";
  } while (pageToken);

  return events;
}

function addOneDay(dateValue: string): string {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function googleEventResource(input: CreateGoogleCalendarEventInput) {
  const schedule = input.allDay
    ? {
        start: { date: input.date },
        end: { date: addOneDay(input.date) },
      }
    : {
        start: { dateTime: `${input.date}T${input.startTime}:00`, timeZone: input.timeZone },
        end: { dateTime: `${input.date}T${input.endTime}:00`, timeZone: input.timeZone },
      };

  const details: Record<string, unknown> = {};
  if (input.location !== undefined) {
    details.location = input.location.trim();
  }
  if (input.attendees !== undefined) {
    details.attendees = input.attendees.map((attendee) => ({
      email: attendee.email.trim().toLowerCase(),
      optional: Boolean(attendee.optional),
    }));
  }
  if (input.reminderMinutes !== undefined) {
    const reminderMinutes = input.reminderMinutes;
    details.reminders = reminderMinutes === null
      ? { useDefault: true }
      : {
          useDefault: false,
          overrides: reminderMinutes > 0
            ? [{ method: "popup", minutes: reminderMinutes }]
            : [],
        };
  }

  return {
    summary: input.title,
    description: input.description,
    ...details,
    ...schedule,
    ...(input.addGoogleMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };
}

function calendarEventsUrl(calendarId: string): string {
  return `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`;
}

async function getGoogleCalendarEventWithToken(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<GoogleCalendarEvent | null> {
  const response = await fetch(
    `${calendarEventsUrl(calendarId)}/${encodeURIComponent(eventId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (response.status === 404 || response.status === 410) return null;
  const resource = await parseGoogleResponse<GoogleEventResource>(response);
  return normalizeGoogleEvent(resource);
}

export async function getGoogleCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string,
): Promise<GoogleCalendarEvent | null> {
  const accessToken = await getUserAccessToken(userId);
  return getGoogleCalendarEventWithToken(accessToken, calendarId, eventId);
}

async function waitForGoogleMeet(
  accessToken: string,
  calendarId: string,
  event: GoogleCalendarEvent,
): Promise<GoogleCalendarEvent> {
  if (event.meetUrl || event.conferenceStatus === "failure") return event;

  let current = event;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const refreshed = await getGoogleCalendarEventWithToken(
      accessToken,
      calendarId,
      event.id,
    );
    if (!refreshed) return current;
    current = refreshed;
    if (current.meetUrl || current.conferenceStatus === "failure") return current;
  }
  return current;
}

export async function createGoogleCalendarEvent(
  userId: string,
  input: CreateGoogleCalendarEventInput,
  calendarId = "primary",
): Promise<GoogleCalendarEvent> {
  const accessToken = await getUserAccessToken(userId);
  const url = new URL(calendarEventsUrl(calendarId));
  if (input.addGoogleMeet) url.searchParams.set("conferenceDataVersion", "1");
  if (input.attendees !== undefined) url.searchParams.set("sendUpdates", "all");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(googleEventResource(input)),
  });
  const created = await parseGoogleResponse<GoogleEventResource>(response);
  const normalized = normalizeGoogleEvent(created);
  if (!normalized) throw new Error("GOOGLE_EVENT_INVALID_RESPONSE");
  return input.addGoogleMeet
    ? waitForGoogleMeet(accessToken, calendarId, normalized)
    : normalized;
}

export async function addGoogleMeetToGoogleCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string,
): Promise<GoogleCalendarEvent> {
  const accessToken = await getUserAccessToken(userId);
  const url = new URL(`${calendarEventsUrl(calendarId)}/${encodeURIComponent(eventId)}`);
  url.searchParams.set("conferenceDataVersion", "1");

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conferenceData: {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  });
  const resource = await parseGoogleResponse<GoogleEventResource>(response);
  const normalized = normalizeGoogleEvent(resource);
  if (!normalized) throw new Error("GOOGLE_EVENT_INVALID_RESPONSE");
  return waitForGoogleMeet(accessToken, calendarId, normalized);
}

export async function updateGoogleCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string,
  input: CreateGoogleCalendarEventInput,
): Promise<GoogleCalendarEvent | null> {
  const accessToken = await getUserAccessToken(userId);
  const url = new URL(`${calendarEventsUrl(calendarId)}/${encodeURIComponent(eventId)}`);
  url.searchParams.set("conferenceDataVersion", "1");
  if (input.attendees !== undefined) url.searchParams.set("sendUpdates", "all");
  const resource = googleEventResource({ ...input, addGoogleMeet: false });

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(resource),
  });

  if (response.status === 404 || response.status === 410) return null;
  const updated = await parseGoogleResponse<GoogleEventResource>(response);
  const normalized = normalizeGoogleEvent(updated);
  if (!normalized) throw new Error("GOOGLE_EVENT_INVALID_RESPONSE");
  return normalized;
}

export async function deleteGoogleCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const accessToken = await getUserAccessToken(userId);
  const response = await fetch(
    `${calendarEventsUrl(calendarId)}/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (response.ok || response.status === 404 || response.status === 410) return;
  await parseGoogleResponse<Record<string, never>>(response);
}

export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  const db = getDatabase();
  const [connection] = await db
    .select({ refreshTokenEncrypted: googleCalendarConnections.refreshTokenEncrypted })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);
  if (!connection) return;

  try {
    const refreshToken = decryptGoogleCalendarToken(connection.refreshTokenEncrypted);
    await fetch(GOOGLE_REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    });
  } finally {
    await db
      .delete(googleCalendarConnections)
      .where(eq(googleCalendarConnections.userId, userId));
  }
}
