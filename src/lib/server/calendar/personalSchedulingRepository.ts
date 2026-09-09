import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  googleCalendarConnections,
  googleCalendarSources,
} from "$lib/server/db/googleCalendarSchema";
import {
  schedulingAvailabilityExceptions,
  schedulingAvailabilityProfiles,
  schedulingAvailabilityWindows,
  schedulingBookings,
  schedulingInvitations,
  type SchedulingWeekday,
} from "$lib/server/db/schedulingSchema";
import { users } from "$lib/server/db/schema";
import { addDateKeyDays, instantToZonedParts } from "$lib/server/calendar/schedulingTime";

const BOOKING_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

export type PersonalAvailabilityWindow = {
  weekday: SchedulingWeekday;
  startTime: string;
  endTime: string;
};

export type PersonalSchedulingSettingsInput = {
  timeZone: string;
  slotStepMinutes: number;
  minimumNoticeMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  maxHorizonDays: number;
  defaultDurationMinutes: number;
  publicEnabled: boolean;
  publicTitle: string;
  publicDescription: string;
  addGoogleMeet: boolean;
  windows: PersonalAvailabilityWindow[];
};

function slugPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function generatedPublicSlug(name: string, userId: string): string {
  const prefix = slugPart(name) || "agenda";
  return `${prefix}-${userId.replaceAll("-", "").slice(0, 10)}`;
}

async function ensureDefaultWindows(userId: string): Promise<void> {
  const db = getDatabase();
  const existing = await db
    .select({ id: schedulingAvailabilityWindows.id })
    .from(schedulingAvailabilityWindows)
    .where(eq(schedulingAvailabilityWindows.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  const [profile] = await db
    .select({
      weekdays: schedulingAvailabilityProfiles.weekdays,
      startTime: schedulingAvailabilityProfiles.startTime,
      endTime: schedulingAvailabilityProfiles.endTime,
    })
    .from(schedulingAvailabilityProfiles)
    .where(eq(schedulingAvailabilityProfiles.userId, userId))
    .limit(1);
  if (!profile) return;

  await db.insert(schedulingAvailabilityWindows).values(
    profile.weekdays.map((weekday) => ({
      userId,
      weekday,
      startTime: profile.startTime,
      endTime: profile.endTime,
      sortOrder: 0,
    })),
  );
}

export async function ensurePersonalSchedulingProfile(userId: string) {
  const db = getDatabase();
  const [host] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!host || host.status !== "active") throw new Error("SCHEDULING_HOST_NOT_FOUND");

  let [profile] = await db
    .select()
    .from(schedulingAvailabilityProfiles)
    .where(eq(schedulingAvailabilityProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    const [created] = await db
      .insert(schedulingAvailabilityProfiles)
      .values({
        userId,
        publicSlug: generatedPublicSlug(host.name, userId),
        updatedBy: userId,
      })
      .returning();
    if (!created) throw new Error("SCHEDULING_PROFILE_NOT_CREATED");
    profile = created;
  } else if (!profile.publicSlug) {
    const [updated] = await db
      .update(schedulingAvailabilityProfiles)
      .set({
        publicSlug: generatedPublicSlug(host.name, userId),
        updatedAt: new Date(),
      })
      .where(eq(schedulingAvailabilityProfiles.userId, userId))
      .returning();
    if (updated) profile = updated;
  }

  await ensureDefaultWindows(userId);
  return { host, profile };
}

export async function getPersonalSchedulingSettings(userId: string) {
  const { host, profile } = await ensurePersonalSchedulingProfile(userId);
  const db = getDatabase();
  const [windows, exceptions, bookings, sources, connection] = await Promise.all([
    db
      .select()
      .from(schedulingAvailabilityWindows)
      .where(eq(schedulingAvailabilityWindows.userId, userId))
      .orderBy(
        asc(schedulingAvailabilityWindows.weekday),
        asc(schedulingAvailabilityWindows.sortOrder),
        asc(schedulingAvailabilityWindows.startTime),
      ),
    db
      .select()
      .from(schedulingAvailabilityExceptions)
      .where(eq(schedulingAvailabilityExceptions.userId, userId))
      .orderBy(asc(schedulingAvailabilityExceptions.exceptionDate), asc(schedulingAvailabilityExceptions.startTime)),
    db
      .select()
      .from(schedulingBookings)
      .where(eq(schedulingBookings.hostUserId, userId))
      .orderBy(desc(schedulingBookings.startAt))
      .limit(50),
    db
      .select({
        calendarId: googleCalendarSources.calendarId,
        calendarName: googleCalendarSources.calendarName,
        isPrimary: googleCalendarSources.isPrimary,
        visibleInF10: googleCalendarSources.visibleInF10,
        blocksScheduling: googleCalendarSources.blocksScheduling,
        accessRole: googleCalendarSources.accessRole,
      })
      .from(googleCalendarSources)
      .where(eq(googleCalendarSources.userId, userId))
      .orderBy(desc(googleCalendarSources.isPrimary), asc(googleCalendarSources.calendarName)),
    db
      .select({ userId: googleCalendarConnections.userId })
      .from(googleCalendarConnections)
      .where(eq(googleCalendarConnections.userId, userId))
      .limit(1),
  ]);

  return {
    host,
    profile,
    windows,
    exceptions,
    bookings,
    sources,
    googleConnected: connection.length > 0,
  };
}

export async function savePersonalSchedulingSettings(
  actorUserId: string,
  userId: string,
  input: PersonalSchedulingSettingsInput,
): Promise<void> {
  await ensurePersonalSchedulingProfile(userId);
  const db = getDatabase();
  const weekdays = Array.from(new Set(input.windows.map((window) => window.weekday))).sort(
    (left, right) => left - right,
  ) as SchedulingWeekday[];
  const firstWindow = [...input.windows].sort(
    (left, right) => left.weekday - right.weekday || left.startTime.localeCompare(right.startTime),
  )[0];

  await db.transaction(async (tx) => {
    await tx
      .update(schedulingAvailabilityProfiles)
      .set({
        timeZone: input.timeZone,
        weekdays,
        startTime: firstWindow?.startTime ?? "08:00",
        endTime: firstWindow?.endTime ?? "18:00",
        slotStepMinutes: input.slotStepMinutes,
        minimumNoticeMinutes: input.minimumNoticeMinutes,
        bufferBeforeMinutes: input.bufferBeforeMinutes,
        bufferAfterMinutes: input.bufferAfterMinutes,
        maxHorizonDays: input.maxHorizonDays,
        defaultDurationMinutes: input.defaultDurationMinutes,
        publicEnabled: input.publicEnabled,
        publicTitle: input.publicTitle,
        publicDescription: input.publicDescription,
        addGoogleMeet: input.addGoogleMeet,
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(schedulingAvailabilityProfiles.userId, userId));

    await tx
      .delete(schedulingAvailabilityWindows)
      .where(eq(schedulingAvailabilityWindows.userId, userId));

    if (input.windows.length > 0) {
      await tx.insert(schedulingAvailabilityWindows).values(
        input.windows.map((window, index) => ({
          userId,
          weekday: window.weekday,
          startTime: window.startTime,
          endTime: window.endTime,
          sortOrder: index,
        })),
      );
    }
  });
}

export async function addPersonalSchedulingException(
  userId: string,
  input: {
    exceptionDate: string;
    available: boolean;
    startTime: string | null;
    endTime: string | null;
  },
): Promise<void> {
  const db = getDatabase();
  await db.transaction(async (tx) => {
    if (!input.available) {
      await tx
        .delete(schedulingAvailabilityExceptions)
        .where(
          and(
            eq(schedulingAvailabilityExceptions.userId, userId),
            eq(schedulingAvailabilityExceptions.exceptionDate, input.exceptionDate),
          ),
        );
    } else {
      await tx
        .delete(schedulingAvailabilityExceptions)
        .where(
          and(
            eq(schedulingAvailabilityExceptions.userId, userId),
            eq(schedulingAvailabilityExceptions.exceptionDate, input.exceptionDate),
            eq(schedulingAvailabilityExceptions.available, false),
          ),
        );
    }

    await tx.insert(schedulingAvailabilityExceptions).values({
      userId,
      exceptionDate: input.exceptionDate,
      available: input.available,
      startTime: input.startTime,
      endTime: input.endTime,
    });
  });
}

export async function deletePersonalSchedulingException(
  userId: string,
  exceptionId: string,
): Promise<boolean> {
  const [deleted] = await getDatabase()
    .delete(schedulingAvailabilityExceptions)
    .where(
      and(
        eq(schedulingAvailabilityExceptions.id, exceptionId),
        eq(schedulingAvailabilityExceptions.userId, userId),
      ),
    )
    .returning({ id: schedulingAvailabilityExceptions.id });
  return Boolean(deleted);
}

export async function setSchedulingBlockingCalendars(
  userId: string,
  calendarIds: string[],
): Promise<void> {
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx
      .update(googleCalendarSources)
      .set({ blocksScheduling: false, updatedAt: new Date() })
      .where(eq(googleCalendarSources.userId, userId));
    if (calendarIds.length > 0) {
      await tx
        .update(googleCalendarSources)
        .set({ blocksScheduling: true, updatedAt: new Date() })
        .where(
          and(
            eq(googleCalendarSources.userId, userId),
            inArray(googleCalendarSources.calendarId, calendarIds),
          ),
        );
    }
  });
}

export async function getPublicPersonalSchedule(publicSlug: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      userId: users.id,
      hostName: users.name,
      hostEmail: users.email,
      timeZone: schedulingAvailabilityProfiles.timeZone,
      slotStepMinutes: schedulingAvailabilityProfiles.slotStepMinutes,
      minimumNoticeMinutes: schedulingAvailabilityProfiles.minimumNoticeMinutes,
      bufferBeforeMinutes: schedulingAvailabilityProfiles.bufferBeforeMinutes,
      bufferAfterMinutes: schedulingAvailabilityProfiles.bufferAfterMinutes,
      maxHorizonDays: schedulingAvailabilityProfiles.maxHorizonDays,
      durationMinutes: schedulingAvailabilityProfiles.defaultDurationMinutes,
      publicSlug: schedulingAvailabilityProfiles.publicSlug,
      publicEnabled: schedulingAvailabilityProfiles.publicEnabled,
      publicTitle: schedulingAvailabilityProfiles.publicTitle,
      publicDescription: schedulingAvailabilityProfiles.publicDescription,
      addGoogleMeet: schedulingAvailabilityProfiles.addGoogleMeet,
    })
    .from(schedulingAvailabilityProfiles)
    .innerJoin(users, eq(users.id, schedulingAvailabilityProfiles.userId))
    .where(
      and(
        eq(schedulingAvailabilityProfiles.publicSlug, publicSlug),
        eq(schedulingAvailabilityProfiles.publicEnabled, true),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  if (!row) return null;

  const startDate = instantToZonedParts(new Date(), row.timeZone).date;
  const broadEnd = addDateKeyDays(startDate, row.maxHorizonDays + 2);

  const [windows, exceptions] = await Promise.all([
    db
      .select({
        weekday: schedulingAvailabilityWindows.weekday,
        startTime: schedulingAvailabilityWindows.startTime,
        endTime: schedulingAvailabilityWindows.endTime,
      })
      .from(schedulingAvailabilityWindows)
      .where(eq(schedulingAvailabilityWindows.userId, row.userId))
      .orderBy(
        asc(schedulingAvailabilityWindows.weekday),
        asc(schedulingAvailabilityWindows.sortOrder),
        asc(schedulingAvailabilityWindows.startTime),
      ),
    db
      .select({
        id: schedulingAvailabilityExceptions.id,
        exceptionDate: schedulingAvailabilityExceptions.exceptionDate,
        available: schedulingAvailabilityExceptions.available,
        startTime: schedulingAvailabilityExceptions.startTime,
        endTime: schedulingAvailabilityExceptions.endTime,
      })
      .from(schedulingAvailabilityExceptions)
      .where(
        and(
          eq(schedulingAvailabilityExceptions.userId, row.userId),
          sql`${schedulingAvailabilityExceptions.exceptionDate} >= ${startDate}`,
          sql`${schedulingAvailabilityExceptions.exceptionDate} <= ${broadEnd}`,
        ),
      )
      .orderBy(asc(schedulingAvailabilityExceptions.exceptionDate), asc(schedulingAvailabilityExceptions.startTime)),
  ]);

  return { ...row, windows, exceptions };
}

export async function listPersonalSchedulingReservations(
  hostUserId: string,
  rangeStart: Date,
  rangeEnd: Date,
  excludeBookingId?: string,
) {
  const db = getDatabase();
  const bookingCondition = and(
    eq(schedulingBookings.hostUserId, hostUserId),
    or(
      eq(schedulingBookings.status, "booked"),
      and(
        eq(schedulingBookings.status, "booking"),
        gt(
          schedulingBookings.bookingStartedAt,
          new Date(Date.now() - BOOKING_CLAIM_TIMEOUT_MS),
        ),
      ),
    ),
    lt(schedulingBookings.startAt, rangeEnd),
    gt(schedulingBookings.endAt, rangeStart),
  );

  const bookings = await db
    .select({
      id: schedulingBookings.id,
      startAt: schedulingBookings.startAt,
      endAt: schedulingBookings.endAt,
      bufferBeforeMinutes: schedulingBookings.bufferBeforeMinutes,
      bufferAfterMinutes: schedulingBookings.bufferAfterMinutes,
    })
    .from(schedulingBookings)
    .where(
      excludeBookingId
        ? and(bookingCondition, sql`${schedulingBookings.id} <> ${excludeBookingId}`)
        : bookingCondition,
    );

  const legacy = await db
    .select({
      id: schedulingInvitations.id,
      startAt: schedulingInvitations.selectedStartAt,
      endAt: schedulingInvitations.selectedEndAt,
      bufferBeforeMinutes: schedulingInvitations.bufferBeforeMinutes,
      bufferAfterMinutes: schedulingInvitations.bufferAfterMinutes,
    })
    .from(schedulingInvitations)
    .where(
      and(
        eq(schedulingInvitations.hostUserId, hostUserId),
        or(
          eq(schedulingInvitations.status, "booked"),
          and(
            eq(schedulingInvitations.status, "booking"),
            isNotNull(schedulingInvitations.bookingStartedAt),
            gt(
              schedulingInvitations.bookingStartedAt,
              new Date(Date.now() - BOOKING_CLAIM_TIMEOUT_MS),
            ),
          ),
        ),
        isNotNull(schedulingInvitations.selectedStartAt),
        isNotNull(schedulingInvitations.selectedEndAt),
        lt(schedulingInvitations.selectedStartAt, rangeEnd),
        gt(schedulingInvitations.selectedEndAt, rangeStart),
      ),
    );

  return [...bookings, ...legacy];
}

function intervalsConflict(
  candidateStart: Date,
  candidateEnd: Date,
  candidateBufferBefore: number,
  candidateBufferAfter: number,
  reservation: {
    startAt: Date | null;
    endAt: Date | null;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  },
): boolean {
  if (!reservation.startAt || !reservation.endAt) return false;
  const candidateBusyStart = candidateStart.getTime() - candidateBufferBefore * 60_000;
  const candidateBusyEnd = candidateEnd.getTime() + candidateBufferAfter * 60_000;
  const reservationBusyStart = reservation.startAt.getTime() - reservation.bufferBeforeMinutes * 60_000;
  const reservationBusyEnd = reservation.endAt.getTime() + reservation.bufferAfterMinutes * 60_000;
  return candidateBusyStart < reservationBusyEnd && candidateBusyEnd > reservationBusyStart;
}

export async function claimPersonalSchedulingBooking(input: {
  hostUserId: string;
  customerContactId: string;
  customerName: string;
  customerEmail: string;
  groupId: number | null;
  groupName: string | null;
  unitId: number | null;
  unitName: string | null;
  notes: string;
  startAt: Date;
  endAt: Date;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.hostUserId}))`);

    const now = new Date();
    const staleBefore = new Date(now.getTime() - BOOKING_CLAIM_TIMEOUT_MS);
    await tx
      .update(schedulingBookings)
      .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
      .where(
        and(
          eq(schedulingBookings.hostUserId, input.hostUserId),
          eq(schedulingBookings.status, "booking"),
          lt(schedulingBookings.bookingStartedAt, staleBefore),
        ),
      );

    const nearbyStart = new Date(input.startAt.getTime() - (input.bufferBeforeMinutes + 240) * 60_000);
    const nearbyEnd = new Date(input.endAt.getTime() + (input.bufferAfterMinutes + 240) * 60_000);
    const bookingRows = await tx
      .select({
        startAt: schedulingBookings.startAt,
        endAt: schedulingBookings.endAt,
        bufferBeforeMinutes: schedulingBookings.bufferBeforeMinutes,
        bufferAfterMinutes: schedulingBookings.bufferAfterMinutes,
      })
      .from(schedulingBookings)
      .where(
        and(
          eq(schedulingBookings.hostUserId, input.hostUserId),
          inArray(schedulingBookings.status, ["booking", "booked"]),
          lt(schedulingBookings.startAt, nearbyEnd),
          gt(schedulingBookings.endAt, nearbyStart),
        ),
      );

    const legacyRows = await tx
      .select({
        startAt: schedulingInvitations.selectedStartAt,
        endAt: schedulingInvitations.selectedEndAt,
        bufferBeforeMinutes: schedulingInvitations.bufferBeforeMinutes,
        bufferAfterMinutes: schedulingInvitations.bufferAfterMinutes,
      })
      .from(schedulingInvitations)
      .where(
        and(
          eq(schedulingInvitations.hostUserId, input.hostUserId),
          or(
            eq(schedulingInvitations.status, "booked"),
            and(
              eq(schedulingInvitations.status, "booking"),
              isNotNull(schedulingInvitations.bookingStartedAt),
              gt(
                schedulingInvitations.bookingStartedAt,
                new Date(Date.now() - BOOKING_CLAIM_TIMEOUT_MS),
              ),
            ),
          ),
          isNotNull(schedulingInvitations.selectedStartAt),
          isNotNull(schedulingInvitations.selectedEndAt),
          lt(schedulingInvitations.selectedStartAt, nearbyEnd),
          gt(schedulingInvitations.selectedEndAt, nearbyStart),
        ),
      );

    if (
      [...bookingRows, ...legacyRows].some((reservation) =>
        intervalsConflict(
          input.startAt,
          input.endAt,
          input.bufferBeforeMinutes,
          input.bufferAfterMinutes,
          reservation,
        ),
      )
    ) {
      return null;
    }

    const [created] = await tx
      .insert(schedulingBookings)
      .values({
        hostUserId: input.hostUserId,
        customerContactId: input.customerContactId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        groupId: input.groupId,
        groupName: input.groupName,
        unitId: input.unitId,
        unitName: input.unitName,
        notes: input.notes,
        startAt: input.startAt,
        endAt: input.endAt,
        bufferBeforeMinutes: input.bufferBeforeMinutes,
        bufferAfterMinutes: input.bufferAfterMinutes,
        status: "booking",
        bookingStartedAt: now,
      })
      .returning();
    return created ?? null;
  });
}

export async function completePersonalSchedulingBooking(
  bookingId: string,
  google: {
    calendarId: string;
    eventId: string;
    iCalUid: string | null;
    meetUrl: string | null;
  },
) {
  const [updated] = await getDatabase()
    .update(schedulingBookings)
    .set({
      status: "booked",
      bookedAt: new Date(),
      googleCalendarId: google.calendarId,
      googleEventId: google.eventId,
      googleIcalUid: google.iCalUid,
      googleMeetUrl: google.meetUrl,
      updatedAt: new Date(),
    })
    .where(and(eq(schedulingBookings.id, bookingId), eq(schedulingBookings.status, "booking")))
    .returning();
  if (!updated) throw new Error("SCHEDULING_BOOKING_STATE_CHANGED");
  return updated;
}

export async function cancelPersonalSchedulingClaim(bookingId: string): Promise<void> {
  const now = new Date();
  await getDatabase()
    .update(schedulingBookings)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
    .where(and(eq(schedulingBookings.id, bookingId), eq(schedulingBookings.status, "booking")));
}

export async function listPersonalSchedulingBookings(
  hostUserId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  return getDatabase()
    .select({
      id: schedulingBookings.id,
      customerName: schedulingBookings.customerName,
      notes: schedulingBookings.notes,
      startAt: schedulingBookings.startAt,
      endAt: schedulingBookings.endAt,
      status: schedulingBookings.status,
      googleMeetUrl: schedulingBookings.googleMeetUrl,
      googleEventId: schedulingBookings.googleEventId,
    })
    .from(schedulingBookings)
    .where(
      and(
        eq(schedulingBookings.hostUserId, hostUserId),
        eq(schedulingBookings.status, "booked"),
        lt(schedulingBookings.startAt, rangeEnd),
        gt(schedulingBookings.endAt, rangeStart),
      ),
    )
    .orderBy(asc(schedulingBookings.startAt));
}
