import { getPermissionScope, hasPermission, type PermissionScope } from "$lib/server/auth/permissions";
import { recordAuditEvent } from "$lib/server/auth/audit";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleCalendarConnection,
  updateGoogleCalendarEvent,
  type CreateGoogleCalendarEventInput,
  type GoogleCalendarEvent,
} from "$lib/server/calendar/googleCalendarRepository";
import { getGoogleCalendarSyncPreferences } from "$lib/server/calendar/googleCalendarPreferenceRepository";
import {
  clearSchedulingEventGoogleProjection,
  getSchedulingEventGoogleLink,
  markSchedulingEventGoogleSyncError,
} from "$lib/server/calendar/schedulingEventLifecycleRepository";
import {
  listSchedulingEventParticipantsForEvents,
  updateSchedulingEvent,
} from "$lib/server/calendar/schedulingEventManagementRepository";
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
  getSchedulingHost,
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
import { getSupportTicket } from "$lib/server/support/supportRepository";
import { getTaskDetails } from "$lib/server/tasks/taskRepository";

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

export type UpdateAgendaSchedulingEventInput = Omit<
  CreateAgendaSchedulingEventInput,
  "organizerUserId"
> & {
  eventId: string;
};

type NormalizedEventDetails = {
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
};

type SchedulingGoogleSyncResult = {
  synchronized: boolean;
  warning: boolean;
};

type SchedulingGoogleSyncInput = NormalizedEventDetails & {
  eventId: string;
  organizerUserId: string;
  attendees: SchedulingEventParticipantInput[];
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEventDetails(
  input: Pick<
    CreateAgendaSchedulingEventInput,
    "title" | "description" | "date" | "startTime" | "endTime" | "timeZone"
  >,
): NormalizedEventDetails {
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

  return {
    title,
    description,
    startsAt,
    endsAt,
    timeZone: input.timeZone,
  };
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

async function validateRelatedEntities(
  actorUserId: string,
  permissions: SchedulingEventPermissionMap,
  input: Pick<CreateAgendaSchedulingEventInput, "ticketId" | "taskId">,
): Promise<void> {
  try {
    await Promise.all([
      input.ticketId ? getSupportTicket(actorUserId, permissions, input.ticketId) : Promise.resolve(null),
      input.taskId ? getTaskDetails(actorUserId, permissions, input.taskId) : Promise.resolve(null),
    ]);
  } catch {
    throw new Error("SCHEDULING_EVENT_INVALID_RELATION");
  }
}

async function validateChangedRelatedEntities(
  actorUserId: string,
  permissions: SchedulingEventPermissionMap,
  current: { ticketId: string | null; taskId: string | null },
  input: Pick<UpdateAgendaSchedulingEventInput, "ticketId" | "taskId">,
): Promise<void> {
  await validateRelatedEntities(actorUserId, permissions, {
    ticketId: input.ticketId && input.ticketId !== current.ticketId ? input.ticketId : null,
    taskId: input.taskId && input.taskId !== current.taskId ? input.taskId : null,
  });
}

function schedulingGoogleEventInput(
  input: SchedulingGoogleSyncInput,
): CreateGoogleCalendarEventInput | null {
  const localStart = instantToZonedParts(input.startsAt, input.timeZone);
  const localEnd = instantToZonedParts(input.endsAt, input.timeZone);
  if (localStart.date !== localEnd.date) return null;

  return {
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
  };
}

async function createGoogleProjection(
  input: SchedulingGoogleSyncInput,
  preferredCalendarId: string,
): Promise<{ calendarId: string; event: GoogleCalendarEvent }> {
  const googleInput = schedulingGoogleEventInput(input);
  if (!googleInput) throw new Error("GOOGLE_EVENT_MULTI_DAY_UNSUPPORTED");

  try {
    return {
      calendarId: preferredCalendarId,
      event: await createGoogleCalendarEvent(
        input.organizerUserId,
        googleInput,
        preferredCalendarId,
      ),
    };
  } catch (cause) {
    if (preferredCalendarId === "primary") throw cause;
    return {
      calendarId: "primary",
      event: await createGoogleCalendarEvent(
        input.organizerUserId,
        googleInput,
        "primary",
      ),
    };
  }
}

async function persistGoogleProjection(
  input: SchedulingGoogleSyncInput,
  calendarId: string,
  googleEvent: GoogleCalendarEvent,
): Promise<void> {
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
}

async function recordGoogleSyncFailure(
  input: SchedulingGoogleSyncInput,
  calendarId: string,
  error: unknown,
): Promise<void> {
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
}

async function syncNewSchedulingEventToGoogle(
  input: SchedulingGoogleSyncInput,
): Promise<SchedulingGoogleSyncResult> {
  const [preferences, connection] = await Promise.all([
    getGoogleCalendarSyncPreferences(input.organizerUserId),
    getGoogleCalendarConnection(input.organizerUserId),
  ]);
  if (!preferences.syncSchedulingToGoogle) return { synchronized: false, warning: false };

  const preferredCalendarId = preferences.targetCalendarId || "primary";
  if (!connection.connected) {
    await recordGoogleSyncFailure(input, preferredCalendarId, new Error("GOOGLE_CALENDAR_NOT_CONNECTED"));
    return { synchronized: false, warning: true };
  }

  try {
    const projection = await createGoogleProjection(input, preferredCalendarId);
    await persistGoogleProjection(input, projection.calendarId, projection.event);
    return { synchronized: true, warning: false };
  } catch (error) {
    await recordGoogleSyncFailure(input, preferredCalendarId, error);
    return { synchronized: false, warning: true };
  }
}

async function syncUpdatedSchedulingEventToGoogle(
  input: SchedulingGoogleSyncInput,
): Promise<SchedulingGoogleSyncResult> {
  const googleLink = await getSchedulingEventGoogleLink(input.eventId, input.organizerUserId);
  if (!googleLink?.googleEventId) return syncNewSchedulingEventToGoogle(input);

  const connection = await getGoogleCalendarConnection(input.organizerUserId);
  if (!connection.connected) {
    await markSchedulingEventGoogleSyncError(
      input.eventId,
      input.organizerUserId,
      "GOOGLE_CALENDAR_NOT_CONNECTED",
    ).catch(() => undefined);
    return { synchronized: false, warning: true };
  }

  const googleInput = schedulingGoogleEventInput(input);
  if (!googleInput) {
    await markSchedulingEventGoogleSyncError(
      input.eventId,
      input.organizerUserId,
      "GOOGLE_EVENT_MULTI_DAY_UNSUPPORTED",
    ).catch(() => undefined);
    return { synchronized: false, warning: true };
  }

  try {
    const updated = await updateGoogleCalendarEvent(
      input.organizerUserId,
      googleLink.googleCalendarId,
      googleLink.googleEventId,
      googleInput,
    );
    if (updated) {
      await persistGoogleProjection(input, googleLink.googleCalendarId, updated);
      return { synchronized: true, warning: false };
    }

    const projection = await createGoogleProjection(input, googleLink.googleCalendarId);
    await persistGoogleProjection(input, projection.calendarId, projection.event);
    return { synchronized: true, warning: false };
  } catch (error) {
    await markSchedulingEventGoogleSyncError(
      input.eventId,
      input.organizerUserId,
      error instanceof Error ? error.message : "GOOGLE_EVENT_UPDATE_FAILED",
    ).catch(() => undefined);
    return { synchronized: false, warning: true };
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

  const organizer = await getSchedulingHost(input.organizerUserId);
  if (!organizer || organizer.status !== "active") {
    throw new Error("SCHEDULING_HOST_NOT_FOUND");
  }

  const details = normalizeEventDetails(input);
  await validateRelatedEntities(actorUserId, permissions, input);
  const participants = await normalizeParticipants(input.organizerUserId, input.attendees);
  const event = await createSchedulingEvent({
    organizerUserId: input.organizerUserId,
    createdByUserId: actorUserId,
    title: details.title,
    description: details.description,
    startsAt: details.startsAt,
    endsAt: details.endsAt,
    timeZone: details.timeZone,
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
      startsAt: details.startsAt.toISOString(),
      endsAt: details.endsAt.toISOString(),
      participantCount: participants.length,
    },
  });

  const google = await syncNewSchedulingEventToGoogle({
    eventId: event.id,
    organizerUserId: input.organizerUserId,
    ...details,
    attendees: participants,
  });

  return {
    event,
    googleSynchronized: google.synchronized,
    googleSyncWarning: google.warning,
  };
}

export async function updateAgendaSchedulingEvent(
  actorUserId: string,
  permissions: SchedulingEventPermissionMap,
  input: UpdateAgendaSchedulingEventInput,
) {
  const currentEvent = await getSchedulingEvent(input.eventId);
  if (!currentEvent) throw new Error("SCHEDULING_EVENT_NOT_FOUND");
  if (currentEvent.status !== "confirmed") throw new Error("SCHEDULING_EVENT_NOT_EDITABLE");
  if (!(await canOperateOrganizer(actorUserId, currentEvent.organizerUserId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }

  const details = normalizeEventDetails(input);
  await validateChangedRelatedEntities(actorUserId, permissions, currentEvent, input);
  const requestedParticipants = await normalizeParticipants(
    currentEvent.organizerUserId,
    input.attendees,
  );
  const updated = await updateSchedulingEvent({
    eventId: input.eventId,
    title: details.title,
    description: details.description,
    startsAt: details.startsAt,
    endsAt: details.endsAt,
    timeZone: details.timeZone,
    ticketId: input.ticketId ?? null,
    taskId: input.taskId ?? null,
    participants: requestedParticipants,
  });

  await recordAuditEvent({
    actorUserId,
    action: "scheduling.event.updated",
    entityType: "scheduling_event",
    entityId: input.eventId,
    metadata: {
      organizerUserId: currentEvent.organizerUserId,
      previousStartsAt: currentEvent.startsAt.toISOString(),
      previousEndsAt: currentEvent.endsAt.toISOString(),
      startsAt: details.startsAt.toISOString(),
      endsAt: details.endsAt.toISOString(),
      participantCount: updated.participants.length,
    },
  });

  const google = await syncUpdatedSchedulingEventToGoogle({
    eventId: input.eventId,
    organizerUserId: currentEvent.organizerUserId,
    ...details,
    attendees: updated.participants,
  });

  return {
    event: updated.event,
    googleSynchronized: google.synchronized,
    googleSyncWarning: google.warning,
  };
}

export async function listAgendaSchedulingEvents(
  actorUserId: string,
  permissions: SchedulingEventPermissionMap,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const visibleUserIds = await visibleSchedulingUserIds(actorUserId, permissions);
  if (visibleUserIds.length === 0) return [];

  const events = await listSchedulingEvents({
    visibleUserIds,
    startsBefore: rangeEnd,
    endsAfter: rangeStart,
  });
  const participants = await listSchedulingEventParticipantsForEvents(
    events.map((event) => event.id),
  );
  const participantsByEvent = new Map<string, typeof participants>();
  for (const participant of participants) {
    const eventParticipants = participantsByEvent.get(participant.eventId) ?? [];
    eventParticipants.push(participant);
    participantsByEvent.set(participant.eventId, eventParticipants);
  }

  return events.map((event) => ({
    ...event,
    participants: participantsByEvent.get(event.id) ?? [],
  }));
}

export async function cancelAgendaSchedulingEvent(
  actorUserId: string,
  permissions: SchedulingEventPermissionMap,
  eventId: string,
): Promise<{ googleSynchronized: boolean; googleSyncWarning: boolean }> {
  const event = await getSchedulingEvent(eventId);
  if (!event) throw new Error("SCHEDULING_EVENT_NOT_FOUND");
  if (!(await canOperateOrganizer(actorUserId, event.organizerUserId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }

  const googleLink = await getSchedulingEventGoogleLink(eventId, event.organizerUserId);
  if (!(await cancelSchedulingEvent(eventId))) throw new Error("SCHEDULING_EVENT_NOT_CANCELLABLE");

  await recordAuditEvent({
    actorUserId,
    action: "scheduling.event.cancelled",
    entityType: "scheduling_event",
    entityId: eventId,
    metadata: { organizerUserId: event.organizerUserId },
  });

  if (!googleLink?.googleEventId) {
    return { googleSynchronized: false, googleSyncWarning: false };
  }

  try {
    await deleteGoogleCalendarEvent(
      event.organizerUserId,
      googleLink.googleCalendarId,
      googleLink.googleEventId,
    );
    await clearSchedulingEventGoogleProjection(eventId, event.organizerUserId);
    return { googleSynchronized: true, googleSyncWarning: false };
  } catch (error) {
    await markSchedulingEventGoogleSyncError(
      eventId,
      event.organizerUserId,
      error instanceof Error ? error.message : "GOOGLE_EVENT_DELETE_FAILED",
    ).catch(() => undefined);
    return { googleSynchronized: false, googleSyncWarning: true };
  }
}
