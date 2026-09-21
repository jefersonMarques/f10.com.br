import { createHash, randomBytes } from "node:crypto";
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
import {
  completeSchedulingGoogleReservation,
  completeSchedulingWithoutGoogleReservation,
} from "$lib/server/calendar/schedulingGoogleCalendarRepository";
import {
  claimSchedulingReservation,
  createSchedulingInvitation,
  getSchedulingAvailabilityProfile,
  getSchedulingCustomer,
  getSchedulingHost,
  getSchedulingInvitationByTokenHash,
  listSchedulingReservations,
  listSchedulingTeamUserIds,
  markSchedulingInvitationExpired,
  markSchedulingInvitationOpened,
  recoverStaleSchedulingReservation,
  releaseSchedulingReservation,
  revokeSchedulingInvitation,
  saveSchedulingAvailabilityProfile,
  type SchedulingAvailabilityProfile,
  type SchedulingInvitationRow,
} from "$lib/server/calendar/schedulingRepository";
import {
  addDateKeyDays,
  dateKeyWeekday,
  daysBetweenDateKeys,
  endOfDateRange,
  instantToZonedParts,
  isValidDateKey,
  isValidTimeValue,
  isValidTimeZone,
  localDateTimeToUtc,
  minutesToTime,
  timeToMinutes,
} from "$lib/server/calendar/schedulingTime";
import type { SchedulingWeekday } from "$lib/server/db/schedulingSchema";

export type SchedulingPermissionMap = Map<string, PermissionScope>;

export type CreateSchedulingInvitationInput = {
  customerContactId: string;
  title: string;
  hostUserId: string;
  durationMinutes: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  addGoogleMeet: boolean;
};

export type SchedulingSlot = {
  date: string;
  time: string;
  startAt: string;
  endAt: string;
};

export type PublicSchedulingInvitation = {
  title: string;
  hostName: string;
  durationMinutes: number;
  timeZone: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  addGoogleMeet: boolean;
  status: SchedulingInvitationRow["status"];
  selectedStartAt: string | null;
  selectedEndAt: string | null;
  googleMeetUrl: string | null;
};

const MAX_PUBLIC_SLOTS = 500;

function hashSchedulingToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isValidSchedulingToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{40,120}$/.test(token);
}

function createSchedulingToken(): string {
  return randomBytes(32).toString("base64url");
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320;
}

async function canOperateHost(
  actorUserId: string,
  hostUserId: string,
  permissions: SchedulingPermissionMap,
): Promise<boolean> {
  if (hasPermission(permissions, "scheduling.manage")) return true;
  const scope = getPermissionScope(permissions, "scheduling.create");
  if (scope === "all") return true;
  if (scope === "team") {
    const teamUserIds = await listSchedulingTeamUserIds(actorUserId);
    return teamUserIds.includes(hostUserId);
  }
  return scope === "own" && actorUserId === hostUserId;
}

function validWeekdays(values: SchedulingWeekday[]): boolean {
  return values.length > 0 && values.every((value) => Number.isInteger(value) && value >= 0 && value <= 6);
}

export function validateSchedulingAvailabilityProfile(
  profile: Omit<SchedulingAvailabilityProfile, "source">,
): void {
  if (!isValidTimeZone(profile.timeZone)) throw new Error("SCHEDULING_INVALID_TIME_ZONE");
  if (!validWeekdays(profile.weekdays)) throw new Error("SCHEDULING_INVALID_WEEKDAYS");
  if (!isValidTimeValue(profile.startTime) || !isValidTimeValue(profile.endTime) || profile.startTime >= profile.endTime) {
    throw new Error("SCHEDULING_INVALID_WORKING_HOURS");
  }
  if (!Number.isInteger(profile.slotStepMinutes) || profile.slotStepMinutes < 5 || profile.slotStepMinutes > 120) {
    throw new Error("SCHEDULING_INVALID_SLOT_STEP");
  }
  if (!Number.isInteger(profile.minimumNoticeMinutes) || profile.minimumNoticeMinutes < 0 || profile.minimumNoticeMinutes > 43_200) {
    throw new Error("SCHEDULING_INVALID_MINIMUM_NOTICE");
  }
  if (!Number.isInteger(profile.bufferBeforeMinutes) || profile.bufferBeforeMinutes < 0 || profile.bufferBeforeMinutes > 240) {
    throw new Error("SCHEDULING_INVALID_BUFFER");
  }
  if (!Number.isInteger(profile.bufferAfterMinutes) || profile.bufferAfterMinutes < 0 || profile.bufferAfterMinutes > 240) {
    throw new Error("SCHEDULING_INVALID_BUFFER");
  }
  if (!Number.isInteger(profile.maxHorizonDays) || profile.maxHorizonDays < 1 || profile.maxHorizonDays > 90) {
    throw new Error("SCHEDULING_INVALID_HORIZON");
  }
  if (!Number.isInteger(profile.defaultDurationMinutes) || profile.defaultDurationMinutes < 15 || profile.defaultDurationMinutes > 240) {
    throw new Error("SCHEDULING_INVALID_DURATION");
  }
}

export async function configureSchedulingAvailability(
  actorUserId: string,
  permissions: SchedulingPermissionMap,
  profile: Omit<SchedulingAvailabilityProfile, "source">,
): Promise<void> {
  if (!(await canOperateHost(actorUserId, profile.userId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }
  validateSchedulingAvailabilityProfile(profile);
  await saveSchedulingAvailabilityProfile(actorUserId, profile);
  await recordAuditEvent({
    actorUserId,
    action: "scheduling.availability.updated",
    entityType: "user",
    entityId: profile.userId,
    metadata: {
      timeZone: profile.timeZone,
      weekdays: profile.weekdays,
      startTime: profile.startTime,
      endTime: profile.endTime,
      slotStepMinutes: profile.slotStepMinutes,
    },
  });
}

export async function generateSchedulingInvitation(
  actorUserId: string,
  permissions: SchedulingPermissionMap,
  input: CreateSchedulingInvitationInput,
): Promise<{ invitationId: string; token: string }> {
  if (!(await canOperateHost(actorUserId, input.hostUserId, permissions))) {
    throw new Error("SCHEDULING_HOST_NOT_ALLOWED");
  }

  const title = input.title.trim();
  if (title.length < 3 || title.length > 180) throw new Error("SCHEDULING_INVALID_TITLE");
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 15 || input.durationMinutes > 240) {
    throw new Error("SCHEDULING_INVALID_DURATION");
  }
  if (!isValidDateKey(input.dateRangeStart) || !isValidDateKey(input.dateRangeEnd) || input.dateRangeEnd < input.dateRangeStart) {
    throw new Error("SCHEDULING_INVALID_DATE_RANGE");
  }

  const [host, customer, profile, googleConnection] = await Promise.all([
    getSchedulingHost(input.hostUserId),
    getSchedulingCustomer(input.customerContactId),
    getSchedulingAvailabilityProfile(input.hostUserId),
    getGoogleCalendarConnection(input.hostUserId),
  ]);

  if (!host || host.status !== "active") throw new Error("SCHEDULING_HOST_NOT_FOUND");
  if (!googleConnection.connected) throw new Error("SCHEDULING_HOST_GOOGLE_REQUIRED");
  const customerEmail = normalizeEmail(customer?.email ?? "");
  if (!customer || !customer.active || !customerEmail || !isValidEmail(customerEmail)) {
    throw new Error("SCHEDULING_CUSTOMER_EMAIL_REQUIRED");
  }

  const today = instantToZonedParts(new Date(), profile.timeZone).date;
  if (input.dateRangeStart < today) throw new Error("SCHEDULING_DATE_RANGE_IN_PAST");
  if (
    daysBetweenDateKeys(today, input.dateRangeEnd) > profile.maxHorizonDays ||
    daysBetweenDateKeys(input.dateRangeStart, input.dateRangeEnd) > profile.maxHorizonDays
  ) {
    throw new Error("SCHEDULING_DATE_RANGE_TOO_LONG");
  }

  const token = createSchedulingToken();
  const now = new Date();
  const invitation = await createSchedulingInvitation({
    tokenHash: hashSchedulingToken(token),
    createdByUserId: actorUserId,
    customerContactId: customer.id,
    customerName: customer.name.trim(),
    customerEmail,
    title,
    hostUserId: host.id,
    durationMinutes: input.durationMinutes,
    timeZone: profile.timeZone,
    workingWeekdays: profile.weekdays,
    workingStartTime: profile.startTime,
    workingEndTime: profile.endTime,
    slotStepMinutes: profile.slotStepMinutes,
    minimumNoticeMinutes: profile.minimumNoticeMinutes,
    bufferBeforeMinutes: profile.bufferBeforeMinutes,
    bufferAfterMinutes: profile.bufferAfterMinutes,
    dateRangeStart: input.dateRangeStart,
    dateRangeEnd: input.dateRangeEnd,
    addGoogleMeet: input.addGoogleMeet,
    status: "sent",
    expiresAt: endOfDateRange(input.dateRangeEnd, profile.timeZone),
    sentAt: now,
    updatedAt: now,
  });

  await recordAuditEvent({
    actorUserId,
    action: "scheduling.invitation.created",
    entityType: "scheduling_invitation",
    entityId: invitation.id,
    metadata: {
      hostUserId: host.id,
      customerContactId: customer.id,
      durationMinutes: input.durationMinutes,
      dateRangeStart: input.dateRangeStart,
      dateRangeEnd: input.dateRangeEnd,
      addGoogleMeet: input.addGoogleMeet,
    },
  });

  return { invitationId: invitation.id, token };
}

async function resolvePublicInvitation(token: string): Promise<SchedulingInvitationRow | null> {
  if (!isValidSchedulingToken(token)) return null;
  const invitation = await getSchedulingInvitationByTokenHash(hashSchedulingToken(token));
  if (!invitation) return null;

  if (invitation.expiresAt.getTime() <= Date.now()) {
    if (invitation.status !== "booked") await markSchedulingInvitationExpired(invitation.id);
    return null;
  }
  if (["draft", "expired", "revoked", "cancelled"].includes(invitation.status)) return null;

  if (invitation.status === "booking" && await recoverStaleSchedulingReservation(invitation.id)) {
    const recovered = await getSchedulingInvitationByTokenHash(hashSchedulingToken(token));
    if (!recovered) return null;
    return recovered;
  }

  if (invitation.status === "sent") {
    await markSchedulingInvitationOpened(invitation.id);
    return { ...invitation, status: "opened", openedAt: invitation.openedAt ?? new Date() };
  }
  return invitation;
}

export async function getPublicSchedulingInvitation(
  token: string,
): Promise<{ invitation: PublicSchedulingInvitation; row: SchedulingInvitationRow } | null> {
  const row = await resolvePublicInvitation(token);
  if (!row) return null;
  const host = await getSchedulingHost(row.hostUserId);
  if (!host || host.status !== "active") return null;

  return {
    row,
    invitation: {
      title: row.title,
      hostName: host.name,
      durationMinutes: row.durationMinutes,
      timeZone: row.timeZone,
      dateRangeStart: row.dateRangeStart,
      dateRangeEnd: row.dateRangeEnd,
      addGoogleMeet: row.addGoogleMeet,
      status: row.status,
      selectedStartAt: row.selectedStartAt?.toISOString() ?? null,
      selectedEndAt: row.selectedEndAt?.toISOString() ?? null,
      googleMeetUrl: row.googleMeetUrl,
    },
  };
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
  invitation: SchedulingInvitationRow,
  conflicts: CalendarAvailabilityConflict[],
): boolean {
  const guardedStart = new Date(startAt.getTime() - invitation.bufferBeforeMinutes * 60_000);
  const guardedEnd = new Date(endAt.getTime() + invitation.bufferAfterMinutes * 60_000);
  return conflicts.some((conflict) => {
    const busyStart = new Date(conflict.start);
    const busyEnd = new Date(conflict.end);
    return overlaps(guardedStart, guardedEnd, busyStart, busyEnd);
  });
}

function conflictsWithReservation(
  startAt: Date,
  endAt: Date,
  invitation: SchedulingInvitationRow,
  reservation: {
    startAt: Date | null;
    endAt: Date | null;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  },
): boolean {
  if (!reservation.startAt || !reservation.endAt) return false;
  const guardedStart = new Date(startAt.getTime() - invitation.bufferBeforeMinutes * 60_000);
  const guardedEnd = new Date(endAt.getTime() + invitation.bufferAfterMinutes * 60_000);
  const reservationStart = new Date(
    reservation.startAt.getTime() - reservation.bufferBeforeMinutes * 60_000,
  );
  const reservationEnd = new Date(
    reservation.endAt.getTime() + reservation.bufferAfterMinutes * 60_000,
  );
  return overlaps(guardedStart, guardedEnd, reservationStart, reservationEnd);
}

async function loadAvailabilityContext(
  invitation: SchedulingInvitationRow,
  excludeInvitationId?: string,
) {
  const host = await getSchedulingHost(invitation.hostUserId);
  if (!host || host.status !== "active") throw new Error("SCHEDULING_HOST_NOT_FOUND");

  const [calendar, reservations] = await Promise.all([
    listF10CalendarBusyIntervals({
      user: { id: host.id, name: host.name, email: host.email },
      startDate: invitation.dateRangeStart,
      endDate: invitation.dateRangeEnd,
      timeZone: invitation.timeZone,
    }),
    listSchedulingReservations(
      invitation.hostUserId,
      localDateTimeToUtc(invitation.dateRangeStart, "00:00", invitation.timeZone),
      localDateTimeToUtc(addDateKeyDays(invitation.dateRangeEnd, 1), "00:00", invitation.timeZone),
      excludeInvitationId,
    ),
  ]);

  if (calendar.coverage !== "google") {
    throw new Error("SCHEDULING_GOOGLE_AVAILABILITY_UNAVAILABLE");
  }
  return { calendar, reservations };
}

export async function listSchedulingSlots(
  invitation: SchedulingInvitationRow,
): Promise<SchedulingSlot[]> {
  if (!["sent", "opened"].includes(invitation.status)) return [];
  if (invitation.expiresAt.getTime() <= Date.now()) return [];

  const { calendar, reservations } = await loadAvailabilityContext(invitation);
  const slots: SchedulingSlot[] = [];
  const startMinutes = timeToMinutes(invitation.workingStartTime);
  const endMinutes = timeToMinutes(invitation.workingEndTime);
  const earliestStart = Date.now() + invitation.minimumNoticeMinutes * 60_000;

  for (
    let date = invitation.dateRangeStart;
    date <= invitation.dateRangeEnd && slots.length < MAX_PUBLIC_SLOTS;
    date = addDateKeyDays(date, 1)
  ) {
    if (!invitation.workingWeekdays.includes(dateKeyWeekday(date))) continue;

    for (
      let minute = startMinutes;
      minute + invitation.durationMinutes <= endMinutes && slots.length < MAX_PUBLIC_SLOTS;
      minute += invitation.slotStepMinutes
    ) {
      const startTime = minutesToTime(minute);
      const endTime = minutesToTime(minute + invitation.durationMinutes);
      let startAt: Date;
      let endAt: Date;
      try {
        startAt = localDateTimeToUtc(date, startTime, invitation.timeZone);
        endAt = localDateTimeToUtc(date, endTime, invitation.timeZone);
      } catch {
        continue;
      }
      if (startAt.getTime() < earliestStart || startAt.getTime() >= invitation.expiresAt.getTime()) continue;
      if (conflictsWithCalendar(startAt, endAt, invitation, calendar.conflicts)) continue;
      if (reservations.some((reservation) => conflictsWithReservation(startAt, endAt, invitation, reservation))) continue;

      slots.push({
        date,
        time: startTime,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });
    }
  }

  return slots;
}

async function slotStillAvailable(
  invitation: SchedulingInvitationRow,
  startAt: Date,
  endAt: Date,
): Promise<boolean> {
  const { calendar, reservations } = await loadAvailabilityContext(invitation, invitation.id);
  if (conflictsWithCalendar(startAt, endAt, invitation, calendar.conflicts)) return false;
  return !reservations.some((reservation) =>
    conflictsWithReservation(startAt, endAt, invitation, reservation),
  );
}

async function createSchedulingGoogleEvent(
  invitation: SchedulingInvitationRow,
  localStart: { date: string; time: string },
  localEnd: { date: string; time: string },
): Promise<{ event: Awaited<ReturnType<typeof createGoogleCalendarEvent>>; calendarId: string }> {
  const preferences = await getGoogleCalendarSyncPreferences(invitation.hostUserId);
  const preferredCalendarId = preferences.targetCalendarId || "primary";
  const input = {
    title: invitation.title,
    description: "Agendamento confirmado pelo F10.",
    date: localStart.date,
    allDay: false,
    startTime: localStart.time,
    endTime: localEnd.time,
    timeZone: invitation.timeZone,
    addGoogleMeet: invitation.addGoogleMeet,
    attendees: [{ email: invitation.customerEmail }],
  };

  try {
    return {
      event: await createGoogleCalendarEvent(invitation.hostUserId, input, preferredCalendarId),
      calendarId: preferredCalendarId,
    };
  } catch (cause) {
    if (preferredCalendarId === "primary") throw cause;
    return {
      event: await createGoogleCalendarEvent(invitation.hostUserId, input, "primary"),
      calendarId: "primary",
    };
  }
}

export async function bookSchedulingSlot(
  token: string,
  selectedStartAt: string,
): Promise<PublicSchedulingInvitation> {
  const resolved = await getPublicSchedulingInvitation(token);
  if (!resolved) throw new Error("SCHEDULING_INVITATION_UNAVAILABLE");
  const invitation = resolved.row;
  if (!["sent", "opened"].includes(invitation.status)) {
    throw new Error("SCHEDULING_INVITATION_UNAVAILABLE");
  }

  const offeredSlots = await listSchedulingSlots(invitation);
  const selected = offeredSlots.find((slot) => slot.startAt === selectedStartAt);
  if (!selected) throw new Error("SCHEDULING_SLOT_UNAVAILABLE");

  const startAt = new Date(selected.startAt);
  const endAt = new Date(selected.endAt);
  const claim = await claimSchedulingReservation(invitation, startAt, endAt);
  if (claim !== "claimed") throw new Error("SCHEDULING_SLOT_UNAVAILABLE");

  try {
    if (!(await slotStillAvailable(invitation, startAt, endAt))) {
      throw new Error("SCHEDULING_SLOT_UNAVAILABLE");
    }
  } catch (error) {
    await releaseSchedulingReservation(invitation.id);
    throw error;
  }

  const preferences = await getGoogleCalendarSyncPreferences(invitation.hostUserId);
  const shouldSyncGoogle = preferences.syncSchedulingToGoogle || invitation.addGoogleMeet;

  if (!shouldSyncGoogle) {
    try {
      await completeSchedulingWithoutGoogleReservation(invitation.id);
    } catch (error) {
      await releaseSchedulingReservation(invitation.id);
      throw error;
    }

    await recordAuditEvent({
      action: "scheduling.invitation.booked",
      entityType: "scheduling_invitation",
      entityId: invitation.id,
      metadata: {
        hostUserId: invitation.hostUserId,
        customerContactId: invitation.customerContactId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        googleSynchronized: false,
      },
    });

    return {
      ...resolved.invitation,
      status: "booked",
      selectedStartAt: startAt.toISOString(),
      selectedEndAt: endAt.toISOString(),
      googleMeetUrl: null,
    };
  }

  const localStart = instantToZonedParts(startAt, invitation.timeZone);
  const localEnd = instantToZonedParts(endAt, invitation.timeZone);
  let googleEvent: Awaited<ReturnType<typeof createGoogleCalendarEvent>> | null = null;
  let googleCalendarId = "primary";

  try {
    const created = await createSchedulingGoogleEvent(invitation, localStart, localEnd);
    googleEvent = created.event;
    googleCalendarId = created.calendarId;
    await completeSchedulingGoogleReservation(invitation.id, googleCalendarId, {
      eventId: googleEvent.id,
      iCalUid: googleEvent.iCalUID,
      meetUrl: googleEvent.meetUrl,
    });
  } catch (error) {
    if (googleEvent) {
      await deleteGoogleCalendarEvent(invitation.hostUserId, googleCalendarId, googleEvent.id).catch(() => undefined);
    }
    await releaseSchedulingReservation(invitation.id);
    if (error instanceof Error && error.message === "SCHEDULING_SLOT_UNAVAILABLE") throw error;
    throw new Error("SCHEDULING_GOOGLE_CREATE_FAILED");
  }

  if (!googleEvent) throw new Error("SCHEDULING_GOOGLE_CREATE_FAILED");

  await recordAuditEvent({
    action: "scheduling.invitation.booked",
    entityType: "scheduling_invitation",
    entityId: invitation.id,
    metadata: {
      hostUserId: invitation.hostUserId,
      customerContactId: invitation.customerContactId,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      googleSynchronized: true,
      googleCalendarId,
      googleEventId: googleEvent.id,
    },
  });

  return {
    ...resolved.invitation,
    status: "booked",
    selectedStartAt: startAt.toISOString(),
    selectedEndAt: endAt.toISOString(),
    googleMeetUrl: googleEvent.meetUrl,
  };
}

export async function revokeSchedulingLink(
  actorUserId: string,
  permissions: SchedulingPermissionMap,
  invitationId: string,
): Promise<void> {
  const canManageAll = hasPermission(permissions, "scheduling.manage");
  const revoked = await revokeSchedulingInvitation(invitationId, actorUserId, canManageAll);
  if (!revoked) throw new Error("SCHEDULING_INVITATION_NOT_REVOCABLE");
  await recordAuditEvent({
    actorUserId,
    action: "scheduling.invitation.revoked",
    entityType: "scheduling_invitation",
    entityId: invitationId,
  });
}
