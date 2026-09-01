import { getPermissionScope, hasPermission, type PermissionScope } from "$lib/server/auth/permissions";
import { recordAuditEvent } from "$lib/server/auth/audit";
import {
  createGoogleCalendarEvent,
  getGoogleCalendarConnection,
} from "$lib/server/calendar/googleCalendarRepository";
import { getGoogleCalendarSyncPreferences } from "$lib/server/calendar/googleCalendarPreferenceRepository";
import {
  cancelSchedulingEvent,
  createSchedulingEvent,
  getSchedulingEvent,
  getSchedulingInternalParticipantUsers,
  listSchedulingEvents,
  upsertSchedulingEventGoogleLink,
  type SchedulingEventParticipantInput,
} from "$lib/server/calendar/schedulingEventRepository";
import {
  listSchedulingHosts,
  listSchedulingTeamUserIds,
} from "$lib/server/calendar/schedulingRepository";
import {
  instantToZonedParts,
  isValidDateKey,
  isValidTimeValue,
  isValidTimeZone,
  localDateTimeToUtc,
} from "$lib/server/calendar/schedulingTime";

export type SchedulingEventPermissionMap = Map<string, PermissionScope>;

export type SchedulingEventAttendeeInput = {
  userId: string | null;
  name: string;
  email: string;
};

export type CreateAgendaSchedulingEventInput = {
  organizerUserId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  attendees: SchedulingEventAttendeeInput[];
  ticketId?: string | null;
  taskId?: string | null;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function canOperateOrganizer(
  actorUserId: string,
  organizerUserId: string,
  permissions: SchedulingEventPermissionMap,
): Promise<boolean> {
  if (hasPermission(permissions, "scheduling.manage")) return true;
  const scope = getPermissionScope(permissions, "scheduling.create");
  if (scope === "all") return true;
  if (scope === "team") {
    const teamUserIds = await listSchedulingTeamUserIds(actorUserId);
    return teamUserIds.includes(organizerUserId);
  }
  return scope === "own" && actorUserId === organizerUserId;
}

async function visibleSchedulingUserIds(
  actorUserId: string,
  permissions: SchedulingEventPermissionMap,
): Promise<string[]> {
  const scope = getPermissionScope(permissions, "scheduling.view");
  if (hasPermission(permissions, "scheduling.manage") || scope === "all") {
    const hosts = await listSchedulingHosts();
    return hosts.map((host) => host.id);
  }
  if (scope === "team") return listSchedulingTeamUserIds(actorUserId);
  return scope === "own" ? [actorUserId] : [];
}

async function normalizeParticipants(
  organizerUserId: string,
  attendees: SchedulingEventAttendeeInput[],
): Promise<SchedulingEventParticipantInput[]> {
  const internalUserIds = Array.from(new Set(
    attendees
      .map((attendee) => attendee.userId?.trim() ?? "")
      .filter((userId) => userId && userId !== organizerUserId),
  ));
  const internalUsers = await getSchedulingInternalParticipantUsers(internalUserIds);
  if (internalUsers.length !== internalUserIds.length || internalUsers.some((user) => user.status !== "active")) {
    throw new Error("SCHEDULING_EVENT_INVALID_PARTICIPANT");
  }
  const internalById = new Map(internalUsers.map((user) => [user.id, user]));

  const normalized = new Map<string, SchedulingEventParticipantInput>();
  for (const attendee of attendees.slice(0, 100)) {
    const userId = attendee.userId?.trim() || null;
    if (userId === organizerUserId) continue;

    if (userId) {
      const user = internalById.get(userId);
      if (!user) throw new Error("SCHEDULING_EVENT_INVALID_PARTICIPANT");
      const email = normalizeEmail(user.email);
      normalized.set(`user:${user.id}`, {
        kind: "internal",
        userId: user.id,
        name: user.name.trim(),
        email,
      });
      continue;
    }

    const email = normalizeEmail(attendee.email);
    if (!isValidEmail(email)) throw new Error("SCHEDULING_EVENT_INVALID_PARTICIPANT");
    normalized.set(`email:${email}`, {
      kind: "external",
      name: attendee.name.trim().slice(0, 160),
      email,
    });
  }
  return Array.from(normalized.values());
}

async function syncSchedulingEventToGoogle(input: {
  eventId: string;
  organizerUserId: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  attendees: SchedulingEventParticipantInput[];
}): Promise<boolean> {
  const [preferences, connection] = await Promise.all([
    getGoogleCalendarSyncPreferences(input.organizerUserId),
    getGoogleCalendarConnection(input.organizerUserId),
  ]);
  if (!preferences.syncSchedulingToGoogle || !connection.connected) return false;

  const localStart = instantToZonedParts(input.startsAt, input.timeZone);
  const localEnd = instantToZonedParts(input.endsAt, input.timeZone);
  if (localStart.date !== localEnd.date) return false;

  const preferredCalendarId = preferences.targetCalendarId || "primary";
  let calendarId = preferredCalendarId;
  try {
    let googleEvent;
    try {
      googleEvent = await createGoogleCalendarEvent(
        input.organizerUserId,
        {
          title: input.title,
          description: input.description,
          date: localStart.date,
          allDay: false,
          startTime: localStart.time,
          endTime: localEnd.time,
          timeZone: input.timeZone,
          attendees: input.attendees
            .filter((attendee) => isValidEmail(attendee.email))
            .map((attendee) => ({ email: attendee.email })),
        },
        preferredCalendarId,
      );
    } catch (cause) {
      if (preferredCalendarId === "primary") throw cause;
      calendarId = "primary";
      googleEvent = await createGoogleCalendarEvent(
        input.organizerUserId,
        {
          title: input.title,
          description: input.description,
          date: localStart.date,
          allDay: false,
          startTime: localStart.time,
          endTime: localEnd.time,
          timeZone: input.timeZone,
          attendees: input.attendees
            .filter((attendee) => isValidEmail(attendee.email))
            .map((attendee) => ({ email: attendee.email })),
        },
        "primary",
      );
    }

    await upsertSchedulingEventGoogleLink({
      eventId: input.eventId,
      userId: input.organizerUserId,
      googleCalendarId: calendarId,
      googleEventId: googleEvent.id,
      googleIcalUid: googleEvent.iCalUID,
      googleHtmlLink: googleEvent.htmlLink,
      googleMeetUrl: googleEvent.meetUrl,
      lastSyncError: null,
    });
    return true;
  } catch (error) {
    await upsertSchedulingEventGoogleLink({
      eventId: input.eventId,
      userId: input.organizerUserId,
      googleCalendarId: calendarId,
      googleEventId: null,
      googleIcalUid: null,
      googleHtmlLink: null,
      googleMeetUrl: null,
      lastSyncError: error instanceof Error ? error.message : "GOOGLE_EVENT_SYNC_FAILED",
    }).catch(() => undefined);
    return false;
  }
}

export async function createAgendaSchedulingEvent(
  actorUserId: string,
  permissions: SchedulingEventPermissionMap,
  input: CreateAgendaSchedulingEventInput,
) {
  if (!(await canOperateOrganizer(actorUserId, input.organizerUserId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }

  const title = input.title.trim();
  const description = input.description.trim();
  if (title.length < 3 || title.length > 180) throw new Error("SCHEDULING_INVALID_TITLE");
  if (description.length > 5000) throw new Error("SCHEDULING_EVENT_INVALID_DESCRIPTION");
  if (!isValidDateKey(input.date) || !isValidTimeValue(input.startTime) || !isValidTimeValue(input.endTime)) {
    throw new Error("SCHEDULING_EVENT_INVALID_RANGE");
  }
  if (!isValidTimeZone(input.timeZone)) throw new Error("SCHEDULING_INVALID_TIME_ZONE");

  const startsAt = localDateTimeToUtc(input.date, input.startTime, input.timeZone);
  const endsAt = localDateTimeToUtc(input.date, input.endTime, input.timeZone);
  if (endsAt.getTime() <= startsAt.getTime()) throw new Error("SCHEDULING_EVENT_INVALID_RANGE");

  const participants = await normalizeParticipants(input.organizerUserId, input.attendees);
  const event = await createSchedulingEvent({
    organizerUserId: input.organizerUserId,
    createdByUserId: actorUserId,
    title,
    description,
    startsAt,
    endsAt,
    timeZone: input.timeZone,
    ticketId: input.ticketId ?? null,
    taskId: input.taskId ?? null,
    participants,
  });

  await recordAuditEvent({
    actorUserId,
    action: "scheduling.event.created",
    entityType: "scheduling_event",
    entityId: event.id,
    metadata: {
      organizerUserId: input.organizerUserId,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      participantCount: participants.length,
    },
  });

  const googleSynchronized = await syncSchedulingEventToGoogle({
    eventId: event.id,
    organizerUserId: input.organizerUserId,
    title,
    description,
    startsAt,
    endsAt,
    timeZone: input.timeZone,
    attendees: participants,
  });

  return { event, googleSynchronized };
}

export async function listAgendaSchedulingEvents(
  actorUserId: string,
  permissions: SchedulingEventPermissionMap,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const visibleUserIds = await visibleSchedulingUserIds(actorUserId, permissions);
  if (visibleUserIds.length === 0) return [];
  return listSchedulingEvents({
    visibleUserIds,
    startsBefore: rangeEnd,
    endsAfter: rangeStart,
  });
}

export async function cancelAgendaSchedulingEvent(
  actorUserId: string,
  permissions: SchedulingEventPermissionMap,
  eventId: string,
): Promise<void> {
  const event = await getSchedulingEvent(eventId);
  if (!event) throw new Error("SCHEDULING_EVENT_NOT_FOUND");
  if (!(await canOperateOrganizer(actorUserId, event.organizerUserId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }
  if (!(await cancelSchedulingEvent(eventId))) throw new Error("SCHEDULING_EVENT_NOT_CANCELLABLE");

  await recordAuditEvent({
    actorUserId,
    action: "scheduling.event.cancelled",
    entityType: "scheduling_event",
    entityId: eventId,
    metadata: { organizerUserId: event.organizerUserId },
  });
}
