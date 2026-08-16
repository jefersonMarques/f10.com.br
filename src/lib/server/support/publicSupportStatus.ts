import { and, eq, gt, gte, isNotNull } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { teamMembers } from "$lib/server/db/schema";
import { supportAgentPresence } from "$lib/server/db/supportRoutingSchema";
import { supportQueues, tickets } from "$lib/server/db/supportSchema";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";
import {
  getSupportHoursSettings,
  type SupportDayKey,
  type SupportHoursSettings,
} from "$lib/server/settings/supportHoursRepository";
import { SUPPORT_AWAY_AFTER_MS } from "$lib/server/support/supportAgentPresence";

const WAIT_SAMPLE_WINDOW_MS = 30 * 24 * 60 * 60_000;
const MIN_WAIT_SAMPLES = 3;

const DAY_BY_INDEX: SupportDayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_LABELS: Record<SupportDayKey, string> = {
  monday: "segunda-feira",
  tuesday: "terça-feira",
  wednesday: "quarta-feira",
  thursday: "quinta-feira",
  friday: "sexta-feira",
  saturday: "sábado",
  sunday: "domingo",
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function localClock(now: Date, timezone: string): { dayIndex: number; minutes: number } {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }

  const parts = formatter.formatToParts(now);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return { dayIndex: WEEKDAY_INDEX[weekday] ?? 1, minutes: hour * 60 + minute };
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function availabilityFromHours(
  hours: SupportHoursSettings,
  timezone: string,
  now: Date,
): { isOpen: boolean | null; nextOpenLabel: string | null } {
  if (!hours.configured) return { isOpen: null, nextOpenLabel: null };

  const clock = localClock(now, timezone);
  const todayKey = DAY_BY_INDEX[clock.dayIndex];
  const today = hours.days[todayKey];
  const todayStart = timeToMinutes(today.start);
  const todayEnd = timeToMinutes(today.end);
  const isOpen = today.enabled && clock.minutes >= todayStart && clock.minutes < todayEnd;

  if (isOpen) return { isOpen: true, nextOpenLabel: null };

  for (let offset = 0; offset <= 7; offset += 1) {
    const dayIndex = (clock.dayIndex + offset) % 7;
    const key = DAY_BY_INDEX[dayIndex];
    const day = hours.days[key];
    if (!day.enabled) continue;

    const start = timeToMinutes(day.start);
    if (offset === 0 && clock.minutes >= start) continue;

    const prefix = offset === 0
      ? "Hoje"
      : offset === 1
        ? "Amanhã"
        : DAY_LABELS[key].replace(/^./, (value) => value.toUpperCase());
    return { isOpen: false, nextOpenLabel: `${prefix} às ${day.start}` };
  }

  return { isOpen: false, nextOpenLabel: null };
}

function roundWaitMinutes(milliseconds: number): number {
  return Math.max(1, Math.round(milliseconds / 60_000));
}

export async function getSupportAvailabilityStatus() {
  const [general, hours] = await Promise.all([
    getGeneralOperationsSettings(),
    getSupportHoursSettings(),
  ]);
  const availability = availabilityFromHours(hours, general.timezone, new Date());
  return {
    supportDisplayName: general.supportDisplayName,
    timezone: general.timezone,
    hoursConfigured: hours.configured,
    isOpen: availability.isOpen,
    nextOpenLabel: availability.nextOpenLabel,
  };
}

export async function getPublicSupportStatus() {
  const availability = await getSupportAvailabilityStatus();
  const db = getDatabase();
  const now = new Date();

  const [queue] = await db
    .select({ id: supportQueues.id, teamId: supportQueues.teamId })
    .from(supportQueues)
    .where(and(eq(supportQueues.code, "support"), eq(supportQueues.active, true)))
    .limit(1);

  let onlineAgents: number | null = null;
  let averageWaitMinutes: number | null = null;
  let waitSampleCount = 0;

  if (queue) {
    if (queue.teamId) {
      const onlineRows = await db
        .select({ userId: supportAgentPresence.userId })
        .from(supportAgentPresence)
        .innerJoin(teamMembers, eq(teamMembers.userId, supportAgentPresence.userId))
        .where(
          and(
            eq(teamMembers.teamId, queue.teamId),
            eq(supportAgentPresence.manualStatus, "online"),
            gt(
              supportAgentPresence.lastActivityAt,
              new Date(now.getTime() - SUPPORT_AWAY_AFTER_MS),
            ),
          ),
        )
        .groupBy(supportAgentPresence.userId);
      onlineAgents = onlineRows.length;
    }

    const respondedTickets = await db
      .select({ createdAt: tickets.createdAt, firstResponseAt: tickets.firstResponseAt })
      .from(tickets)
      .where(
        and(
          eq(tickets.queueId, queue.id),
          gte(tickets.createdAt, new Date(now.getTime() - WAIT_SAMPLE_WINDOW_MS)),
          isNotNull(tickets.firstResponseAt),
        ),
      );

    const waits = respondedTickets
      .filter((ticket): ticket is typeof ticket & { firstResponseAt: Date } => Boolean(ticket.firstResponseAt))
      .map((ticket) => Math.max(0, ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()));
    waitSampleCount = waits.length;
    if (waits.length >= MIN_WAIT_SAMPLES) {
      averageWaitMinutes = roundWaitMinutes(
        waits.reduce((total, value) => total + value, 0) / waits.length,
      );
    }
  }

  return {
    supportDisplayName: availability.supportDisplayName,
    hoursConfigured: availability.hoursConfigured,
    isOpen: availability.isOpen,
    nextOpenLabel: availability.nextOpenLabel,
    onlineAgents,
    averageWaitMinutes,
    waitSampleCount,
  };
}
