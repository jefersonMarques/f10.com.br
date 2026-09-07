import { sql, type SQL } from "drizzle-orm";

export const SCHEDULING_BOOKING_CLAIM_TIMEOUT_MS = 5 * 60 * 1000;
export const SCHEDULING_MAX_BUFFER_MINUTES = 240;

export type SchedulingLockExecutor = (query: SQL) => PromiseLike<unknown>;

export async function lockSchedulingUsers(
  execute: SchedulingLockExecutor,
  userIds: string[],
): Promise<void> {
  const orderedUserIds = Array.from(
    new Set(userIds.map((userId) => userId.trim()).filter(Boolean)),
  ).sort();

  for (const userId of orderedUserIds) {
    await execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
  }
}

export function schedulingIntervalsConflict(
  candidateStart: Date,
  candidateEnd: Date,
  candidateBufferBeforeMinutes: number,
  candidateBufferAfterMinutes: number,
  reservation: {
    startAt: Date | null;
    endAt: Date | null;
    bufferBeforeMinutes: number;
    bufferAfterMinutes: number;
  },
): boolean {
  if (!reservation.startAt || !reservation.endAt) return false;

  const candidateBusyStart = candidateStart.getTime() - candidateBufferBeforeMinutes * 60_000;
  const candidateBusyEnd = candidateEnd.getTime() + candidateBufferAfterMinutes * 60_000;
  const reservationBusyStart = reservation.startAt.getTime() - reservation.bufferBeforeMinutes * 60_000;
  const reservationBusyEnd = reservation.endAt.getTime() + reservation.bufferAfterMinutes * 60_000;

  return candidateBusyStart < reservationBusyEnd && candidateBusyEnd > reservationBusyStart;
}
