import { and, eq } from "drizzle-orm";
import {
  addGoogleMeetToGoogleCalendarEvent,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  type CreateGoogleCalendarEventInput,
} from "$lib/server/calendar/googleCalendarRepository";
import { getDatabase } from "$lib/server/db";
import {
  taskGoogleCalendarLinks,
  type TaskGoogleCalendarAttendee,
} from "$lib/server/db/googleCalendarSchema";
import { tasks } from "$lib/server/db/taskSchema";
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
};

type TaskSnapshot = {
  id: string;
  title: string;
  description: string;
  dueOn: string | null;
};

type TaskGoogleLink = {
  taskId: string;
  userId: string;
  googleCalendarId: string;
  googleEventId: string;
  googleHtmlLink: string | null;
  googleMeetEnabled: boolean;
  googleMeetUrl: string | null;
  allDay: boolean;
  startTime: string | null;
  endTime: string | null;
  timeZone: string;
  location: string;
  reminderMinutes: number | null;
  attendees: TaskGoogleCalendarAttendee[];
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
  if (input.allDay) {
    return { allDay: true, startTime: "", endTime: "", timeZone };
  }
  if (!isValidTime(input.startTime) || !isValidTime(input.endTime) || input.startTime >= input.endTime) {
    throw new Error("TASK_GOOGLE_TIME_INVALID");
  }
  return {
    allDay: false,
    startTime: input.startTime,
    endTime: input.endTime,
    timeZone,
  };
}

async function getTaskSnapshot(taskId: string): Promise<TaskSnapshot> {
  const db = getDatabase();
  const [task] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      dueOn: tasks.dueOn,
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
    "allDay" | "startTime" | "endTime" | "timeZone" | "googleMeetEnabled" | "location" | "reminderMinutes" | "attendees"
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
    location: link.location,
    reminderMinutes: link.reminderMinutes,
    attendees: link.attendees.map((attendee) => ({
      email: attendee.email,
      optional: attendee.optional,
    })),
  };
}

async function getLink(userId: string, taskId: string): Promise<TaskGoogleLink | null> {
  const db = getDatabase();
  const [link] = await db
    .select({
      taskId: taskGoogleCalendarLinks.taskId,
      userId: taskGoogleCalendarLinks.userId,
      googleCalendarId: taskGoogleCalendarLinks.googleCalendarId,
      googleEventId: taskGoogleCalendarLinks.googleEventId,
      googleHtmlLink: taskGoogleCalendarLinks.googleHtmlLink,
      googleMeetEnabled: taskGoogleCalendarLinks.googleMeetEnabled,
      googleMeetUrl: taskGoogleCalendarLinks.googleMeetUrl,
      allDay: taskGoogleCalendarLinks.allDay,
      startTime: taskGoogleCalendarLinks.startTime,
      endTime: taskGoogleCalendarLinks.endTime,
      timeZone: taskGoogleCalendarLinks.timeZone,
      location: taskGoogleCalendarLinks.location,
      reminderMinutes: taskGoogleCalendarLinks.reminderMinutes,
      attendees: taskGoogleCalendarLinks.attendees,
    })
    .from(taskGoogleCalendarLinks)
    .where(
      and(
        eq(taskGoogleCalendarLinks.userId, userId),
        eq(taskGoogleCalendarLinks.taskId, taskId),
      ),
    )
    .limit(1);
  return link ?? null;
}

async function markSyncError(userId: string, taskId: string, cause: unknown): Promise<void> {
  const message = cause instanceof Error ? cause.message.slice(0, 1000) : "GOOGLE_SYNC_FAILED";
  const db = getDatabase();
  await db
    .update(taskGoogleCalendarLinks)
    .set({ lastSyncError: message, updatedAt: new Date() })
    .where(
      and(
        eq(taskGoogleCalendarLinks.userId, userId),
        eq(taskGoogleCalendarLinks.taskId, taskId),
      ),
    );
}

async function syncExistingLink(task: TaskSnapshot, link: TaskGoogleLink): Promise<void> {
  const db = getDatabase();
  const input = toGoogleEventInput(task, link);
  let event = await updateGoogleCalendarEvent(
    link.userId,
    link.googleCalendarId,
    link.googleEventId,
    input,
  );

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
      googleHtmlLink: event.htmlLink,
      googleMeetUrl: event.meetUrl ?? link.googleMeetUrl,
      lastSyncedAt: now,
      lastSyncError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(taskGoogleCalendarLinks.userId, link.userId),
        eq(taskGoogleCalendarLinks.taskId, link.taskId),
      ),
    );
}

export async function getTaskGoogleCalendarLink(userId: string, taskId: string) {
  const db = getDatabase();
  const [link] = await db
    .select({
      taskId: taskGoogleCalendarLinks.taskId,
      googleCalendarId: taskGoogleCalendarLinks.googleCalendarId,
      googleEventId: taskGoogleCalendarLinks.googleEventId,
      googleHtmlLink: taskGoogleCalendarLinks.googleHtmlLink,
      googleMeetEnabled: taskGoogleCalendarLinks.googleMeetEnabled,
      googleMeetUrl: taskGoogleCalendarLinks.googleMeetUrl,
      allDay: taskGoogleCalendarLinks.allDay,
      startTime: taskGoogleCalendarLinks.startTime,
      endTime: taskGoogleCalendarLinks.endTime,
      timeZone: taskGoogleCalendarLinks.timeZone,
      location: taskGoogleCalendarLinks.location,
      reminderMinutes: taskGoogleCalendarLinks.reminderMinutes,
      attendees: taskGoogleCalendarLinks.attendees,
      lastSyncedAt: taskGoogleCalendarLinks.lastSyncedAt,
      lastSyncError: taskGoogleCalendarLinks.lastSyncError,
    })
    .from(taskGoogleCalendarLinks)
    .where(
      and(
        eq(taskGoogleCalendarLinks.userId, userId),
        eq(taskGoogleCalendarLinks.taskId, taskId),
      ),
    )
    .limit(1);
  return link ?? null;
}

export async function listUserTaskGoogleCalendarLinks(userId: string) {
  const db = getDatabase();
  return db
    .select({
      taskId: taskGoogleCalendarLinks.taskId,
      googleEventId: taskGoogleCalendarLinks.googleEventId,
      googleMeetUrl: taskGoogleCalendarLinks.googleMeetUrl,
    })
    .from(taskGoogleCalendarLinks)
    .where(eq(taskGoogleCalendarLinks.userId, userId));
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
    await deleteGoogleCalendarEvent(
      actorUserId,
      existing.googleCalendarId,
      existing.googleEventId,
    );
    const db = getDatabase();
    await db
      .delete(taskGoogleCalendarLinks)
      .where(
        and(
          eq(taskGoogleCalendarLinks.userId, actorUserId),
          eq(taskGoogleCalendarLinks.taskId, taskId),
        ),
      );
    return;
  }

  const schedule = validateSchedule(input);
  const details = validateEventDetails(input);
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
        location: details.location,
        reminderMinutes: details.reminderMinutes,
        attendees: details.attendees,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(taskGoogleCalendarLinks.userId, actorUserId),
          eq(taskGoogleCalendarLinks.taskId, taskId),
        ),
      );

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
            googleHtmlLink: event.htmlLink,
            googleMeetUrl: event.meetUrl,
            lastSyncedAt: new Date(),
            lastSyncError: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(taskGoogleCalendarLinks.userId, actorUserId),
              eq(taskGoogleCalendarLinks.taskId, taskId),
            ),
          );
      }

      const updatedLink = await getLink(actorUserId, taskId);
      if (!updatedLink) throw new Error("TASK_GOOGLE_LINK_NOT_FOUND");
      await syncExistingLink(task, updatedLink);
    } catch (cause) {
      await markSyncError(actorUserId, taskId, cause);
      throw cause;
    }
    return;
  }

  const googleMeetEnabled = Boolean(input.googleMeet);
  const newLink: Pick<
    TaskGoogleLink,
    "allDay" | "startTime" | "endTime" | "timeZone" | "googleMeetEnabled" | "location" | "reminderMinutes" | "attendees"
  > = {
    allDay: schedule.allDay,
    startTime: schedule.allDay ? null : schedule.startTime,
    endTime: schedule.allDay ? null : schedule.endTime,
    timeZone: schedule.timeZone,
    googleMeetEnabled,
    location: details.location,
    reminderMinutes: details.reminderMinutes,
    attendees: details.attendees,
  };
  const event = await createGoogleCalendarEvent(
    actorUserId,
    toGoogleEventInput(task, newLink, true),
  );
  const now = new Date();
  const db = getDatabase();
  await db.insert(taskGoogleCalendarLinks).values({
    taskId,
    userId: actorUserId,
    googleCalendarId: "primary",
    googleEventId: event.id,
    googleHtmlLink: event.htmlLink,
    googleMeetEnabled,
    googleMeetUrl: event.meetUrl,
    allDay: schedule.allDay,
    startTime: schedule.allDay ? null : schedule.startTime,
    endTime: schedule.allDay ? null : schedule.endTime,
    timeZone: schedule.timeZone,
    location: details.location,
    reminderMinutes: details.reminderMinutes,
    attendees: details.attendees,
    lastSyncedAt: now,
    lastSyncError: null,
    updatedAt: now,
  });
}

export async function syncAllTaskGoogleCalendarLinks(taskId: string): Promise<void> {
  const db = getDatabase();
  const [task, links] = await Promise.all([
    getTaskSnapshot(taskId),
    db
      .select({
        taskId: taskGoogleCalendarLinks.taskId,
        userId: taskGoogleCalendarLinks.userId,
        googleCalendarId: taskGoogleCalendarLinks.googleCalendarId,
        googleEventId: taskGoogleCalendarLinks.googleEventId,
        googleHtmlLink: taskGoogleCalendarLinks.googleHtmlLink,
        googleMeetEnabled: taskGoogleCalendarLinks.googleMeetEnabled,
        googleMeetUrl: taskGoogleCalendarLinks.googleMeetUrl,
        allDay: taskGoogleCalendarLinks.allDay,
        startTime: taskGoogleCalendarLinks.startTime,
        endTime: taskGoogleCalendarLinks.endTime,
        timeZone: taskGoogleCalendarLinks.timeZone,
        location: taskGoogleCalendarLinks.location,
        reminderMinutes: taskGoogleCalendarLinks.reminderMinutes,
        attendees: taskGoogleCalendarLinks.attendees,
      })
      .from(taskGoogleCalendarLinks)
      .where(eq(taskGoogleCalendarLinks.taskId, taskId)),
  ]);

  if (links.length === 0) return;

  if (!task.dueOn) {
    await Promise.allSettled(
      links.map(async (link) => {
        try {
          await deleteGoogleCalendarEvent(link.userId, link.googleCalendarId, link.googleEventId);
          await db
            .delete(taskGoogleCalendarLinks)
            .where(
              and(
                eq(taskGoogleCalendarLinks.userId, link.userId),
                eq(taskGoogleCalendarLinks.taskId, taskId),
              ),
            );
        } catch (cause) {
          await markSyncError(link.userId, taskId, cause);
        }
      }),
    );
    return;
  }

  await Promise.allSettled(
    links.map(async (link) => {
      try {
        await syncExistingLink(task, link);
      } catch (cause) {
        await markSyncError(link.userId, taskId, cause);
      }
    }),
  );
}
