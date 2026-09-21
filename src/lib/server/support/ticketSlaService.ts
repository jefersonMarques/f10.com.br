import { and, eq, notInArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { supportQueues, tickets } from "$lib/server/db/supportSchema";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";
import {
  getSupportHoursSettings,
  type SupportDayKey,
} from "$lib/server/settings/supportHoursRepository";

export type TicketSlaPolicy = {
  firstResponseMinutes: number;
  nextResponseMinutes: number;
  resolutionMinutes: number;
};

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const DAY_KEYS: SupportDayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function localParts(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.get("year")),
    month: Number(values.get("month")),
    day: Number(values.get("day")),
    hour: Number(values.get("hour")),
    minute: Number(values.get("minute")),
  };
}

function zonedTimeToUtc(
  parts: LocalParts,
  timeZone: string,
): Date {
  const target = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
  );
  let result = target;

  for (let index = 0; index < 3; index += 1) {
    const observed = localParts(new Date(result), timeZone);
    const observedAsUtc = Date.UTC(
      observed.year,
      observed.month - 1,
      observed.day,
      observed.hour,
      observed.minute,
    );
    result += target - observedAsUtc;
  }

  return new Date(result);
}

function parseClock(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
}

async function addSlaMinutes(start: Date, minutes: number): Promise<Date> {
  const [hours, general] = await Promise.all([
    getSupportHoursSettings(),
    getGeneralOperationsSettings(),
  ]);

  if (
    !hours.configured ||
    !Object.values(hours.days).some((day) => day.enabled)
  ) {
    return new Date(start.getTime() + minutes * 60_000);
  }

  const timeZone = general.timezone || "America/Sao_Paulo";
  const initial = localParts(start, timeZone);
  let dayCursor = new Date(Date.UTC(initial.year, initial.month - 1, initial.day));
  let cursor = start;
  let remaining = Math.max(1, Math.round(minutes));

  for (let dayOffset = 0; dayOffset < 370; dayOffset += 1) {
    const year = dayCursor.getUTCFullYear();
    const month = dayCursor.getUTCMonth() + 1;
    const day = dayCursor.getUTCDate();
    const dayKey = DAY_KEYS[dayCursor.getUTCDay()];
    const schedule = hours.days[dayKey];

    if (schedule.enabled) {
      const startClock = parseClock(schedule.start);
      const endClock = parseClock(schedule.end);
      const windowStart = zonedTimeToUtc(
        { year, month, day, hour: startClock.hour, minute: startClock.minute },
        timeZone,
      );
      const windowEnd = zonedTimeToUtc(
        { year, month, day, hour: endClock.hour, minute: endClock.minute },
        timeZone,
      );

      const effectiveStart = cursor > windowStart ? cursor : windowStart;
      if (effectiveStart < windowEnd) {
        const available = Math.floor(
          (windowEnd.getTime() - effectiveStart.getTime()) / 60_000,
        );
        if (remaining <= available) {
          return new Date(effectiveStart.getTime() + remaining * 60_000);
        }
        remaining -= available;
      }
    }

    dayCursor = new Date(dayCursor.getTime() + 86_400_000);
    cursor = new Date(0);
  }

  return new Date(start.getTime() + minutes * 60_000);
}

export async function getQueueSlaPolicy(queueId: string): Promise<TicketSlaPolicy> {
  const [queue] = await getDatabase()
    .select({
      firstResponseMinutes: supportQueues.slaFirstResponseMinutes,
      nextResponseMinutes: supportQueues.slaNextResponseMinutes,
      resolutionMinutes: supportQueues.slaResolutionMinutes,
    })
    .from(supportQueues)
    .where(eq(supportQueues.id, queueId))
    .limit(1);

  if (!queue) throw new Error("SUPPORT_QUEUE_NOT_FOUND");
  return queue;
}

export async function calculateTicketSlaDeadlines(
  queueId: string,
  startAt = new Date(),
) {
  const policy = await getQueueSlaPolicy(queueId);
  const [firstResponseDueAt, resolutionDueAt] = await Promise.all([
    addSlaMinutes(startAt, policy.firstResponseMinutes),
    addSlaMinutes(startAt, policy.resolutionMinutes),
  ]);

  return {
    firstResponseDueAt,
    resolutionDueAt,
  };
}

export async function calculateNextResponseDueAt(
  queueId: string,
  startAt = new Date(),
): Promise<Date> {
  const policy = await getQueueSlaPolicy(queueId);
  return addSlaMinutes(startAt, policy.nextResponseMinutes);
}

export async function markTicketCustomerWaitingForResponse(
  ticketId: string,
  receivedAt = new Date(),
): Promise<void> {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      queueId: tickets.queueId,
      firstResponseAt: tickets.firstResponseAt,
      status: tickets.status,
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (
    !ticket ||
    !ticket.firstResponseAt ||
    ticket.status === "resolved" ||
    ticket.status === "closed"
  ) {
    return;
  }

  const nextResponseDueAt = await calculateNextResponseDueAt(
    ticket.queueId,
    receivedAt,
  );

  await db
    .update(tickets)
    .set({
      nextResponseDueAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(tickets.id, ticketId),
        notInArray(tickets.status, ["resolved", "closed"]),
      ),
    );
}
