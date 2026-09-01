import { createHash } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  or,
  sql,
} from "drizzle-orm";
import {
  lockSchedulingUsers,
  schedulingIntervalsConflict,
  SCHEDULING_BOOKING_CLAIM_TIMEOUT_MS,
  SCHEDULING_MAX_BUFFER_MINUTES,
} from "$lib/server/calendar/schedulingConcurrency";
import { getDatabase } from "$lib/server/db";
import { googleCalendarConnections } from "$lib/server/db/googleCalendarSchema";
import {
  schedulingAvailabilityProfiles,
  schedulingEventParticipants,
  schedulingEvents,
  schedulingInvitations,
  schedulingRateLimits,
  type SchedulingWeekday,
} from "$lib/server/db/schedulingSchema";
import { teamMembers, users } from "$lib/server/db/schema";
import { customerContacts, customerOrganizations } from "$lib/server/db/supportSchema";

export type SchedulingAvailabilityProfile = {
  userId: string;
  timeZone: string;
  weekdays: SchedulingWeekday[];
  startTime: string;
  endTime: string;
  slotStepMinutes: number;
  minimumNoticeMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  maxHorizonDays: number;
  defaultDurationMinutes: number;
  source: "default" | "user";
};

export const DEFAULT_SCHEDULING_AVAILABILITY: Omit<
  SchedulingAvailabilityProfile,
  "userId" | "source"
> = {
  timeZone: "America/Sao_Paulo",
  weekdays: [1, 2, 3, 4, 5],
  startTime: "08:00",
  endTime: "18:00",
  slotStepMinutes: 30,
  minimumNoticeMinutes: 120,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  maxHorizonDays: 30,
  defaultDurationMinutes: 30,
};

export type SchedulingInvitationRow = typeof schedulingInvitations.$inferSelect;

export async function listSchedulingTeamUserIds(actorUserId: string): Promise<string[]> {
  const db = getDatabase();
  const memberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, actorUserId));

  if (memberships.length === 0) return [actorUserId];
  const teamIds = Array.from(new Set(memberships.map((membership) => membership.teamId)));
  const members = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(inArray(teamMembers.teamId, teamIds));

  return Array.from(new Set([actorUserId, ...members.map((member) => member.userId)]));
}

export async function getSchedulingAvailabilityProfile(
  userId: string,
): Promise<SchedulingAvailabilityProfile> {
  const db = getDatabase();
  const [profile] = await db
    .select()
    .from(schedulingAvailabilityProfiles)
    .where(eq(schedulingAvailabilityProfiles.userId, userId))
    .limit(1);

  if (!profile) {
    return {
      userId,
      ...DEFAULT_SCHEDULING_AVAILABILITY,
      source: "default",
    };
  }

  return {
    userId,
    timeZone: profile.timeZone,
    weekdays: profile.weekdays,
    startTime: profile.startTime,
    endTime: profile.endTime,
    slotStepMinutes: profile.slotStepMinutes,
    minimumNoticeMinutes: profile.minimumNoticeMinutes,
    bufferBeforeMinutes: profile.bufferBeforeMinutes,
    bufferAfterMinutes: profile.bufferAfterMinutes,
    maxHorizonDays: profile.maxHorizonDays,
    defaultDurationMinutes: profile.defaultDurationMinutes,
    source: "user",
  };
}

export async function saveSchedulingAvailabilityProfile(
  actorUserId: string,
  profile: Omit<SchedulingAvailabilityProfile, "source">,
): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  await db
    .insert(schedulingAvailabilityProfiles)
    .values({
      userId: profile.userId,
      timeZone: profile.timeZone,
      weekdays: profile.weekdays,
      startTime: profile.startTime,
      endTime: profile.endTime,
      slotStepMinutes: profile.slotStepMinutes,
      minimumNoticeMinutes: profile.minimumNoticeMinutes,
      bufferBeforeMinutes: profile.bufferBeforeMinutes,
      bufferAfterMinutes: profile.bufferAfterMinutes,
      maxHorizonDays: profile.maxHorizonDays,
      defaultDurationMinutes: profile.defaultDurationMinutes,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schedulingAvailabilityProfiles.userId,
      set: {
        timeZone: profile.timeZone,
        weekdays: profile.weekdays,
        startTime: profile.startTime,
        endTime: profile.endTime,
        slotStepMinutes: profile.slotStepMinutes,
        minimumNoticeMinutes: profile.minimumNoticeMinutes,
        bufferBeforeMinutes: profile.bufferBeforeMinutes,
        bufferAfterMinutes: profile.bufferAfterMinutes,
        maxHorizonDays: profile.maxHorizonDays,
        defaultDurationMinutes: profile.defaultDurationMinutes,
        updatedBy: actorUserId,
        updatedAt: now,
      },
    });
}

export async function listSchedulingHosts() {
  const db = getDatabase();
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      googleConnectedUserId: googleCalendarConnections.userId,
      profileUserId: schedulingAvailabilityProfiles.userId,
      profileTimeZone: schedulingAvailabilityProfiles.timeZone,
      profileWeekdays: schedulingAvailabilityProfiles.weekdays,
      profileStartTime: schedulingAvailabilityProfiles.startTime,
      profileEndTime: schedulingAvailabilityProfiles.endTime,
      profileSlotStepMinutes: schedulingAvailabilityProfiles.slotStepMinutes,
      profileMinimumNoticeMinutes: schedulingAvailabilityProfiles.minimumNoticeMinutes,
      profileBufferBeforeMinutes: schedulingAvailabilityProfiles.bufferBeforeMinutes,
      profileBufferAfterMinutes: schedulingAvailabilityProfiles.bufferAfterMinutes,
      profileMaxHorizonDays: schedulingAvailabilityProfiles.maxHorizonDays,
      profileDefaultDurationMinutes: schedulingAvailabilityProfiles.defaultDurationMinutes,
    })
    .from(users)
    .leftJoin(googleCalendarConnections, eq(googleCalendarConnections.userId, users.id))
    .leftJoin(schedulingAvailabilityProfiles, eq(schedulingAvailabilityProfiles.userId, users.id))
    .where(eq(users.status, "active"))
    .orderBy(asc(users.name));
}

export async function getSchedulingHost(userId: string) {
  const db = getDatabase();
  const [host] = await db
    .select({ id: users.id, name: users.name, email: users.email, status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return host ?? null;
}

export async function listSchedulingCustomers() {
  const db = getDatabase();
  return db
    .select({
      id: customerContacts.id,
      name: customerContacts.name,
      email: customerContacts.email,
      organizationName: customerOrganizations.name,
    })
    .from(customerContacts)
    .leftJoin(customerOrganizations, eq(customerContacts.organizationId, customerOrganizations.id))
    .where(and(eq(customerContacts.active, true), isNotNull(customerContacts.email)))
    .orderBy(asc(customerContacts.name))
    .limit(1000);
}

export async function getSchedulingCustomer(customerContactId: string) {
  const db = getDatabase();
  const [customer] = await db
    .select({
      id: customerContacts.id,
      name: customerContacts.name,
      email: customerContacts.email,
      active: customerContacts.active,
    })
    .from(customerContacts)
    .where(eq(customerContacts.id, customerContactId))
    .limit(1);
  return customer ?? null;
}

export async function createSchedulingInvitation(
  values: typeof schedulingInvitations.$inferInsert,
): Promise<SchedulingInvitationRow> {
  const db = getDatabase();
  const [created] = await db
    .insert(schedulingInvitations)
    .values(values)
    .returning();
  if (!created) throw new Error("SCHEDULING_INVITATION_NOT_CREATED");
  return created;
}

export async function listSchedulingInvitations(
  actorUserId: string,
  visibility: "own" | "team" | "all",
  teamUserIds: string[] = [],
) {
  const db = getDatabase();
  const now = new Date();
  await db
    .update(schedulingInvitations)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        inArray(schedulingInvitations.status, ["draft", "sent", "opened"]),
        lte(schedulingInvitations.expiresAt, now),
      ),
    );

  const query = db
    .select({
      id: schedulingInvitations.id,
      title: schedulingInvitations.title,
      customerName: schedulingInvitations.customerName,
      customerEmail: schedulingInvitations.customerEmail,
      hostUserId: schedulingInvitations.hostUserId,
      hostName: users.name,
      durationMinutes: schedulingInvitations.durationMinutes,
      timeZone: schedulingInvitations.timeZone,
      dateRangeStart: schedulingInvitations.dateRangeStart,
      dateRangeEnd: schedulingInvitations.dateRangeEnd,
      addGoogleMeet: schedulingInvitations.addGoogleMeet,
      status: schedulingInvitations.status,
      expiresAt: schedulingInvitations.expiresAt,
      selectedStartAt: schedulingInvitations.selectedStartAt,
      selectedEndAt: schedulingInvitations.selectedEndAt,
      googleMeetUrl: schedulingInvitations.googleMeetUrl,
      createdByUserId: schedulingInvitations.createdByUserId,
      createdAt: schedulingInvitations.createdAt,
    })
    .from(schedulingInvitations)
    .innerJoin(users, eq(users.id, schedulingInvitations.hostUserId))
    .orderBy(desc(schedulingInvitations.createdAt))
    .limit(200);

  if (visibility === "all") return query;
  const visibleUserIds = visibility === "team"
    ? Array.from(new Set([actorUserId, ...teamUserIds]))
    : [actorUserId];
  return query.where(
    or(
      inArray(schedulingInvitations.createdByUserId, visibleUserIds),
      inArray(schedulingInvitations.hostUserId, visibleUserIds),
    ),
  );
}

export async function getSchedulingInvitationByTokenHash(
  tokenHash: string,
): Promise<SchedulingInvitationRow | null> {
  const db = getDatabase();
  const [invitation] = await db
    .select()
    .from(schedulingInvitations)
    .where(eq(schedulingInvitations.tokenHash, tokenHash))
    .limit(1);
  return invitation ?? null;
}

export async function markSchedulingInvitationOpened(id: string): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  await db
    .update(schedulingInvitations)
    .set({ status: "opened", openedAt: now, updatedAt: now })
    .where(and(eq(schedulingInvitations.id, id), eq(schedulingInvitations.status, "sent")));
}

export async function markSchedulingInvitationExpired(id: string): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  await db
    .update(schedulingInvitations)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(schedulingInvitations.id, id),
        inArray(schedulingInvitations.status, ["draft", "sent", "opened"]),
      ),
    );
}

export async function revokeSchedulingInvitation(
  id: string,
  actorUserId: string,
  canManageAll: boolean,
): Promise<boolean> {
  const db = getDatabase();
  const now = new Date();
  const condition = canManageAll
    ? eq(schedulingInvitations.id, id)
    : and(
        eq(schedulingInvitations.id, id),
        eq(schedulingInvitations.createdByUserId, actorUserId),
      );
  const [updated] = await db
    .update(schedulingInvitations)
    .set({ status: "revoked", updatedAt: now })
    .where(
      and(
        condition,
        inArray(schedulingInvitations.status, ["draft", "sent", "opened"]),
      ),
    )
    .returning({ id: schedulingInvitations.id });
  return Boolean(updated);
}

export async function listSchedulingReservations(
  hostUserId: string,
  rangeStart: Date,
  rangeEnd: Date,
  excludeInvitationId?: string,
) {
  const db = getDatabase();
  const base = and(
    eq(schedulingInvitations.hostUserId, hostUserId),
    or(
      eq(schedulingInvitations.status, "booked"),
      and(
        eq(schedulingInvitations.status, "booking"),
        isNotNull(schedulingInvitations.bookingStartedAt),
        gt(
          schedulingInvitations.bookingStartedAt,
          new Date(Date.now() - SCHEDULING_BOOKING_CLAIM_TIMEOUT_MS),
        ),
      ),
    ),
    isNotNull(schedulingInvitations.selectedStartAt),
    isNotNull(schedulingInvitations.selectedEndAt),
    lt(schedulingInvitations.selectedStartAt, rangeEnd),
    gt(schedulingInvitations.selectedEndAt, rangeStart),
  );
  const condition = excludeInvitationId
    ? and(base, sql`${schedulingInvitations.id} <> ${excludeInvitationId}`)
    : base;

  return db
    .select({
      id: schedulingInvitations.id,
      startAt: schedulingInvitations.selectedStartAt,
      endAt: schedulingInvitations.selectedEndAt,
      bufferBeforeMinutes: schedulingInvitations.bufferBeforeMinutes,
      bufferAfterMinutes: schedulingInvitations.bufferAfterMinutes,
    })
    .from(schedulingInvitations)
    .where(condition);
}

export async function recoverStaleSchedulingReservation(id: string): Promise<boolean> {
  const db = getDatabase();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - SCHEDULING_BOOKING_CLAIM_TIMEOUT_MS);
  const [recovered] = await db
    .update(schedulingInvitations)
    .set({
      status: "opened",
      bookingStartedAt: null,
      selectedStartAt: null,
      selectedEndAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(schedulingInvitations.id, id),
        eq(schedulingInvitations.status, "booking"),
        or(
          isNull(schedulingInvitations.bookingStartedAt),
          lt(schedulingInvitations.bookingStartedAt, staleBefore),
        ),
      ),
    )
    .returning({ id: schedulingInvitations.id });
  return Boolean(recovered);
}

export async function claimSchedulingReservation(
  invitation: SchedulingInvitationRow,
  startAt: Date,
  endAt: Date,
): Promise<"claimed" | "unavailable" | "invalid_state"> {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    await lockSchedulingUsers((query) => tx.execute(query), [invitation.hostUserId]);

    const now = new Date();
    const staleBefore = new Date(now.getTime() - SCHEDULING_BOOKING_CLAIM_TIMEOUT_MS);
    await tx
      .update(schedulingInvitations)
      .set({
        status: "opened",
        bookingStartedAt: null,
        selectedStartAt: null,
        selectedEndAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(schedulingInvitations.hostUserId, invitation.hostUserId),
          eq(schedulingInvitations.status, "booking"),
          isNotNull(schedulingInvitations.bookingStartedAt),
          lt(schedulingInvitations.bookingStartedAt, staleBefore),
        ),
      );

    const [current] = await tx
      .select({
        status: schedulingInvitations.status,
        expiresAt: schedulingInvitations.expiresAt,
      })
      .from(schedulingInvitations)
      .where(eq(schedulingInvitations.id, invitation.id))
      .limit(1);

    if (!current || !["sent", "opened"].includes(current.status) || current.expiresAt.getTime() <= Date.now()) {
      return "invalid_state";
    }

    const candidateBusyStart = new Date(
      startAt.getTime() - invitation.bufferBeforeMinutes * 60_000,
    );
    const candidateBusyEnd = new Date(
      endAt.getTime() + invitation.bufferAfterMinutes * 60_000,
    );
    const [eventConflict] = await tx
      .select({ id: schedulingEvents.id })
      .from(schedulingEvents)
      .leftJoin(
        schedulingEventParticipants,
        eq(schedulingEventParticipants.eventId, schedulingEvents.id),
      )
      .where(
        and(
          eq(schedulingEvents.status, "confirmed"),
          lt(schedulingEvents.startsAt, candidateBusyEnd),
          gt(schedulingEvents.endsAt, candidateBusyStart),
          or(
            eq(schedulingEvents.organizerUserId, invitation.hostUserId),
            eq(schedulingEventParticipants.userId, invitation.hostUserId),
          ),
        ),
      )
      .limit(1);

    if (eventConflict) return "unavailable";

    const nearbyStart = new Date(
      startAt.getTime()
        - (invitation.bufferBeforeMinutes + SCHEDULING_MAX_BUFFER_MINUTES) * 60_000,
    );
    const nearbyEnd = new Date(
      endAt.getTime()
        + (invitation.bufferAfterMinutes + SCHEDULING_MAX_BUFFER_MINUTES) * 60_000,
    );
    const reservations = await tx
      .select({
        startAt: schedulingInvitations.selectedStartAt,
        endAt: schedulingInvitations.selectedEndAt,
        bufferBeforeMinutes: schedulingInvitations.bufferBeforeMinutes,
        bufferAfterMinutes: schedulingInvitations.bufferAfterMinutes,
      })
      .from(schedulingInvitations)
      .where(
        and(
          eq(schedulingInvitations.hostUserId, invitation.hostUserId),
          inArray(schedulingInvitations.status, ["booking", "booked"]),
          isNotNull(schedulingInvitations.selectedStartAt),
          isNotNull(schedulingInvitations.selectedEndAt),
          lt(schedulingInvitations.selectedStartAt, nearbyEnd),
          gt(schedulingInvitations.selectedEndAt, nearbyStart),
          sql`${schedulingInvitations.id} <> ${invitation.id}`,
        ),
      );

    if (
      reservations.some((reservation) =>
        schedulingIntervalsConflict(
          startAt,
          endAt,
          invitation.bufferBeforeMinutes,
          invitation.bufferAfterMinutes,
          reservation,
        ),
      )
    ) {
      return "unavailable";
    }

    const [claimed] = await tx
      .update(schedulingInvitations)
      .set({
        status: "booking",
        bookingStartedAt: now,
        selectedStartAt: startAt,
        selectedEndAt: endAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(schedulingInvitations.id, invitation.id),
          inArray(schedulingInvitations.status, ["sent", "opened"]),
        ),
      )
      .returning({ id: schedulingInvitations.id });

    return claimed ? "claimed" : "invalid_state";
  });
}

export async function releaseSchedulingReservation(id: string): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  await db
    .update(schedulingInvitations)
    .set({
      status: "opened",
      bookingStartedAt: null,
      selectedStartAt: null,
      selectedEndAt: null,
      updatedAt: now,
    })
    .where(and(eq(schedulingInvitations.id, id), eq(schedulingInvitations.status, "booking")));
}

export async function completeSchedulingReservation(
  id: string,
  google: {
    eventId: string;
    iCalUid: string | null;
    meetUrl: string | null;
  },
): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  const [updated] = await db
    .update(schedulingInvitations)
    .set({
      status: "booked",
      bookedAt: now,
      googleEventId: google.eventId,
      googleIcalUid: google.iCalUid,
      googleMeetUrl: google.meetUrl,
      updatedAt: now,
    })
    .where(and(eq(schedulingInvitations.id, id), eq(schedulingInvitations.status, "booking")))
    .returning({ id: schedulingInvitations.id });
  if (!updated) throw new Error("SCHEDULING_BOOKING_STATE_CHANGED");
}

export async function enforceSchedulingRateLimit(
  rawKey: string,
  maxRequests: number,
  windowMs: number,
): Promise<void> {
  const db = getDatabase();
  const key = createHash("sha256").update(rawKey).digest("hex");
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`);
    const [current] = await tx
      .select()
      .from(schedulingRateLimits)
      .where(eq(schedulingRateLimits.key, key))
      .limit(1);

    if (!current || now.getTime() - current.windowStartedAt.getTime() >= windowMs) {
      await tx
        .insert(schedulingRateLimits)
        .values({ key, windowStartedAt: now, requestCount: 1, updatedAt: now })
        .onConflictDoUpdate({
          target: schedulingRateLimits.key,
          set: { windowStartedAt: now, requestCount: 1, updatedAt: now },
        });
      return;
    }

    if (current.requestCount >= maxRequests) {
      throw new Error("SCHEDULING_RATE_LIMIT");
    }

    await tx
      .update(schedulingRateLimits)
      .set({ requestCount: current.requestCount + 1, updatedAt: now })
      .where(eq(schedulingRateLimits.key, key));
  });
}
