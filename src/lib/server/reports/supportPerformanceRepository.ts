import { and, asc, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { remoteSupportSessions } from "$lib/server/db/operationsSettingsSchema";
import { users } from "$lib/server/db/schema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
import { taskAssignees, tasks } from "$lib/server/db/taskSchema";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";
import {
  getSupportHoursSettings,
  type SupportDayKey,
  type SupportHoursSettings,
} from "$lib/server/settings/supportHoursRepository";

export type SupportPerformancePeriod = 7 | 30 | 90;

type MutableUserMetrics = {
  id: string;
  name: string;
  email: string;
  publicReplies: number;
  internalNotes: number;
  handledTickets: Set<string>;
  handledChats: Set<string>;
  resolvedTickets: Set<string>;
  firstResponseMinutes: number[];
  firstResponseSlaSamples: number;
  firstResponseSlaMet: number;
  tasksCompleted: number;
  tasksCompletedOnTime: number;
  tasksOverdue: number;
  remoteStarted: number;
  remoteCompleted: number;
};

type LocalTicketClock = {
  dayKey: SupportDayKey;
  hour: number;
  minutes: number;
};

type TrafficCell = {
  hour: number;
  count: number;
  available: boolean;
};

type TrafficDay = {
  key: SupportDayKey;
  label: string;
  enabled: boolean;
  start: string;
  end: string;
  total: number;
  cells: TrafficCell[];
};

const SUPPORT_DAY_ORDER: SupportDayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const SUPPORT_DAY_LABELS: Record<SupportDayKey, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

const SUPPORT_DAY_BY_SHORT: Record<string, SupportDayKey> = {
  Mon: "monday",
  Tue: "tuesday",
  Wed: "wednesday",
  Thu: "thursday",
  Fri: "friday",
  Sat: "saturday",
  Sun: "sunday",
};

function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * ratio;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function roundedMinutes(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function percentage(value: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((value / total) * 1000) / 10;
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function resolveTimezone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "America/Sao_Paulo";
  }
}

function localTicketClock(value: Date, timezone: string): LocalTicketClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return {
    dayKey: SUPPORT_DAY_BY_SHORT[weekday] ?? "monday",
    hour,
    minutes: hour * 60 + minute,
  };
}

function isInsideSupportHours(clock: LocalTicketClock, hours: SupportHoursSettings): boolean {
  const day = hours.days[clock.dayKey];
  if (!day.enabled) return false;
  const start = timeToMinutes(day.start);
  const end = timeToMinutes(day.end);
  return clock.minutes >= start && clock.minutes < end;
}

function hourOverlapsSupportWindow(hour: number, dayKey: SupportDayKey, hours: SupportHoursSettings): boolean {
  const day = hours.days[dayKey];
  if (!day.enabled) return false;
  const start = timeToMinutes(day.start);
  const end = timeToMinutes(day.end);
  const hourStart = hour * 60;
  const hourEnd = hourStart + 60;
  return hourStart < end && hourEnd > start;
}

function trafficHours(hours: SupportHoursSettings): number[] {
  const enabledDays = SUPPORT_DAY_ORDER.map((key) => hours.days[key]).filter((day) => day.enabled);
  if (enabledDays.length === 0) return Array.from({ length: 10 }, (_, index) => index + 8);

  const firstHour = Math.min(...enabledDays.map((day) => Math.floor(timeToMinutes(day.start) / 60)));
  const lastHourExclusive = Math.max(...enabledDays.map((day) => Math.ceil(timeToMinutes(day.end) / 60)));
  return Array.from(
    { length: Math.max(lastHourExclusive - firstHour, 1) },
    (_, index) => firstHour + index,
  );
}

function buildTrafficMetrics(
  ticketRows: Array<{ createdAt: Date }>,
  hours: SupportHoursSettings,
  timezone: string,
) {
  const hourRange = trafficHours(hours);
  const counts = new Map<string, number>();
  const dayTotals = new Map<SupportDayKey, number>(SUPPORT_DAY_ORDER.map((key) => [key, 0]));
  const hourTotals = new Map<number, number>(hourRange.map((hour) => [hour, 0]));
  let outsideBusinessHours = 0;
  let insideBusinessHours = 0;

  for (const ticket of ticketRows) {
    const clock = localTicketClock(ticket.createdAt, timezone);
    if (!isInsideSupportHours(clock, hours)) {
      outsideBusinessHours += 1;
      continue;
    }

    insideBusinessHours += 1;
    const key = `${clock.dayKey}:${clock.hour}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    dayTotals.set(clock.dayKey, (dayTotals.get(clock.dayKey) ?? 0) + 1);
    if (hourTotals.has(clock.hour)) {
      hourTotals.set(clock.hour, (hourTotals.get(clock.hour) ?? 0) + 1);
    }
  }

  const days: TrafficDay[] = SUPPORT_DAY_ORDER.map((key) => {
    const day = hours.days[key];
    return {
      key,
      label: SUPPORT_DAY_LABELS[key],
      enabled: day.enabled,
      start: day.start,
      end: day.end,
      total: dayTotals.get(key) ?? 0,
      cells: hourRange.map((hour) => ({
        hour,
        count: counts.get(`${key}:${hour}`) ?? 0,
        available: hourOverlapsSupportWindow(hour, key, hours),
      })),
    };
  });

  const availableCells = days.flatMap((day) =>
    day.cells
      .filter((cell) => cell.available)
      .map((cell) => ({ ...cell, dayKey: day.key, dayLabel: day.label })),
  );
  const maxCellCount = availableCells.reduce((maximum, cell) => Math.max(maximum, cell.count), 0);
  const peakCell = availableCells.reduce<(typeof availableCells)[number] | null>((peak, cell) => {
    if (!peak || cell.count > peak.count) return cell;
    return peak;
  }, null);
  const peakDay = days.reduce<TrafficDay | null>((peak, day) => {
    if (!day.enabled) return peak;
    if (!peak || day.total > peak.total) return day;
    return peak;
  }, null);

  let peakWindow: { startHour: number; endHour: number; count: number; percent: number | null } | null = null;
  for (let index = 0; index < hourRange.length; index += 1) {
    const startHour = hourRange[index];
    const nextHour = hourRange[index + 1];
    const count = (hourTotals.get(startHour) ?? 0) + (nextHour === undefined ? 0 : (hourTotals.get(nextHour) ?? 0));
    if (!peakWindow || count > peakWindow.count) {
      peakWindow = {
        startHour,
        endHour: nextHour === undefined ? startHour + 1 : nextHour + 1,
        count,
        percent: percentage(count, insideBusinessHours),
      };
    }
  }

  return {
    timezone,
    hoursConfigured: hours.configured,
    hours: hourRange,
    days,
    maxCellCount,
    insideBusinessHours,
    outsideBusinessHours,
    peakCell: peakCell && peakCell.count > 0
      ? {
          dayKey: peakCell.dayKey,
          dayLabel: peakCell.dayLabel,
          hour: peakCell.hour,
          count: peakCell.count,
        }
      : null,
    peakDay: peakDay && peakDay.total > 0
      ? { dayKey: peakDay.key, dayLabel: peakDay.label, count: peakDay.total }
      : null,
    peakWindow: peakWindow && peakWindow.count > 0 ? peakWindow : null,
  };
}

export async function getSupportPerformance(periodDays: SupportPerformancePeriod) {
  const db = getDatabase();
  const now = new Date();
  const since = new Date(now.getTime() - periodDays * 24 * 60 * 60_000);
  const today = now.toISOString().slice(0, 10);
  const [generalSettings, supportHours] = await Promise.all([
    getGeneralOperationsSettings(),
    getSupportHoursSettings(),
  ]);
  const timezone = resolveTimezone(generalSettings.timezone);

  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.status, "active"))
    .orderBy(asc(users.name));

  const metrics = new Map<string, MutableUserMetrics>(
    userRows.map((user) => [
      user.id,
      {
        ...user,
        publicReplies: 0,
        internalNotes: 0,
        handledTickets: new Set<string>(),
        handledChats: new Set<string>(),
        resolvedTickets: new Set<string>(),
        firstResponseMinutes: [],
        firstResponseSlaSamples: 0,
        firstResponseSlaMet: 0,
        tasksCompleted: 0,
        tasksCompletedOnTime: 0,
        tasksOverdue: 0,
        remoteStarted: 0,
        remoteCompleted: 0,
      },
    ]),
  );

  const [messageRows, firstHumanRows, resolutionEvents, completedTasks, overdueTasks, remoteRows, trafficTicketRows] = await Promise.all([
    db
      .select({
        userId: ticketMessages.authorUserId,
        ticketId: ticketMessages.ticketId,
        visibility: ticketMessages.visibility,
        channel: tickets.channel,
      })
      .from(ticketMessages)
      .innerJoin(tickets, eq(ticketMessages.ticketId, tickets.id))
      .where(
        and(
          eq(ticketMessages.authorType, "user"),
          isNotNull(ticketMessages.authorUserId),
          gte(ticketMessages.createdAt, since),
        ),
      ),
    db
      .select({
        userId: ticketMessages.authorUserId,
        ticketId: tickets.id,
        ticketCreatedAt: tickets.createdAt,
        responseAt: ticketMessages.createdAt,
        firstResponseDueAt: tickets.firstResponseDueAt,
      })
      .from(tickets)
      .innerJoin(ticketMessages, eq(ticketMessages.ticketId, tickets.id))
      .where(
        and(
          gte(tickets.createdAt, since),
          eq(ticketMessages.authorType, "user"),
          eq(ticketMessages.visibility, "public"),
          isNotNull(ticketMessages.authorUserId),
        ),
      )
      .orderBy(asc(tickets.id), asc(ticketMessages.createdAt)),
    db
      .select({
        ticketId: ticketEvents.ticketId,
        actorUserId: ticketEvents.actorUserId,
        metadata: ticketEvents.metadata,
      })
      .from(ticketEvents)
      .where(
        and(
          eq(ticketEvents.eventType, "ticket.status.changed"),
          isNotNull(ticketEvents.actorUserId),
          gte(ticketEvents.createdAt, since),
        ),
      ),
    db
      .select({
        userId: taskAssignees.userId,
        dueOn: tasks.dueOn,
        completedAt: tasks.completedAt,
      })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(and(isNotNull(tasks.completedAt), gte(tasks.completedAt, since))),
    db
      .select({ userId: taskAssignees.userId })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(and(isNull(tasks.completedAt), isNotNull(tasks.dueOn), lt(tasks.dueOn, today))),
    db
      .select({
        startedByUserId: remoteSupportSessions.startedByUserId,
        startedAt: remoteSupportSessions.startedAt,
        endedAt: remoteSupportSessions.endedAt,
      })
      .from(remoteSupportSessions)
      .where(and(isNotNull(remoteSupportSessions.startedByUserId), gte(remoteSupportSessions.startedAt, since))),
    db
      .select({ createdAt: tickets.createdAt })
      .from(tickets)
      .where(gte(tickets.createdAt, since)),
  ]);

  for (const message of messageRows) {
    if (!message.userId) continue;
    const user = metrics.get(message.userId);
    if (!user) continue;
    user.handledTickets.add(message.ticketId);
    if (message.channel === "web_chat") user.handledChats.add(message.ticketId);
    if (message.visibility === "public") user.publicReplies += 1;
    else user.internalNotes += 1;
  }

  const seenFirstResponseTickets = new Set<string>();
  for (const response of firstHumanRows) {
    if (!response.userId || seenFirstResponseTickets.has(response.ticketId)) continue;
    seenFirstResponseTickets.add(response.ticketId);
    const user = metrics.get(response.userId);
    if (!user) continue;
    const minutes = Math.max(0, response.responseAt.getTime() - response.ticketCreatedAt.getTime()) / 60_000;
    user.firstResponseMinutes.push(minutes);
    if (response.firstResponseDueAt) {
      user.firstResponseSlaSamples += 1;
      if (response.responseAt <= response.firstResponseDueAt) user.firstResponseSlaMet += 1;
    }
  }

  for (const event of resolutionEvents) {
    if (!event.actorUserId) continue;
    const status = event.metadata && typeof event.metadata === "object"
      ? String((event.metadata as Record<string, unknown>).status ?? "")
      : "";
    if (status !== "resolved" && status !== "closed") continue;
    const user = metrics.get(event.actorUserId);
    if (user) user.resolvedTickets.add(event.ticketId);
  }

  for (const task of completedTasks) {
    const user = metrics.get(task.userId);
    if (!user || !task.completedAt) continue;
    user.tasksCompleted += 1;
    if (!task.dueOn || task.completedAt.toISOString().slice(0, 10) <= task.dueOn) {
      user.tasksCompletedOnTime += 1;
    }
  }

  for (const task of overdueTasks) {
    const user = metrics.get(task.userId);
    if (user) user.tasksOverdue += 1;
  }

  for (const remote of remoteRows) {
    if (!remote.startedByUserId || !remote.startedAt) continue;
    const user = metrics.get(remote.startedByUserId);
    if (!user) continue;
    user.remoteStarted += 1;
    if (remote.endedAt) user.remoteCompleted += 1;
  }

  const rows = Array.from(metrics.values()).map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    publicReplies: user.publicReplies,
    internalNotes: user.internalNotes,
    handledTickets: user.handledTickets.size,
    handledChats: user.handledChats.size,
    resolvedTickets: user.resolvedTickets.size,
    medianFirstHumanResponseMinutes: roundedMinutes(percentile(user.firstResponseMinutes, 0.5)),
    p90FirstHumanResponseMinutes: roundedMinutes(percentile(user.firstResponseMinutes, 0.9)),
    firstResponseSamples: user.firstResponseMinutes.length,
    firstResponseSlaPercent: percentage(user.firstResponseSlaMet, user.firstResponseSlaSamples),
    tasksCompleted: user.tasksCompleted,
    tasksCompletedOnTimePercent: percentage(user.tasksCompletedOnTime, user.tasksCompleted),
    tasksOverdue: user.tasksOverdue,
    remoteStarted: user.remoteStarted,
    remoteCompleted: user.remoteCompleted,
  }));

  const teamResponseMinutes = Array.from(metrics.values()).flatMap((user) => user.firstResponseMinutes);
  const totalSlaSamples = Array.from(metrics.values()).reduce((total, user) => total + user.firstResponseSlaSamples, 0);
  const totalSlaMet = Array.from(metrics.values()).reduce((total, user) => total + user.firstResponseSlaMet, 0);

  return {
    periodDays,
    since,
    generatedAt: now,
    summary: {
      handledTickets: new Set(messageRows.map((row) => row.ticketId)).size,
      resolvedTickets: rows.reduce((total, row) => total + row.resolvedTickets, 0),
      medianFirstHumanResponseMinutes: roundedMinutes(percentile(teamResponseMinutes, 0.5)),
      p90FirstHumanResponseMinutes: roundedMinutes(percentile(teamResponseMinutes, 0.9)),
      firstResponseSlaPercent: percentage(totalSlaMet, totalSlaSamples),
      tasksCompleted: rows.reduce((total, row) => total + row.tasksCompleted, 0),
      remoteStarted: rows.reduce((total, row) => total + row.remoteStarted, 0),
    },
    traffic: buildTrafficMetrics(trafficTicketRows, supportHours, timezone),
    users: rows,
  };
}
