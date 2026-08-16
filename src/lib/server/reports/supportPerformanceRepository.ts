import { and, asc, eq, gte, isNotNull, isNull, lt } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { remoteSupportSessions } from "$lib/server/db/operationsSettingsSchema";
import { users } from "$lib/server/db/schema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
import { taskAssignees, tasks } from "$lib/server/db/taskSchema";

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

export async function getSupportPerformance(periodDays: SupportPerformancePeriod) {
  const db = getDatabase();
  const now = new Date();
  const since = new Date(now.getTime() - periodDays * 24 * 60 * 60_000);
  const today = now.toISOString().slice(0, 10);

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

  const [messageRows, firstHumanRows, resolutionEvents, completedTasks, overdueTasks, remoteRows] = await Promise.all([
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
    users: rows,
  };
}
