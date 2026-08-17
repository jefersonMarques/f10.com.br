import { getGoogleCalendarConnection } from "$lib/server/calendar/googleCalendarRepository";
import type { TaskGoogleCalendarAttendee } from "$lib/server/db/googleCalendarSchema";
import { listActiveTaskUsers } from "$lib/server/tasks/taskRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function parseReminderMinutes(formData: FormData): number | null {
  const raw = readFormValue(formData, "reminderMinutes");
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0 || value > 40320) {
    throw new Error("INVALID_REMINDER");
  }
  return value;
}

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseAttendees(
  formData: FormData,
  activeUsers: Awaited<ReturnType<typeof listActiveTaskUsers>>,
  organizerUserId: string,
  organizerEmail: string,
): TaskGoogleCalendarAttendee[] {
  const raw = readFormValue(formData, "attendeesJson");
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("INVALID_ATTENDEES");
  }
  if (!Array.isArray(parsed)) throw new Error("INVALID_ATTENDEES");

  const organizerEmailNormalized = organizerEmail.trim().toLowerCase();
  const attendees = new Map<string, TaskGoogleCalendarAttendee>();
  for (const item of parsed.slice(0, 100)) {
    if (!item || typeof item !== "object") continue;
    const value = item as Record<string, unknown>;
    const requestedUserId = typeof value.userId === "string" ? value.userId.trim() : "";
    const requestedEmail = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
    const optional = Boolean(value.optional);

    const internal = requestedUserId
      ? activeUsers.find((user) => user.id === requestedUserId)
      : activeUsers.find((user) => user.email.trim().toLowerCase() === requestedEmail);

    if (internal) {
      if (internal.id === organizerUserId) continue;
      const email = internal.email.trim().toLowerCase();
      if (!email || email === organizerEmailNormalized) continue;
      attendees.set(email, {
        email,
        name: internal.name,
        userId: internal.id,
        optional,
      });
      continue;
    }

    if (!isValidEmail(requestedEmail) || requestedEmail === organizerEmailNormalized) {
      throw new Error("INVALID_ATTENDEES");
    }
    attendees.set(requestedEmail, {
      email: requestedEmail,
      name: typeof value.name === "string" ? value.name.trim().slice(0, 160) : "",
      userId: null,
      optional,
    });
  }
  return Array.from(attendees.values());
}

export async function readGoogleEventDetailsFromForm(
  userId: string,
  formData: FormData,
): Promise<{
  location: string;
  reminderMinutes: number | null;
  attendees: TaskGoogleCalendarAttendee[];
}> {
  const location = readFormValue(formData, "location");
  if (location.length > 500) throw new Error("INVALID_LOCATION");

  const [activeUsers, connection] = await Promise.all([
    listActiveTaskUsers(),
    getGoogleCalendarConnection(userId),
  ]);
  return {
    location,
    reminderMinutes: parseReminderMinutes(formData),
    attendees: parseAttendees(
      formData,
      activeUsers,
      userId,
      connection.googleEmail,
    ),
  };
}
