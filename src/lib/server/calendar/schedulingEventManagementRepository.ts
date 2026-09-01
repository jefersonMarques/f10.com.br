import { and, eq, gt, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import {
  lockSchedulingUsers,
  schedulingIntervalsConflict,
  SCHEDULING_BOOKING_CLAIM_TIMEOUT_MS,
  SCHEDULING_MAX_BUFFER_MINUTES,
} from "$lib/server/calendar/schedulingConcurrency";
import { getDatabase } from "$lib/server/db";
import {
  schedulingEventParticipants,
  schedulingEvents,
  schedulingInvitations,
} from "$lib/server/db/schedulingSchema";
import type {
  SchedulingEventParticipantInput,
  SchedulingEventParticipantRow,
  SchedulingEventRow,
} from "$lib/server/calendar/schedulingEventRepository";

export type UpdateSchedulingEventRepositoryInput = {
  eventId: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  ticketId?: string | null;
  taskId?: string | null;
  participants: SchedulingEventParticipantInput[];
};

function internalUserIds(participants: SchedulingEventParticipantInput[]): string[] {
  return participants
    .filter((participant) => participant.kind === "internal")
    .map((participant) => participant.userId ?? "")
    .filter(Boolean);
}

function mergeEventParticipants(
  currentParticipants: SchedulingEventParticipantRow[],
  requestedParticipants: SchedulingEventParticipantInput[],
): SchedulingEventParticipantInput[] {
  const participants = new Map<string, SchedulingEventParticipantInput>();

  for (const participant of currentParticipants) {
    if (participant.kind !== "external" || !participant.customerContactId) continue;
    participants.set(`email:${participant.email.trim().toLowerCase()}`, {
      kind: "external",
      customerContactId: participant.customerContactId,
      name: participant.name,
      email: participant.email.trim().toLowerCase(),
    });
  }

  for (const participant of requestedParticipants) {
    const key = participant.kind === "internal" && participant.userId
      ? `user:${participant.userId}`
      : `email:${participant.email.trim().toLowerCase()}`;
    if (participants.has(key)) continue;
    participants.set(key, participant);
  }

  return Array.from(participants.values());
}

export async function listSchedulingEventParticipantsForEvents(
  eventIds: string[],
): Promise<SchedulingEventParticipantRow[]> {
  if (eventIds.length === 0) return [];
  const db = getDatabase();
  return db
    .select()
    .from(schedulingEventParticipants)
    .where(inArray(schedulingEventParticipants.eventId, eventIds));
}

export async function updateSchedulingEvent(
  input: UpdateSchedulingEventRepositoryInput,
): Promise<{ event: SchedulingEventRow; participants: SchedulingEventParticipantInput[] }> {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select id from scheduling_events where id = ${input.eventId} for update`);

    const [currentEvent] = await tx
      .select()
      .from(schedulingEvents)
      .where(eq(schedulingEvents.id, input.eventId))
      .limit(1);
    if (!currentEvent) throw new Error("SCHEDULING_EVENT_NOT_FOUND");
    if (currentEvent.status !== "confirmed") throw new Error("SCHEDULING_EVENT_NOT_EDITABLE");

    const currentParticipants = await tx
      .select()
      .from(schedulingEventParticipants)
      .where(eq(schedulingEventParticipants.eventId, input.eventId));
    const participants = mergeEventParticipants(currentParticipants, input.participants);
    const busyUserIds = Array.from(new Set([
      currentEvent.organizerUserId,
      ...internalUserIds(participants),
    ]));
    const lockedUserIds = Array.from(new Set([
      ...busyUserIds,
      ...currentParticipants
        .filter((participant) => participant.kind === "internal")
        .map((participant) => participant.userId ?? "")
        .filter(Boolean),
    ]));
    await lockSchedulingUsers((query) => tx.execute(query), lockedUserIds);

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
          sql`${schedulingEvents.id} <> ${input.eventId}`,
          lt(schedulingEvents.startsAt, input.endsAt),
          gt(schedulingEvents.endsAt, input.startsAt),
          or(
            inArray(schedulingEvents.organizerUserId, busyUserIds),
            inArray(schedulingEventParticipants.userId, busyUserIds),
          ),
        ),
      )
      .limit(1);
    if (eventConflict) throw new Error("SCHEDULING_EVENT_CONFLICT");

    const now = new Date();
    const activeBookingSince = new Date(
      now.getTime() - SCHEDULING_BOOKING_CLAIM_TIMEOUT_MS,
    );
    const reservationWindowStart = new Date(
      input.startsAt.getTime() - SCHEDULING_MAX_BUFFER_MINUTES * 60_000,
    );
    const reservationWindowEnd = new Date(
      input.endsAt.getTime() + SCHEDULING_MAX_BUFFER_MINUTES * 60_000,
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
          inArray(schedulingInvitations.hostUserId, busyUserIds),
          sql`${schedulingInvitations.eventId} is distinct from ${input.eventId}`,
          or(
            eq(schedulingInvitations.status, "booked"),
            and(
              eq(schedulingInvitations.status, "booking"),
              isNotNull(schedulingInvitations.bookingStartedAt),
              gt(schedulingInvitations.bookingStartedAt, activeBookingSince),
            ),
          ),
          isNotNull(schedulingInvitations.selectedStartAt),
          isNotNull(schedulingInvitations.selectedEndAt),
          lt(schedulingInvitations.selectedStartAt, reservationWindowEnd),
          gt(schedulingInvitations.selectedEndAt, reservationWindowStart),
        ),
      );
    if (
      reservations.some((reservation) =>
        schedulingIntervalsConflict(input.startsAt, input.endsAt, 0, 0, reservation),
      )
    ) {
      throw new Error("SCHEDULING_EVENT_CONFLICT");
    }

    const [event] = await tx
      .update(schedulingEvents)
      .set({
        title: input.title,
        description: input.description,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        timeZone: input.timeZone,
        ticketId: input.ticketId ?? null,
        taskId: input.taskId ?? null,
        updatedAt: now,
      })
      .where(and(eq(schedulingEvents.id, input.eventId), eq(schedulingEvents.status, "confirmed")))
      .returning();
    if (!event) throw new Error("SCHEDULING_EVENT_NOT_EDITABLE");

    await tx
      .delete(schedulingEventParticipants)
      .where(eq(schedulingEventParticipants.eventId, input.eventId));
    if (participants.length > 0) {
      await tx.insert(schedulingEventParticipants).values(
        participants.map((participant) => ({
          eventId: input.eventId,
          kind: participant.kind,
          userId: participant.userId ?? null,
          customerContactId: participant.customerContactId ?? null,
          name: participant.name,
          email: participant.email,
        })),
      );
    }

    return { event, participants };
  });
}
