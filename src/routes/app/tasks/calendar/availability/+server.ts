import { and, eq } from "drizzle-orm";
import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppAnyPermission } from "$lib/server/auth/authorization";
import { checkF10CalendarAvailability } from "$lib/server/calendar/f10CalendarAvailabilityRepository";
import { getGoogleCalendarEvent } from "$lib/server/calendar/googleCalendarRepository";
import { getDatabase } from "$lib/server/db";
import { taskGoogleCalendarLinks } from "$lib/server/db/googleCalendarSchema";
import { listActiveTaskUsers } from "$lib/server/tasks/taskRepository";

const AVAILABILITY_ACCESS_PERMISSIONS = [
  "tasks.view",
  "tickets.view",
  "scheduling.view",
  "scheduling.create",
] as const;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export const POST: RequestHandler = async ({ cookies, request }) => {
  const { session } = await requireAppAnyPermission(
    cookies,
    [...AVAILABILITY_ACCESS_PERMISSIONS],
    "/app/tasks/calendar",
  );

  const body = await request.json().catch(() => null) as null | {
    userIds?: unknown;
    date?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    timeZone?: unknown;
    excludeGoogleEventId?: unknown;
    excludeGoogleIcalUid?: unknown;
  };

  const userIds = Array.isArray(body?.userIds)
    ? Array.from(new Set(body.userIds.filter((value): value is string => typeof value === "string" && isUuid(value)))).slice(0, 30)
    : [];
  const date = typeof body?.date === "string" ? body.date.trim() : "";
  const startTime = typeof body?.startTime === "string" ? body.startTime.trim() : "";
  const endTime = typeof body?.endTime === "string" ? body.endTime.trim() : "";
  const timeZone = typeof body?.timeZone === "string" ? body.timeZone.trim() : "";
  const excludeGoogleEventId = typeof body?.excludeGoogleEventId === "string"
    ? body.excludeGoogleEventId.trim().slice(0, 1024)
    : "";
  let excludeGoogleIcalUid = typeof body?.excludeGoogleIcalUid === "string"
    ? body.excludeGoogleIcalUid.trim().slice(0, 1024)
    : "";

  if (!isValidDate(date) || !isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime || !isValidTimeZone(timeZone)) {
    return json({ message: "Período inválido para verificar disponibilidade." }, { status: 400 });
  }

  if (userIds.length === 0) return json({ results: [] });

  if (excludeGoogleEventId && !excludeGoogleIcalUid) {
    const db = getDatabase();
    const [link] = await db
      .select({
        googleCalendarId: taskGoogleCalendarLinks.googleCalendarId,
        googleIcalUid: taskGoogleCalendarLinks.googleIcalUid,
      })
      .from(taskGoogleCalendarLinks)
      .where(
        and(
          eq(taskGoogleCalendarLinks.userId, session.user.id),
          eq(taskGoogleCalendarLinks.googleEventId, excludeGoogleEventId),
        ),
      )
      .limit(1);
    excludeGoogleIcalUid = link?.googleIcalUid ?? "";

    if (!excludeGoogleIcalUid && link) {
      try {
        const event = await getGoogleCalendarEvent(
          session.user.id,
          link.googleCalendarId,
          excludeGoogleEventId,
        );
        excludeGoogleIcalUid = event?.iCalUID ?? "";
      } catch {
        // A ausência do UID não impede a checagem; apenas reduz a capacidade de excluir a cópia do próprio convite.
      }
    }
  }

  const activeUsers = await listActiveTaskUsers();
  const selectedUsers = userIds
    .map((userId) => activeUsers.find((user) => user.id === userId))
    .filter((user): user is (typeof activeUsers)[number] => Boolean(user));

  try {
    const results = await checkF10CalendarAvailability({
      users: selectedUsers,
      date,
      startTime,
      endTime,
      timeZone,
      excludeGoogleEventId: excludeGoogleEventId || null,
      excludeGoogleIcalUid: excludeGoogleIcalUid || null,
    });
    return json({ results });
  } catch {
    return json({ message: "Não foi possível verificar a disponibilidade agora." }, { status: 409 });
  }
};
