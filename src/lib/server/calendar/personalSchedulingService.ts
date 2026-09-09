import { getPermissionScope, hasPermission, type PermissionScope } from "$lib/server/auth/permissions";
import { recordAuditEvent } from "$lib/server/auth/audit";
import {
  listF10CalendarBusyIntervals,
  type CalendarAvailabilityConflict,
} from "$lib/server/calendar/f10CalendarAvailabilityRepository";
import {
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  getGoogleCalendarConnection,
} from "$lib/server/calendar/googleCalendarRepository";
import { getGoogleCalendarSyncPreferences } from "$lib/server/calendar/googleCalendarPreferenceRepository";
import { sendPersonalSchedulingConfirmation } from "$lib/server/calendar/personalSchedulingConfirmation";
import {
  addPersonalSchedulingException,
  cancelPersonalSchedulingClaim,
  claimPersonalSchedulingBooking,
  completePersonalSchedulingBooking,
  deletePersonalSchedulingException,
  getPersonalSchedulingSettings,
  getPublicPersonalSchedule,
  listPersonalSchedulingReservations,
  savePersonalSchedulingSettings,
  setPersonalSchedulingPublicEnabled,
  setSchedulingBlockingCalendars,
  type PersonalAvailabilityWindow,
  type PersonalSchedulingSettingsInput,
} from "$lib/server/calendar/personalSchedulingRepository";
import { listSchedulingTeamUserIds } from "$lib/server/calendar/schedulingRepository";
import {
  addDateKeyDays,
  dateKeyWeekday,
  instantToZonedParts,
  isValidDateKey,
  isValidTimeValue,
  isValidTimeZone,
  localDateTimeToUtc,
  minutesToTime,
  timeToMinutes,
} from "$lib/server/calendar/schedulingTime";
import { createInternalNotification } from "$lib/server/notifications/notificationRepository";
import type { SchedulingWeekday } from "$lib/server/db/schedulingSchema";

export type PersonalSchedulingPermissionMap = Map<string, PermissionScope>;

export type PersonalSchedulingSlot = {
  date: string;
  time: string;
  startAt: string;
  endAt: string;
};

type PublicCustomerContext = {
  contactId: string;
  name: string;
  email: string;
  selectedGroupId: number | null;
  selectedGroupName: string | null;
  selectedUnitId: number | null;
  selectedUnitName: string | null;
};

const MAX_PUBLIC_SLOTS = 500;

async function canOperateHost(
  actorUserId: string,
  hostUserId: string,
  permissions: PersonalSchedulingPermissionMap,
): Promise<boolean> {
  if (actorUserId === hostUserId && hasPermission(permissions, "scheduling.view")) return true;
  if (hasPermission(permissions, "scheduling.manage")) return true;
  const scope = getPermissionScope(permissions, "scheduling.create");
  if (scope === "all") return true;
  if (scope === "team") {
    const teamUserIds = await listSchedulingTeamUserIds(actorUserId);
    return teamUserIds.includes(hostUserId);
  }
  return scope === "own" && actorUserId === hostUserId;
}

function isValidWindow(window: PersonalAvailabilityWindow): boolean {
  return (
    Number.isInteger(window.weekday) &&
    window.weekday >= 0 &&
    window.weekday <= 6 &&
    isValidTimeValue(window.startTime) &&
    isValidTimeValue(window.endTime) &&
    window.startTime < window.endTime
  );
}

function windowsOverlap(windows: PersonalAvailabilityWindow[]): boolean {
  const grouped = new Map<SchedulingWeekday, PersonalAvailabilityWindow[]>();
  for (const window of windows) {
    const items = grouped.get(window.weekday) ?? [];
    items.push(window);
    grouped.set(window.weekday, items);
  }

  for (const items of grouped.values()) {
    items.sort((left, right) => left.startTime.localeCompare(right.startTime));
    for (let index = 1; index < items.length; index += 1) {
      if (items[index - 1]!.endTime > items[index]!.startTime) return true;
    }
  }
  return false;
}

function validateSettings(input: PersonalSchedulingSettingsInput): void {
  if (!isValidTimeZone(input.timeZone)) throw new Error("SCHEDULING_INVALID_TIME_ZONE");
  if (input.windows.length === 0 || !input.windows.every(isValidWindow) || windowsOverlap(input.windows)) {
    throw new Error("SCHEDULING_INVALID_WINDOWS");
  }
  if (!Number.isInteger(input.slotStepMinutes) || input.slotStepMinutes < 5 || input.slotStepMinutes > 120) {
    throw new Error("SCHEDULING_INVALID_SLOT_STEP");
  }
  if (!Number.isInteger(input.minimumNoticeMinutes) || input.minimumNoticeMinutes < 0 || input.minimumNoticeMinutes > 43_200) {
    throw new Error("SCHEDULING_INVALID_MINIMUM_NOTICE");
  }
  if (!Number.isInteger(input.bufferBeforeMinutes) || input.bufferBeforeMinutes < 0 || input.bufferBeforeMinutes > 240) {
    throw new Error("SCHEDULING_INVALID_BUFFER");
  }
  if (!Number.isInteger(input.bufferAfterMinutes) || input.bufferAfterMinutes < 0 || input.bufferAfterMinutes > 240) {
    throw new Error("SCHEDULING_INVALID_BUFFER");
  }
  if (!Number.isInteger(input.maxHorizonDays) || input.maxHorizonDays < 1 || input.maxHorizonDays > 90) {
    throw new Error("SCHEDULING_INVALID_HORIZON");
  }
  if (!Number.isInteger(input.defaultDurationMinutes) || input.defaultDurationMinutes < 15 || input.defaultDurationMinutes > 240) {
    throw new Error("SCHEDULING_INVALID_DURATION");
  }
  if (input.publicTitle.trim().length < 3 || input.publicTitle.trim().length > 180) {
    throw new Error("SCHEDULING_INVALID_TITLE");
  }
  if (input.publicDescription.trim().length > 1000) {
    throw new Error("SCHEDULING_INVALID_DESCRIPTION");
  }
}

export async function configurePersonalScheduling(
  actorUserId: string,
  permissions: PersonalSchedulingPermissionMap,
  userId: string,
  input: PersonalSchedulingSettingsInput,
): Promise<void> {
  if (!(await canOperateHost(actorUserId, userId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }
  validateSettings(input);
  await savePersonalSchedulingSettings(actorUserId, userId, {
    ...input,
    publicTitle: input.publicTitle.trim(),
    publicDescription: input.publicDescription.trim(),
  });
  await recordAuditEvent({
    actorUserId,
    action: "scheduling.public_profile.updated",
    entityType: "user",
    entityId: userId,
    metadata: {
      publicEnabled: input.publicEnabled,
      slotStepMinutes: input.slotStepMinutes,
      defaultDurationMinutes: input.defaultDurationMinutes,
      windowCount: input.windows.length,
    },
  });
}

export async function addSchedulingException(
  actorUserId: string,
  permissions: PersonalSchedulingPermissionMap,
  userId: string,
  input: {
    exceptionDate: string;
    available: boolean;
    startTime: string;
    endTime: string;
  },
): Promise<void> {
  if (!(await canOperateHost(actorUserId, userId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }
  if (!isValidDateKey(input.exceptionDate)) throw new Error("SCHEDULING_INVALID_EXCEPTION_DATE");
  if (
    input.available &&
    (!isValidTimeValue(input.startTime) ||
      !isValidTimeValue(input.endTime) ||
      input.startTime >= input.endTime)
  ) {
    throw new Error("SCHEDULING_INVALID_EXCEPTION_TIME");
  }

  await addPersonalSchedulingException(userId, {
    exceptionDate: input.exceptionDate,
    available: input.available,
    startTime: input.available ? input.startTime : null,
    endTime: input.available ? input.endTime : null,
  });
}

export async function removeSchedulingException(
  actorUserId: string,
  permissions: PersonalSchedulingPermissionMap,
  userId: string,
  exceptionId: string,
): Promise<void> {
  if (!(await canOperateHost(actorUserId, userId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }
  if (!(await deletePersonalSchedulingException(userId, exceptionId))) {
    throw new Error("SCHEDULING_EXCEPTION_NOT_FOUND");
  }
}

export async function togglePersonalScheduling(
  actorUserId: string,
  permissions: PersonalSchedulingPermissionMap,
  userId: string,
  publicEnabled: boolean,
): Promise<void> {
  if (!(await canOperateHost(actorUserId, userId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }

  const settings = await getPersonalSchedulingSettings(userId);
  if (publicEnabled && !settings.googleConnected) {
    throw new Error("SCHEDULING_HOST_GOOGLE_REQUIRED");
  }

  await setPersonalSchedulingPublicEnabled(userId, publicEnabled);
  await recordAuditEvent({
    actorUserId,
    action: publicEnabled
      ? "scheduling.public_profile.enabled"
      : "scheduling.public_profile.disabled",
    entityType: "user",
    entityId: userId,
  });
}

export async function configureBlockingCalendars(
  actorUserId: string,
  permissions: PersonalSchedulingPermissionMap,
  userId: string,
  calendarIds: string[],
): Promise<void> {
  if (!(await canOperateHost(actorUserId, userId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }
  await setSchedulingBlockingCalendars(userId, calendarIds);
}

function overlaps(
  startAt: Date,
  endAt: Date,
  busyStartAt: Date,
  busyEndAt: Date,
): boolean {
  return startAt.getTime() < busyEndAt.getTime() && endAt.getTime() > busyStartAt.getTime();
}

function conflictsWithCalendar(
  startAt: Date,
  endAt: Date,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number,
  conflicts: CalendarAvailabilityConflict[],
): boolean {
  const guardedStart = new Date(startAt.getTime() - bufferBeforeMinutes * 60_000);
  const guardedEnd = new Date(endAt.getTime() + bufferAfterMinutes * 60_000);
  return conflicts.some((conflict) => {
    const busyStart = new Date(conflict.start);
    const busyEnd = new Date(conflict.end);
    return overlaps(guardedStart, guardedEnd, busyStart, busyEnd);
  });
}

function conflictsWithReservation(
  startAt: Date,
  endAt: Date,
  bufferBeforeMinutes: number,
  bufferAfterMinutes: number,
  reservation: {
    startAt: Date | null;
    endAt: Date | null;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  },
): boolean {
  if (!reservation.startAt || !reservation.endAt) return false;
  const guardedStart = new Date(startAt.getTime() - bufferBeforeMinutes * 60_000);
  const guardedEnd = new Date(endAt.getTime() + bufferAfterMinutes * 60_000);
  const reservationStart = new Date(
    reservation.startAt.getTime() - reservation.bufferBeforeMinutes * 60_000,
  );
  const reservationEnd = new Date(
    reservation.endAt.getTime() + reservation.bufferAfterMinutes * 60_000,
  );
  return overlaps(guardedStart, guardedEnd, reservationStart, reservationEnd);
}

function dateWindows(
  date: string,
  weeklyWindows: Array<{ weekday: SchedulingWeekday; startTime: string; endTime: string }>,
  exceptions: Array<{
    exceptionDate: string;
    available: boolean;
    startTime: string | null;
    endTime: string | null;
  }>,
): Array<{ startTime: string; endTime: string }> {
  const dateExceptions = exceptions.filter((exception) => exception.exceptionDate === date);
  if (dateExceptions.length > 0) {
    const customWindows = dateExceptions
      .filter(
        (exception) =>
          exception.available &&
          Boolean(exception.startTime) &&
          Boolean(exception.endTime),
      )
      .map((exception) => ({
        startTime: exception.startTime as string,
        endTime: exception.endTime as string,
      }));
    return customWindows;
  }

  const weekday = dateKeyWeekday(date);
  return weeklyWindows
    .filter((window) => window.weekday === weekday)
    .map((window) => ({ startTime: window.startTime, endTime: window.endTime }));
}

async function availabilityContext(
  schedule: Awaited<ReturnType<typeof getPublicPersonalSchedule>>,
  excludeBookingId?: string,
) {
  if (!schedule) throw new Error("SCHEDULING_PUBLIC_PROFILE_NOT_FOUND");
  const today = instantToZonedParts(new Date(), schedule.timeZone).date;
  const endDate = addDateKeyDays(today, schedule.maxHorizonDays);
  const rangeStart = localDateTimeToUtc(today, "00:00", schedule.timeZone);
  const rangeEnd = localDateTimeToUtc(addDateKeyDays(endDate, 1), "00:00", schedule.timeZone);

  const [calendar, reservations] = await Promise.all([
    listF10CalendarBusyIntervals({
      user: {
        id: schedule.userId,
        name: schedule.hostName,
        email: schedule.hostEmail,
      },
      startDate: today,
      endDate,
      timeZone: schedule.timeZone,
    }),
    listPersonalSchedulingReservations(
      schedule.userId,
      rangeStart,
      rangeEnd,
      excludeBookingId,
    ),
  ]);

  if (calendar.coverage !== "google") {
    throw new Error("SCHEDULING_GOOGLE_AVAILABILITY_UNAVAILABLE");
  }
  return { today, endDate, calendar, reservations };
}

export async function listPersonalSchedulingSlots(
  schedule: NonNullable<Awaited<ReturnType<typeof getPublicPersonalSchedule>>>,
): Promise<PersonalSchedulingSlot[]> {
  const connection = await getGoogleCalendarConnection(schedule.userId);
  if (!connection.connected) throw new Error("SCHEDULING_HOST_GOOGLE_REQUIRED");

  const { today, endDate, calendar, reservations } = await availabilityContext(schedule);
  const earliestStart = Date.now() + schedule.minimumNoticeMinutes * 60_000;
  const slots: PersonalSchedulingSlot[] = [];

  for (
    let date = today;
    date <= endDate && slots.length < MAX_PUBLIC_SLOTS;
    date = addDateKeyDays(date, 1)
  ) {
    const windows = dateWindows(date, schedule.windows, schedule.exceptions);
    for (const window of windows) {
      const startMinutes = timeToMinutes(window.startTime);
      const endMinutes = timeToMinutes(window.endTime);
      for (
        let minute = startMinutes;
        minute + schedule.durationMinutes <= endMinutes && slots.length < MAX_PUBLIC_SLOTS;
        minute += schedule.slotStepMinutes
      ) {
        const startTime = minutesToTime(minute);
        const endTime = minutesToTime(minute + schedule.durationMinutes);
        let startAt: Date;
        let endAt: Date;
        try {
          startAt = localDateTimeToUtc(date, startTime, schedule.timeZone);
          endAt = localDateTimeToUtc(date, endTime, schedule.timeZone);
        } catch {
          continue;
        }

        if (startAt.getTime() < earliestStart) continue;
        if (
          conflictsWithCalendar(
            startAt,
            endAt,
            schedule.bufferBeforeMinutes,
            schedule.bufferAfterMinutes,
            calendar.conflicts,
          )
        ) {
          continue;
        }
        if (
          reservations.some((reservation) =>
            conflictsWithReservation(
              startAt,
              endAt,
              schedule.bufferBeforeMinutes,
              schedule.bufferAfterMinutes,
              reservation,
            ),
          )
        ) {
          continue;
        }

        slots.push({
          date,
          time: startTime,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
        });
      }
    }
  }

  return slots;
}

async function slotStillAvailable(
  schedule: NonNullable<Awaited<ReturnType<typeof getPublicPersonalSchedule>>>,
  bookingId: string,
  startAt: Date,
  endAt: Date,
): Promise<boolean> {
  const { calendar, reservations } = await availabilityContext(schedule, bookingId);
  if (
    conflictsWithCalendar(
      startAt,
      endAt,
      schedule.bufferBeforeMinutes,
      schedule.bufferAfterMinutes,
      calendar.conflicts,
    )
  ) {
    return false;
  }
  return !reservations.some((reservation) =>
    conflictsWithReservation(
      startAt,
      endAt,
      schedule.bufferBeforeMinutes,
      schedule.bufferAfterMinutes,
      reservation,
    ),
  );
}

async function createPersonalGoogleEvent(
  schedule: NonNullable<Awaited<ReturnType<typeof getPublicPersonalSchedule>>>,
  customer: PublicCustomerContext,
  notes: string,
  startAt: Date,
  endAt: Date,
) {
  const preferences = await getGoogleCalendarSyncPreferences(schedule.userId);
  const preferredCalendarId = preferences.targetCalendarId || "primary";
  const localStart = instantToZonedParts(startAt, schedule.timeZone);
  const localEnd = instantToZonedParts(endAt, schedule.timeZone);
  const descriptionLines = [
    "Agendamento pelo Portal do Cliente F10",
    "",
    `Cliente: ${customer.name}`,
    customer.selectedGroupName ? `Grupo: ${customer.selectedGroupName}` : "",
    customer.selectedUnitName ? `Unidade: ${customer.selectedUnitName}` : "",
    `E-mail: ${customer.email}`,
    notes ? "" : "",
    notes ? "Observação:" : "",
    notes,
  ].filter(Boolean);

  const input = {
    title: `${schedule.publicTitle} · ${customer.name}`,
    description: descriptionLines.join("\n"),
    date: localStart.date,
    allDay: false,
    startTime: localStart.time,
    endTime: localEnd.time,
    timeZone: schedule.timeZone,
    addGoogleMeet: schedule.addGoogleMeet,
    reminderMinutes: 30,
    attendees: [{ email: customer.email }],
  };

  try {
    return {
      event: await createGoogleCalendarEvent(schedule.userId, input, preferredCalendarId),
      calendarId: preferredCalendarId,
    };
  } catch (cause) {
    if (preferredCalendarId === "primary") throw cause;
    return {
      event: await createGoogleCalendarEvent(schedule.userId, input, "primary"),
      calendarId: "primary",
    };
  }
}

export async function bookPersonalSchedulingSlot(
  publicSlug: string,
  customer: PublicCustomerContext,
  selectedStartAt: string,
  rawNotes: string,
) {
  const schedule = await getPublicPersonalSchedule(publicSlug);
  if (!schedule) throw new Error("SCHEDULING_PUBLIC_PROFILE_NOT_FOUND");
  const notes = rawNotes.trim();
  if (notes.length > 2000) throw new Error("SCHEDULING_NOTES_TOO_LONG");

  const offeredSlots = await listPersonalSchedulingSlots(schedule);
  const selected = offeredSlots.find((slot) => slot.startAt === selectedStartAt);
  if (!selected) throw new Error("SCHEDULING_SLOT_UNAVAILABLE");

  const startAt = new Date(selected.startAt);
  const endAt = new Date(selected.endAt);
  const booking = await claimPersonalSchedulingBooking({
    hostUserId: schedule.userId,
    customerContactId: customer.contactId,
    customerName: customer.name,
    customerEmail: customer.email,
    groupId: customer.selectedGroupId,
    groupName: customer.selectedGroupName,
    unitId: customer.selectedUnitId,
    unitName: customer.selectedUnitName,
    notes,
    startAt,
    endAt,
    bufferBeforeMinutes: schedule.bufferBeforeMinutes,
    bufferAfterMinutes: schedule.bufferAfterMinutes,
  });
  if (!booking) throw new Error("SCHEDULING_SLOT_UNAVAILABLE");

  try {
    if (!(await slotStillAvailable(schedule, booking.id, startAt, endAt))) {
      throw new Error("SCHEDULING_SLOT_UNAVAILABLE");
    }
  } catch (error) {
    await cancelPersonalSchedulingClaim(booking.id);
    throw error;
  }

  let googleEvent: Awaited<ReturnType<typeof createGoogleCalendarEvent>> | null = null;
  let googleCalendarId = "primary";
  try {
    const created = await createPersonalGoogleEvent(
      schedule,
      customer,
      notes,
      startAt,
      endAt,
    );
    googleEvent = created.event;
    googleCalendarId = created.calendarId;
    const completed = await completePersonalSchedulingBooking(booking.id, {
      calendarId: googleCalendarId,
      eventId: googleEvent.id,
      iCalUid: googleEvent.iCalUID,
      meetUrl: googleEvent.meetUrl,
    });

    const sideEffects = await Promise.allSettled([
      createInternalNotification({
        userId: schedule.userId,
        kind: "scheduling.booked",
        title: "Novo agendamento",
        body: `${customer.name} · ${instantToZonedParts(startAt, schedule.timeZone).date} ${instantToZonedParts(startAt, schedule.timeZone).time}`,
        href: "/app/tasks/calendar?view=list&period=today",
        entityType: "system",
        entityId: booking.id,
      }),
      recordAuditEvent({
        action: "scheduling.public.booked",
        entityType: "scheduling_booking",
        entityId: booking.id,
        metadata: {
          hostUserId: schedule.userId,
          customerContactId: customer.contactId,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
          googleCalendarId,
          googleEventId: googleEvent.id,
        },
      }),
      sendPersonalSchedulingConfirmation({
        id: completed.id,
        title: schedule.publicTitle,
        hostName: schedule.hostName,
        customerName: customer.name,
        customerEmail: customer.email,
        startAt: completed.startAt,
        endAt: completed.endAt,
        timeZone: schedule.timeZone,
        googleIcalUid: completed.googleIcalUid,
        googleMeetUrl: completed.googleMeetUrl,
      }).catch((cause) => {
        console.error("[scheduling.confirmation.email]", {
          bookingId: completed.id,
          causeType: cause instanceof Error ? cause.message : typeof cause,
        });
        throw cause;
      }),
    ]);

    return {
      id: completed.id,
      hostName: schedule.hostName,
      title: schedule.publicTitle,
      timeZone: schedule.timeZone,
      startAt: completed.startAt.toISOString(),
      endAt: completed.endAt.toISOString(),
      googleMeetUrl: completed.googleMeetUrl,
      calendarFilePath: `/agendar/${schedule.publicSlug}/booking/${completed.id}/calendar`,
      confirmationEmailSent: sideEffects[2]?.status === "fulfilled",
    };
  } catch (error) {
    if (googleEvent) {
      await deleteGoogleCalendarEvent(
        schedule.userId,
        googleCalendarId,
        googleEvent.id,
      ).catch(() => undefined);
    }
    await cancelPersonalSchedulingClaim(booking.id);
    if (error instanceof Error && error.message === "SCHEDULING_SLOT_UNAVAILABLE") throw error;
    throw new Error("SCHEDULING_GOOGLE_CREATE_FAILED");
  }
}

export {
  getPersonalSchedulingSettings,
  getPublicPersonalSchedule,
};
