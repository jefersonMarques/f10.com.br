import { and, eq } from "drizzle-orm";
import {
  getGoogleCalendarConnection,
  listGoogleCalendarEvents,
  type GoogleCalendarEvent,
} from "$lib/server/calendar/googleCalendarRepository";
import { getDatabase } from "$lib/server/db";
import { taskGoogleCalendarLinks } from "$lib/server/db/googleCalendarSchema";
import { tasks } from "$lib/server/db/taskSchema";

export type CalendarAvailabilityUser = {
  id: string;
  name: string;
  email: string;
};

export type CalendarAvailabilityConflict = {
  start: string;
  end: string;
  allDay: boolean;
  source: "google" | "f10";
};

export type CalendarAvailabilityResult = {
  userId: string;
  name: string;
  email: string;
  coverage: "google" | "f10-only";
  conflicts: CalendarAvailabilityConflict[];
};

export type CalendarAvailabilityInput = {
  users: CalendarAvailabilityUser[];
  date: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  excludeGoogleEventId?: string | null;
};

function localDateTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = targetAsUtc;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(guess))
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, Number(part.value)]),
    ) as Record<string, number>;
    const representedAsUtc = Date.UTC(
      parts.year,
      (parts.month ?? 1) - 1,
      parts.day ?? 1,
      parts.hour ?? 0,
      parts.minute ?? 0,
      parts.second ?? 0,
    );
    const offset = representedAsUtc - guess;
    const next = targetAsUtc - offset;
    if (Math.abs(next - guess) < 1000) return new Date(next);
    guess = next;
  }

  return new Date(guess);
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function overlaps(start: Date, end: Date, busyStart: Date, busyEnd: Date): boolean {
  return start.getTime() < busyEnd.getTime() && end.getTime() > busyStart.getTime();
}

function selfDeclined(event: GoogleCalendarEvent): boolean {
  return event.attendees.some(
    (attendee) => attendee.self && attendee.responseStatus === "declined",
  );
}

function eventInterval(
  event: GoogleCalendarEvent,
  fallbackTimeZone: string,
): { start: Date; end: Date; allDay: boolean } | null {
  if (event.allDay && event.startDate) {
    const endDate = event.endDate || addDays(event.startDate, 1);
    return {
      start: localDateTimeToUtc(event.startDate, "00:00", fallbackTimeZone),
      end: localDateTimeToUtc(endDate, "00:00", fallbackTimeZone),
      allDay: true,
    };
  }

  if (!event.startDateTime || !event.endDateTime) return null;
  const start = new Date(event.startDateTime);
  const end = new Date(event.endDateTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return null;
  return { start, end, allDay: false };
}

async function listF10Conflicts(
  userId: string,
  input: CalendarAvailabilityInput,
  requestedStart: Date,
  requestedEnd: Date,
): Promise<CalendarAvailabilityConflict[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      dueOn: tasks.dueOn,
      googleEventId: taskGoogleCalendarLinks.googleEventId,
      allDay: taskGoogleCalendarLinks.allDay,
      startTime: taskGoogleCalendarLinks.startTime,
      endTime: taskGoogleCalendarLinks.endTime,
      timeZone: taskGoogleCalendarLinks.timeZone,
    })
    .from(taskGoogleCalendarLinks)
    .innerJoin(tasks, eq(taskGoogleCalendarLinks.taskId, tasks.id))
    .where(
      and(
        eq(taskGoogleCalendarLinks.userId, userId),
        eq(tasks.dueOn, input.date),
      ),
    );

  const conflicts: CalendarAvailabilityConflict[] = [];
  for (const row of rows) {
    if (!row.dueOn || row.googleEventId === input.excludeGoogleEventId) continue;
    const busyStart = row.allDay
      ? localDateTimeToUtc(row.dueOn, "00:00", row.timeZone || input.timeZone)
      : localDateTimeToUtc(row.dueOn, row.startTime || "00:00", row.timeZone || input.timeZone);
    const busyEnd = row.allDay
      ? localDateTimeToUtc(addDays(row.dueOn, 1), "00:00", row.timeZone || input.timeZone)
      : localDateTimeToUtc(row.dueOn, row.endTime || "23:59", row.timeZone || input.timeZone);

    if (!overlaps(requestedStart, requestedEnd, busyStart, busyEnd)) continue;
    conflicts.push({
      start: busyStart.toISOString(),
      end: busyEnd.toISOString(),
      allDay: row.allDay,
      source: "f10",
    });
  }
  return conflicts;
}

async function checkUser(
  user: CalendarAvailabilityUser,
  input: CalendarAvailabilityInput,
  requestedStart: Date,
  requestedEnd: Date,
): Promise<CalendarAvailabilityResult> {
  const connection = await getGoogleCalendarConnection(user.id);

  if (connection.connected) {
    try {
      const rangeStart = new Date(requestedStart.getTime() - 24 * 60 * 60 * 1000);
      const rangeEnd = new Date(requestedEnd.getTime() + 24 * 60 * 60 * 1000);
      const events = await listGoogleCalendarEvents(user.id, rangeStart, rangeEnd);
      const conflicts: CalendarAvailabilityConflict[] = [];

      for (const event of events) {
        if (event.id === input.excludeGoogleEventId) continue;
        if (event.transparency === "transparent" || selfDeclined(event)) continue;
        const interval = eventInterval(event, input.timeZone);
        if (!interval || !overlaps(requestedStart, requestedEnd, interval.start, interval.end)) continue;
        conflicts.push({
          start: interval.start.toISOString(),
          end: interval.end.toISOString(),
          allDay: interval.allDay,
          source: "google",
        });
      }

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        coverage: "google",
        conflicts,
      };
    } catch {
      // Se o Google estiver indisponível, ainda usamos os compromissos temporizados conhecidos pelo F10.
    }
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    coverage: "f10-only",
    conflicts: await listF10Conflicts(user.id, input, requestedStart, requestedEnd),
  };
}

export async function checkF10CalendarAvailability(
  input: CalendarAvailabilityInput,
): Promise<CalendarAvailabilityResult[]> {
  const requestedStart = localDateTimeToUtc(input.date, input.startTime, input.timeZone);
  const requestedEnd = localDateTimeToUtc(input.date, input.endTime, input.timeZone);
  if (requestedStart.getTime() >= requestedEnd.getTime()) {
    throw new Error("CALENDAR_AVAILABILITY_INVALID_RANGE");
  }

  return Promise.all(
    input.users.slice(0, 30).map((user) => checkUser(user, input, requestedStart, requestedEnd)),
  );
}
