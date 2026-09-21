import { and, eq, gt } from "drizzle-orm";
import {
  addGoogleMeetToGoogleCalendarEvent,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  type CreateGoogleCalendarEventInput,
  type GoogleCalendarEvent,
} from "$lib/server/calendar/googleCalendarRepository";
import { getDatabase } from "$lib/server/db";
import {
  taskGoogleCalendarLinks,
  type GoogleCalendarSyncDirection,
  type TaskGoogleCalendarAttendee,
} from "$lib/server/db/googleCalendarSchema";
import { taskActivities, tasks } from "$lib/server/db/taskSchema";
import {
  ensureTaskAccess,
  requireTaskPermissionScope,
  type TaskPermissionMap,
} from "$lib/server/tasks/taskAccess";

export type TaskGoogleCalendarScheduleInput = {
  enabled: boolean;
  allDay: boolean;
  startTime: string;
  endTime: string;
  timeZone: string;
  googleMeet?: boolean;
  location?: string;
  reminderMinutes?: number | null;
  attendees?: TaskGoogleCalendarAttendee[];
  calendarId?: string;
  syncDirection?: GoogleCalendarSyncDirection;
  autoManaged?: boolean;
};

type TaskSnapshot = {
  id: string;
  title: string;
  description: string;
  dueOn: string | null;
  updatedAt: Date;
};

type TaskGoogleLink = {
  taskId: string;
  userId: string;
  googleCalendarId: string;
  googleEventId: string;
  googleIcalUid: string | null;
  googleHtmlLink: string | null;
  googleMeetEnabled: boolean;
  googleMeetUrl: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  timeZone: string;
  eventDetailsManaged: boolean;
  location: string;
  reminderMinutes: number | null;
  attendees: TaskGoogleCalendarAttendee[];
  syncDirection: GoogleCalendarSyncDirection;
  autoManaged: boolean;
  importedFromGoogle: boolean;
  googleUpdatedAt: Date | null;
  lastSyncSource: "f10" | "google";
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
};

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function validateTimeZone(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 100) throw new Error("TASK_GOOGLE_TIME_ZONE_INVALID");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: normalized }).format(new Date());
  } catch {
    throw new Error("TASK_GOOGLE_TIME_ZONE_INVALID");
  }
  return normalized;
}

function normalizeAttendees(attendees: TaskGoogleCalendarAttendee[] | undefined): TaskGoogleCalendarAttendee[] {
  const normalized = new Map<string, TaskGoogleCalendarAttendee>();
  for (const attendee of attendees ?? []) {
    const email = attendee.email.trim().toLowerCase();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("TASK_GOOGLE_ATTENDEE_INVALID");
    }
    normalized.set(email, {
      email,
      name: attendee.name.trim().slice(0, 160),
      userId: attendee.userId?.trim() || null,
      optional: Boolean(attendee.optional),
    });
    if (normalized.size > 100) throw new Error("TASK_GOOGLE_TOO_MANY_ATTENDEES");
  }
  return Array.from(normalized.values());
}

function managesEventDetails(input: TaskGoogleCalendarScheduleInput): boolean {
  return input.location !== undefined || input.reminderMinutes !== undefined || input.attendees !== undefined;
}

function validateEventDetails(input: TaskGoogleCalendarScheduleInput) {
  const location = (input.location ?? "").trim();
  if (location.length > 500) throw new Error("TASK_GOOGLE_LOCATION_INVALID");
  const reminderMinutes = input.reminderMinutes ?? null;
  if (
    reminderMinutes !== null &&
    (!Number.isInteger(reminderMinutes) || reminderMinutes < 0 || reminderMinutes > 40320)
  ) {
    throw new Error("TASK_GOOGLE_REMINDER_INVALID");
  }
  return {
    location,
    reminderMinutes,
    attendees: normalizeAttendees(input.attendees),
  };
}

function validateSchedule(input: TaskGoogleCalendarScheduleInput) {
  const timeZone = validateTimeZone(input.timeZone);
  if (input.allDay) return { allDay: true, startTime: "", endTime: "", timeZone };
  if (!isValidTime(input.startTime) || !isValidTime(input.endTime) || input.startTime >= input.endTime) {
    throw new Error("TASK_GOOGLE_TIME_INVALID");
  }
  return { allDay: false, startTime: input.startTime, endTime: input.endTime, timeZone };
}

async function getTaskSnapshot(taskId: string): Promise<TaskSnapshot> {
  const db = getDatabase();
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      dueOn: tasks.dueOn,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);
  if (!task) throw new Error("TASK_NOT_FOUND");
  return task;
}

function toGoogleEventInput(
  task: TaskSnapshot,
  link: Pick<
    TaskGoogleLink,
    "allDay" | "startTime" | "endTime" | "timeZone" | "googleMeetEnabled" | "eventDetailsManaged" | "location" | "reminderMinutes" | "attendees"
  >,
  requestGoogleMeet = false,
): CreateGoogleCalendarEventInput {
  if (!task.dueOn) throw new Error("TASK_GOOGLE_REQUIRES_DUE_DATE");
  return {
    title: task.title,
    description: task.description,
    date: task.dueOn,
    allDay: link.allDay,
    startTime: link.startTime ?? "",
    endTime: link.endTime ?? "",
    timeZone: link.timeZone,
    addGoogleMeet: requestGoogleMeet && link.googleMeetEnabled,
    ...(link.eventDetailsManaged
      ? {
          location: link.location,
          reminderMinutes: link.reminderMinutes,
          attendees: link.attendees.map((attendee) => ({
            email: attendee.email,
            optional: attendee.optional,
          })),
        }
      : {}),
  };
}

function linkSelection() {
  return {
    taskId: taskGoogleCalendarLinks.taskId,
    userId: taskGoogleCalendarLinks.userId,
    googleCalendarId: taskGoogleCalendarLinks.googleCalendarId,
    googleEventId: taskGoogleCalendarLinks.googleEventId,
    googleIcalUid: taskGoogleCalendarLinks.googleIcalUid,
    googleHtmlLink: taskGoogleCalendarLinks.googleHtmlLink,
    googleMeetEnabled: taskGoogleCalendarLinks.googleMeetEnabled,
    googleMeetUrl: taskGoogleCalendarLinks.googleMeetUrl,
    allDay: taskGoogleCalendarLinks.allDay,
    startTime: taskGoogleCalendarLinks.startTime,
    endTime: taskGoogleCalendarLinks.endTime,
    timeZone: taskGoogleCalendarLinks.timeZone,
    eventDetailsManaged: taskGoogleCalendarLinks.eventDetailsManaged,
    location: taskGoogleCalendarLinks.location,
    reminderMinutes: taskGoogleCalendarLinks.reminderMinutes,
    attendees: taskGoogleCalendarLinks.attendees,
    syncDirection: taskGoogleCalendarLinks.syncDirection,
    autoManaged: taskGoogleCalendarLinks.autoManaged,
    importedFromGoogle: taskGoogleCalendarLinks.importedFromGoogle,
    googleUpdatedAt: taskGoogleCalendarLinks.googleUpdatedAt,
    lastSyncSource: taskGoogleCalendarLinks.lastSyncSource,
    lastSyncedAt: taskGoogleCalendarLinks.lastSyncedAt,
    lastSyncError: taskGoogleCalendarLinks.lastSyncError,
  };
}

async function getLink(userId: string, taskId: string): Promise<TaskGoogleLink | null> {
  const db = getDatabase();
  const [link] = await db
    .select(linkSelection())
    .from(taskGoogleCalendarLinks)
    .where(and(eq(taskGoogleCalendarLinks.userId, userId), eq(taskGoogleCalendarLinks.taskId, taskId)))
    .limit(1);
  return link ?? null;
}

async function markSyncError(userId: string, taskId: string, cause: unknown): Promise<void> {
  const message = cause instanceof Error ? cause.message.slice(0, 1000) : "GOOGLE_SYNC_FAILED";
  const db = getDatabase();
  await db
    .update(taskGoogleCalendarLinks)
    .set({ lastSyncError: message, updatedAt: new Date() })
    .where(and(eq(taskGoogleCalendarLinks.userId, userId), eq(taskGoogleCalendarLinks.taskId, taskId)));
}

async function syncExistingLink(task: TaskSnapshot, link: TaskGoogleLink): Promise<void> {
  if (link.lastSyncError === "SYNC_CONFLICT") return;
  const db = getDatabase();
  const input = toGoogleEventInput(task, link);
  let event = await updateGoogleCalendarEvent(link.userId, link.googleCalendarId, link.googleEventId, input);

  if (!event) {
    event = await createGoogleCalendarEvent(
      link.userId,
      toGoogleEventInput(task, link, true),
      link.googleCalendarId,
    );
  }

  const now = new Date();
  await db
    .update(taskGoogleCalendarLinks)
    .set({
      googleEventId: event.id,
      googleIcalUid: event.iCalUID,
      googleHtmlLink: event.htmlLink,
      googleMeetUrl: event.meetUrl ?? link.googleMeetUrl,
      googleUpdatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
      lastSyncSource: "f10",
      lastSyncedAt: now,
      lastSyncError: null,
      updatedAt: now,
    })
    .where(and(eq(taskGoogleCalendarLinks.userId, link.userId), eq(taskGoogleCalendarLinks.taskId, link.taskId)));
}

export async function getTaskGoogleCalendarLink(userId: string, taskId: string) {
  return getLink(userId, taskId);
}

export async function findTaskGoogleCalendarLinkByEvent(
  userId: string,
  calendarId: string,
  eventId: string,
) {
  const db = getDatabase();
  const [link] = await db
    .select(linkSelection())
    .from(taskGoogleCalendarLinks)
    .where(
      and(
        eq(taskGoogleCalendarLinks.userId, userId),
        eq(taskGoogleCalendarLinks.googleCalendarId, calendarId),
        eq(taskGoogleCalendarLinks.googleEventId, eventId),
      ),
    )
    .limit(1);
  return link ?? null;
}

export async function listUserTaskGoogleCalendarLinks(userId: string) {
  const db = getDatabase();
  return db
    .select(linkSelection())
    .from(taskGoogleCalendarLinks)
    .where(eq(taskGoogleCalendarLinks.userId, userId));
}

export async function hasTaskGoogleCalendarFieldsChangedSince(
  taskId: string,
  since: Date | null,
): Promise<boolean> {
  if (!since) return true;
  const db = getDatabase();
  const [activity] = await db
    .select({ id: taskActivities.id })
    .from(taskActivities)
    .where(
      and(
        eq(taskActivities.taskId, taskId),
        eq(taskActivities.action, "task.details.updated"),
        gt(taskActivities.createdAt, since),
      ),
    )
    .limit(1);
  return Boolean(activity);
}

export async function setTaskGoogleCalendarSyncDirection(
  userId: string,
  taskId: string,
  syncDirection: GoogleCalendarSyncDirection,
): Promise<void> {
  const db = getDatabase();
  await db
    .update(taskGoogleCalendarLinks)
    .set({ syncDirection, updatedAt: new Date() })
    .where(and(eq(taskGoogleCalendarLinks.userId, userId), eq(taskGoogleCalendarLinks.taskId, taskId)));
}

export async function configureTaskGoogleCalendar(
  actorUserId: string,
  permissions: TaskPermissionMap,
  taskId: string,
  input: TaskGoogleCalendarScheduleInput,
): Promise<void> {
  const viewScope = requireTaskPermissionScope(permissions, "tasks.view");
  await ensureTaskAccess(actorUserId, viewScope, taskId);

  const existing = await getLink(actorUserId, taskId);
  if (!input.enabled) {
    if (!existing) return;
    await deleteGoogleCalendarEvent(actorUserId, existing.googleCalendarId, existing.googleEventId);
    const db = getDatabase();
    await db
      .delete(taskGoogleCalendarLinks)
      .where(and(eq(taskGoogleCalendarLinks.userId, actorUserId), eq(taskGoogleCalendarLinks.taskId, taskId)));
    return;
  }

  const schedule = validateSchedule(input);
  const shouldManageDetails = managesEventDetails(input);
  const details = shouldManageDetails
    ? validateEventDetails(input)
    : { location: "", reminderMinutes: null, attendees: [] as TaskGoogleCalendarAttendee[] };
  const task = await getTaskSnapshot(taskId);
  if (!task.dueOn) throw new Error("TASK_GOOGLE_REQUIRES_DUE_DATE");

  if (existing) {
    const shouldCreateMeet = Boolean(input.googleMeet) && (!existing.googleMeetEnabled || !existing.googleMeetUrl);
    const db = getDatabase();
    await db
      .update(taskGoogleCalendarLinks)
      .set({
        allDay: schedule.allDay,
        startTime: schedule.allDay ? null : schedule.startTime,
        endTime: schedule.allDay ? null : schedule.endTime,
        timeZone: schedule.timeZone,
        googleMeetEnabled: existing.googleMeetEnabled || Boolean(input.googleMeet),
        syncDirection: input.syncDirection ?? existing.syncDirection,
        autoManaged: input.autoManaged ?? existing.autoManaged,
        ...(shouldManageDetails
          ? {
              eventDetailsManaged: true,
              location: details.location,
              reminderMinutes: details.reminderMinutes,
              attendees: details.attendees,
            }
          : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(taskGoogleCalendarLinks.userId, actorUserId), eq(taskGoogleCalendarLinks.taskId, taskId)));

    try {
      if (shouldCreateMeet) {
        const event = await addGoogleMeetToGoogleCalendarEvent(
          actorUserId,
          existing.googleCalendarId,
          existing.googleEventId,
        );
        await db
          .update(taskGoogleCalendarLinks)
          .set({
            googleIcalUid: event.iCalUID,
            googleHtmlLink: event.htmlLink,
            googleMeetUrl: event.meetUrl,
            googleUpdatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
            lastSyncSource: "f10",
            lastSyncedAt: new Date(),
            lastSyncError: null,
            updatedAt: new Date(),
          })
          .where(and(eq(taskGoogleCalendarLinks.userId, actorUserId), eq(taskGoogleCalendarLinks.taskId, taskId)));
      }

      const updatedLink = await getLink(actorUserId, taskId);
      if (!updatedLink) throw new Error("TASK_GOOGLE_LINK_NOT_FOUND");
      if (updatedLink.syncDirection !== "google_to_f10") {
        await syncExistingLink(task, updatedLink);
      }
    } catch (cause) {
      await markSyncError(actorUserId, taskId, cause);
      throw cause;
    }
    return;
  }

  const googleMeetEnabled = Boolean(input.googleMeet);
  const newLink: Pick<
    TaskGoogleLink,
    "allDay" | "startTime" | "endTime" | "timeZone" | "googleMeetEnabled" | "eventDetailsManaged" | "location" | "reminderMinutes" | "attendees"
  > = {
    allDay: schedule.allDay,
    startTime: schedule.allDay ? null : schedule.startTime,
    endTime: schedule.allDay ? null : schedule.endTime,
    timeZone: schedule.timeZone,
    googleMeetEnabled,
    eventDetailsManaged: shouldManageDetails,
    location: details.location,
    reminderMinutes: details.reminderMinutes,
    attendees: details.attendees,
  };
  const calendarId = input.calendarId?.trim() || "primary";
  const event = await createGoogleCalendarEvent(
    actorUserId,
    toGoogleEventInput(task, newLink, true),
    calendarId,
  );
  const now = new Date();
  const db = getDatabase();
  await db.insert(taskGoogleCalendarLinks).values({
    taskId,
    userId: actorUserId,
    googleCalendarId: calendarId,
    googleEventId: event.id,
    googleIcalUid: event.iCalUID,
    googleHtmlLink: event.htmlLink,
    googleMeetEnabled,
    googleMeetUrl: event.meetUrl,
    allDay: schedule.allDay,
    startTime: schedule.allDay ? null : schedule.startTime,
    endTime: schedule.allDay ? null : schedule.endTime,
    timeZone: schedule.timeZone,
    eventDetailsManaged: shouldManageDetails,
    location: details.location,
    reminderMinutes: details.reminderMinutes,
    attendees: details.attendees,
    syncDirection: input.syncDirection ?? "f10_to_google",
    autoManaged: input.autoManaged ?? false,
    importedFromGoogle: false,
    googleUpdatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
    lastSyncSource: "f10",
    lastSyncedAt: now,
    lastSyncError: null,
    updatedAt: now,
  });
}

export async function linkImportedGoogleEventToTask(
  userId: string,
  taskId: string,
  calendarId: string,
  event: GoogleCalendarEvent,
  syncDirection: Extract<GoogleCalendarSyncDirection, "google_to_f10" | "bidirectional"> = "google_to_f10",
): Promise<void> {
  const now = new Date();
  const db = getDatabase();
  await db
    .insert(taskGoogleCalendarLinks)
    .values({
      taskId,
      userId,
      googleCalendarId: calendarId,
      googleEventId: event.id,
      googleIcalUid: event.iCalUID,
      googleHtmlLink: event.htmlLink,
      googleMeetEnabled: Boolean(event.meetUrl),
      googleMeetUrl: event.meetUrl,
      allDay: event.allDay,
      startTime: event.allDay || !event.startDateTime ? null : event.startDateTime.slice(11, 16),
      endTime: event.allDay || !event.endDateTime ? null : event.endDateTime.slice(11, 16),
      timeZone: "UTC",
      eventDetailsManaged: false,
      syncDirection,
      autoManaged: false,
      importedFromGoogle: true,
      googleUpdatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
      lastSyncSource: "google",
      lastSyncedAt: now,
      lastSyncError: null,
      updatedAt: now,
    })
    .onConflictDoNothing();
}

export async function applyGoogleEventToTask(
  userId: string,
  taskId: string,
  event: GoogleCalendarEvent,
): Promise<void> {
  const dueOn = event.startDate ?? event.startDateTime?.slice(0, 10) ?? null;
  if (!dueOn) return;
  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({
        title: event.summary.slice(0, 180),
        description: event.description.slice(0, 5000),
        dueOn,
        updatedBy: userId,
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId));
    await tx.insert(taskActivities).values({
      taskId,
      actorUserId: userId,
      action: "task.google.synced",
      metadata: { googleEventId: event.id, source: "google" },
    });
    await tx
      .update(taskGoogleCalendarLinks)
      .set({
        googleIcalUid: event.iCalUID,
        googleHtmlLink: event.htmlLink,
        googleMeetUrl: event.meetUrl,
        allDay: event.allDay,
        startTime: event.allDay || !event.startDateTime ? null : event.startDateTime.slice(11, 16),
        endTime: event.allDay || !event.endDateTime ? null : event.endDateTime.slice(11, 16),
        googleUpdatedAt: event.updatedAt ? new Date(event.updatedAt) : null,
        lastSyncSource: "google",
        lastSyncedAt: now,
        lastSyncError: null,
        updatedAt: now,
      })
      .where(and(eq(taskGoogleCalendarLinks.userId, userId), eq(taskGoogleCalendarLinks.taskId, taskId)));
  });
}

export async function markTaskGoogleSyncConflict(userId: string, taskId: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(taskGoogleCalendarLinks)
    .set({ lastSyncError: "SYNC_CONFLICT", updatedAt: new Date() })
    .where(and(eq(taskGoogleCalendarLinks.userId, userId), eq(taskGoogleCalendarLinks.taskId, taskId)));
}

export async function resolveTaskGoogleSyncWithF10(userId: string, taskId: string): Promise<void> {
  const link = await getLink(userId, taskId);
  if (!link) throw new Error("TASK_GOOGLE_LINK_NOT_FOUND");
  if (link.syncDirection === "google_to_f10") throw new Error("TASK_GOOGLE_F10_PUSH_NOT_ALLOWED");

  const db = getDatabase();
  await db
    .update(taskGoogleCalendarLinks)
    .set({ lastSyncError: null, updatedAt: new Date() })
    .where(and(eq(taskGoogleCalendarLinks.userId, userId), eq(taskGoogleCalendarLinks.taskId, taskId)));
  const task = await getTaskSnapshot(taskId);
  await syncExistingLink(task, { ...link, lastSyncError: null });
}

export async function removeTaskGoogleCalendarLink(
  userId: string,
  taskId: string,
  deleteGoogleEvent = false,
): Promise<void> {
  const link = await getLink(userId, taskId);
  if (!link) return;
  if (deleteGoogleEvent) {
    await deleteGoogleCalendarEvent(userId, link.googleCalendarId, link.googleEventId);
  }
  const db = getDatabase();
  await db
    .delete(taskGoogleCalendarLinks)
    .where(and(eq(taskGoogleCalendarLinks.userId, userId), eq(taskGoogleCalendarLinks.taskId, taskId)));
}

export async function syncAllTaskGoogleCalendarLinks(taskId: string): Promise<void> {
  const db = getDatabase();
  const [task, links] = await Promise.all([
    getTaskSnapshot(taskId),
    db.select(linkSelection()).from(taskGoogleCalendarLinks).where(eq(taskGoogleCalendarLinks.taskId, taskId)),
  ]);

  const writableLinks = links.filter(
    (link) => link.syncDirection !== "google_to_f10" && link.lastSyncError !== "SYNC_CONFLICT",
  );
  if (writableLinks.length === 0) return;

  if (!task.dueOn) {
    await Promise.allSettled(
      writableLinks
        .filter((link) => !link.importedFromGoogle)
        .map(async (link) => {
          try {
            await deleteGoogleCalendarEvent(link.userId, link.googleCalendarId, link.googleEventId);
            await db
              .delete(taskGoogleCalendarLinks)
              .where(and(eq(taskGoogleCalendarLinks.userId, link.userId), eq(taskGoogleCalendarLinks.taskId, taskId)));
          } catch (cause) {
            await markSyncError(link.userId, taskId, cause);
          }
        }),
    );
    return;
  }

  await Promise.allSettled(
    writableLinks.map(async (link) => {
      try {
        await syncExistingLink(task, link);
      } catch (cause) {
        await markSyncError(link.userId, taskId, cause);
      }
    }),
  );
}
