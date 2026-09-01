import { and, asc, eq, gt, inArray, lt, or } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  schedulingEventGoogleCalendarLinks,
  schedulingEventParticipants,
  schedulingEvents,
  schedulingInvitations,
} from "$lib/server/db/schedulingSchema";
import { users } from "$lib/server/db/schema";

export type SchedulingEventRow = typeof schedulingEvents.$inferSelect;
export type SchedulingEventParticipantRow = typeof schedulingEventParticipants.$inferSelect;

export type SchedulingEventParticipantInput = {
  kind: "internal" | "external";
  userId?: string | null;
  customerContactId?: string | null;
  name: string;
  email: string;
};

export type CreateSchedulingEventRepositoryInput = {
  organizerUserId: string;
  createdByUserId: string | null;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  ticketId?: string | null;
  taskId?: string | null;
  groupId?: number | null;
  groupName?: string | null;
  unitId?: number | null;
  unitName?: string | null;
  participants: SchedulingEventParticipantInput[];
};

export async function createSchedulingEvent(
  input: CreateSchedulingEventRepositoryInput,
): Promise<SchedulingEventRow> {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [event] = await tx
      .insert(schedulingEvents)
      .values({
        organizerUserId: input.organizerUserId,
        createdByUserId: input.createdByUserId,
        title: input.title,
        description: input.description,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timeZone: input.timeZone,
        ticketId: input.ticketId ?? null,
        taskId: input.taskId ?? null,
        groupId: input.groupId ?? null,
        groupName: input.groupName ?? null,
        unitId: input.unitId ?? null,
        unitName: input.unitName ?? null,
      })
      .returning();
    if (!event) throw new Error("SCHEDULING_EVENT_NOT_CREATED");

    if (input.participants.length > 0) {
      await tx.insert(schedulingEventParticipants).values(
        input.participants.map((participant) => ({
          eventId: event.id,
          kind: participant.kind,
          userId: participant.userId ?? null,
          customerContactId: participant.customerContactId ?? null,
          name: participant.name,
          email: participant.email,
        })),
      );
    }

    return event;
  });
}

export async function getSchedulingEvent(eventId: string): Promise<SchedulingEventRow | null> {
  const db = getDatabase();
  const [event] = await db
    .select()
    .from(schedulingEvents)
    .where(eq(schedulingEvents.id, eventId))
    .limit(1);
  return event ?? null;
}

export async function listSchedulingEventParticipants(
  eventId: string,
): Promise<SchedulingEventParticipantRow[]> {
  const db = getDatabase();
  return db
    .select()
    .from(schedulingEventParticipants)
    .where(eq(schedulingEventParticipants.eventId, eventId))
    .orderBy(asc(schedulingEventParticipants.createdAt));
}

export async function listSchedulingEvents(input: {
  visibleUserIds: string[];
  startsBefore: Date;
  endsAfter: Date;
}) {
  if (input.visibleUserIds.length === 0) return [];
  const db = getDatabase();
  const rows = await db
    .select({
      id: schedulingEvents.id,
      organizerUserId: schedulingEvents.organizerUserId,
      organizerName: users.name,
      title: schedulingEvents.title,
      description: schedulingEvents.description,
      startsAt: schedulingEvents.startsAt,
      endsAt: schedulingEvents.endsAt,
      timeZone: schedulingEvents.timeZone,
      status: schedulingEvents.status,
      ticketId: schedulingEvents.ticketId,
      taskId: schedulingEvents.taskId,
      groupId: schedulingEvents.groupId,
      groupName: schedulingEvents.groupName,
      unitId: schedulingEvents.unitId,
      unitName: schedulingEvents.unitName,
      participantUserId: schedulingEventParticipants.userId,
      googleMeetUrl: schedulingEventGoogleCalendarLinks.googleMeetUrl,
    })
    .from(schedulingEvents)
    .innerJoin(users, eq(users.id, schedulingEvents.organizerUserId))
    .leftJoin(schedulingEventParticipants, eq(schedulingEventParticipants.eventId, schedulingEvents.id))
    .leftJoin(
      schedulingEventGoogleCalendarLinks,
      and(
        eq(schedulingEventGoogleCalendarLinks.eventId, schedulingEvents.id),
        eq(schedulingEventGoogleCalendarLinks.userId, schedulingEvents.organizerUserId),
      ),
    )
    .where(
      and(
        lt(schedulingEvents.startsAt, input.startsBefore),
        gt(schedulingEvents.endsAt, input.endsAfter),
        or(
          inArray(schedulingEvents.organizerUserId, input.visibleUserIds),
          inArray(schedulingEventParticipants.userId, input.visibleUserIds),
        ),
      ),
    )
    .orderBy(asc(schedulingEvents.startsAt));

  const events = new Map<string, Omit<(typeof rows)[number], "participantUserId">>();
  for (const row of rows) {
    if (events.has(row.id)) continue;
    const { participantUserId: _participantUserId, ...event } = row;
    events.set(row.id, event);
  }
  return Array.from(events.values());
}

export async function listSchedulingEventBusyIntervals(
  userId: string,
  rangeStart: Date,
  rangeEnd: Date,
  excludeEventId?: string | null,
): Promise<Array<{ eventId: string; startAt: Date; endAt: Date }>> {
  const db = getDatabase();
  const rows = await db
    .select({
      eventId: schedulingEvents.id,
      startAt: schedulingEvents.startsAt,
      endAt: schedulingEvents.endsAt,
      participantUserId: schedulingEventParticipants.userId,
    })
    .from(schedulingEvents)
    .leftJoin(schedulingEventParticipants, eq(schedulingEventParticipants.eventId, schedulingEvents.id))
    .where(
      and(
        eq(schedulingEvents.status, "confirmed"),
        lt(schedulingEvents.startsAt, rangeEnd),
        gt(schedulingEvents.endsAt, rangeStart),
        or(
          eq(schedulingEvents.organizerUserId, userId),
          eq(schedulingEventParticipants.userId, userId),
        ),
      ),
    );

  const intervals = new Map<string, { eventId: string; startAt: Date; endAt: Date }>();
  for (const row of rows) {
    if (row.eventId === excludeEventId || intervals.has(row.eventId)) continue;
    intervals.set(row.eventId, {
      eventId: row.eventId,
      startAt: row.startAt,
      endAt: row.endAt,
    });
  }
  return Array.from(intervals.values());
}

export async function cancelSchedulingEvent(eventId: string): Promise<boolean> {
  const db = getDatabase();
  const [updated] = await db
    .update(schedulingEvents)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(schedulingEvents.id, eventId), eq(schedulingEvents.status, "confirmed")))
    .returning({ id: schedulingEvents.id });
  return Boolean(updated);
}

export async function getSchedulingInternalParticipantUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  const db = getDatabase();
  return db
    .select({ id: users.id, name: users.name, email: users.email, status: users.status })
    .from(users)
    .where(inArray(users.id, userIds));
}

export async function completeSchedulingInvitationWithEvent(
  invitationId: string,
): Promise<SchedulingEventRow> {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .select()
      .from(schedulingInvitations)
      .where(eq(schedulingInvitations.id, invitationId))
      .limit(1);
    if (!invitation || invitation.status !== "booking" || !invitation.selectedStartAt || !invitation.selectedEndAt) {
      throw new Error("SCHEDULING_BOOKING_STATE_CHANGED");
    }

    const [event] = await tx
      .insert(schedulingEvents)
      .values({
        organizerUserId: invitation.hostUserId,
        createdByUserId: invitation.createdByUserId,
        title: invitation.title,
        startsAt: invitation.selectedStartAt,
        endsAt: invitation.selectedEndAt,
        timeZone: invitation.timeZone,
        ticketId: invitation.ticketId,
        taskId: invitation.taskId,
        groupId: invitation.groupId,
        groupName: invitation.groupName,
        unitId: invitation.unitId,
        unitName: invitation.unitName,
      })
      .returning();
    if (!event) throw new Error("SCHEDULING_EVENT_NOT_CREATED");

    await tx.insert(schedulingEventParticipants).values({
      eventId: event.id,
      kind: "external",
      customerContactId: invitation.customerContactId,
      name: invitation.customerName,
      email: invitation.customerEmail,
    });

    const now = new Date();
    const [updated] = await tx
      .update(schedulingInvitations)
      .set({
        status: "booked",
        bookedAt: now,
        eventId: event.id,
        googleEventId: null,
        googleIcalUid: null,
        googleMeetUrl: null,
        updatedAt: now,
      })
      .where(and(eq(schedulingInvitations.id, invitationId), eq(schedulingInvitations.status, "booking")))
      .returning({ id: schedulingInvitations.id });
    if (!updated) throw new Error("SCHEDULING_BOOKING_STATE_CHANGED");

    return event;
  });
}

export async function upsertSchedulingEventGoogleLink(input: {
  eventId: string;
  userId: string;
  googleCalendarId: string;
  googleEventId: string | null;
  googleIcalUid: string | null;
  googleHtmlLink: string | null;
  googleMeetUrl: string | null;
  lastSyncError: string | null;
}): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  await db
    .insert(schedulingEventGoogleCalendarLinks)
    .values({
      eventId: input.eventId,
      userId: input.userId,
      googleCalendarId: input.googleCalendarId,
      googleEventId: input.googleEventId,
      googleIcalUid: input.googleIcalUid,
      googleHtmlLink: input.googleHtmlLink,
      googleMeetUrl: input.googleMeetUrl,
      lastSyncedAt: input.lastSyncError ? null : now,
      lastSyncError: input.lastSyncError?.slice(0, 1000) ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [schedulingEventGoogleCalendarLinks.eventId, schedulingEventGoogleCalendarLinks.userId],
      set: {
        googleCalendarId: input.googleCalendarId,
        googleEventId: input.googleEventId,
        googleIcalUid: input.googleIcalUid,
        googleHtmlLink: input.googleHtmlLink,
        googleMeetUrl: input.googleMeetUrl,
        lastSyncedAt: input.lastSyncError ? null : now,
        lastSyncError: input.lastSyncError?.slice(0, 1000) ?? null,
        updatedAt: now,
      },
    });
}

export async function updateSchedulingInvitationGoogleProjection(input: {
  invitationId: string;
  googleCalendarId: string;
  googleEventId: string;
  googleIcalUid: string | null;
  googleMeetUrl: string | null;
}): Promise<void> {
  const db = getDatabase();
  await db
    .update(schedulingInvitations)
    .set({
      googleCalendarId: input.googleCalendarId,
      googleEventId: input.googleEventId,
      googleIcalUid: input.googleIcalUid,
      googleMeetUrl: input.googleMeetUrl,
      updatedAt: new Date(),
    })
    .where(eq(schedulingInvitations.id, input.invitationId));
}
