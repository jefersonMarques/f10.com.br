import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { teamMembers, teams } from "$lib/server/db/schema";
import { userProfiles } from "$lib/server/db/userProfileSchema";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";
import {
  getSupportHoursSettings,
  type SupportDayKey,
} from "$lib/server/settings/supportHoursRepository";
import { SUPPORT_AWAY_AFTER_MS } from "$lib/server/support/supportAgentPresence";
import { getSupportRoutingSettings } from "$lib/server/support/supportRoutingRepository";

type TimelineStatus = "online" | "busy" | "away" | "offline" | "future" | "untracked";

type IntervalRow = {
  userId: string;
  status: "online" | "busy";
  startedAt: Date;
  lastActivityAt: Date;
  endedAt: Date | null;
  closeReason: "away" | "manual" | "status" | null;
};

type TimelineSegment = {
  status: TimelineStatus;
  startedAt: string;
  endedAt: string;
  minutes: number;
  leftPercent: number;
  widthPercent: number;
};

const DAY_KEYS: SupportDayKey[] = [
  "sunday", "monday", "tuesday", "wednesday",
  "thursday", "friday", "saturday",
];

function getLocalDate(now: Date, timezone: string): string {
  const pieces = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => pieces.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function verifiedTimezone(value: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return "America/Sao_Paulo";
  }
}

function resolveDate(value: string | null, today: string): string {
  if (!value) return today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("INVALID_PRESENCE_DATE");
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value || value > today) {
    throw new Error("INVALID_PRESENCE_DATE");
  }
  return value;
}

function makeSegment(
  status: TimelineStatus,
  start: number,
  end: number,
  windowStart: number,
  windowEnd: number,
): TimelineSegment {
  const span = windowEnd - windowStart;
  return {
    status,
    startedAt: new Date(start).toISOString(),
    endedAt: new Date(end).toISOString(),
    minutes: Math.round((end - start) / 60_000),
    leftPercent: span > 0 ? ((start - windowStart) / span) * 100 : 0,
    widthPercent: span > 0 ? ((end - start) / span) * 100 : 0,
  };
}

function buildTimeline(
  rows: IntervalRow[],
  start: number,
  end: number,
  now: number,
  trackingStartedAt: number,
): { segments: TimelineSegment[]; onlineMinutes: number; onlinePercent: number | null } {
  if (end <= start) return { segments: [], onlineMinutes: 0, onlinePercent: null };

  const elapsedEnd = Math.min(end, now);
  const trackedStart = Math.min(end, Math.max(start, trackingStartedAt));
  const elapsed = Math.max(0, elapsedEnd - trackedStart);
  const segments: TimelineSegment[] = [];
  if (trackedStart > start) {
    segments.push(makeSegment("untracked", start, trackedStart, start, end));
  }
  let cursor = trackedStart;
  let gapStatus: TimelineStatus = "offline";
  let connectedMilliseconds = 0;

  for (const row of rows) {
    const lastActivity = new Date(row.lastActivityAt).getTime();
    const timeoutAt = lastActivity + SUPPORT_AWAY_AFTER_MS;
    const intervalEnd = row.endedAt
      ? new Date(row.endedAt).getTime()
      : Math.min(timeoutAt, now);
    const intervalStart = Math.max(trackedStart, new Date(row.startedAt).getTime(), cursor);
    const clippedEnd = Math.min(elapsedEnd, intervalEnd);
    if (clippedEnd <= intervalStart) continue;

    if (intervalStart > cursor && cursor < elapsedEnd) {
      segments.push(makeSegment(gapStatus, cursor, intervalStart, start, end));
    }

    segments.push(makeSegment(row.status, intervalStart, clippedEnd, start, end));
    connectedMilliseconds += clippedEnd - intervalStart;
    cursor = clippedEnd;
    gapStatus = row.closeReason === "away" || (!row.endedAt && timeoutAt <= now)
      ? "away" : "offline";
  }

  if (cursor < elapsedEnd) {
    segments.push(makeSegment(gapStatus, cursor, elapsedEnd, start, end));
  }
  if (elapsedEnd < end) {
    segments.push(makeSegment("future", Math.max(start, elapsedEnd), end, start, end));
  }

  const onlineMinutes = Math.round(connectedMilliseconds / 60_000);
  return {
    segments,
    onlineMinutes,
    onlinePercent: elapsed > 0 ? Math.round((connectedMilliseconds / elapsed) * 1000) / 10 : null,
  };
}

export async function getSupportPresenceTimeline(requestedDate: string | null) {
  const db = getDatabase();
  const now = new Date();
  const [general, hours, routing, collectionRows] = await Promise.all([
    getGeneralOperationsSettings(),
    getSupportHoursSettings(),
    getSupportRoutingSettings(),
    db.execute(sql`SELECT applied_at AS "startedAt" FROM schema_migrations
      WHERE name = '0115_support_presence_timeline.sql' LIMIT 1`),
  ]);
  const collection = (collectionRows as unknown as Array<{ startedAt: Date }>)[0];
  const trackingStartedAt = collection
    ? new Date(collection.startedAt).getTime()
    : now.getTime();

  const timezone = verifiedTimezone(general.timezone);
  const today = getLocalDate(now, timezone);
  const date = resolveDate(requestedDate, today);
  const dayKey = DAY_KEYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const dayHours = hours.days[dayKey];

  const [window] = dayHours.enabled
    ? (await db.execute(sql`
        SELECT
          ((${date}::date + ${dayHours.start}::time) AT TIME ZONE ${timezone}) AS "startAt",
          ((${date}::date + ${dayHours.end}::time) AT TIME ZONE ${timezone}) AS "endAt"
      `) as unknown as Array<{ startAt: Date; endAt: Date }>)
    : [];

  const start = window ? new Date(window.startAt).getTime() : 0;
  const end = window ? new Date(window.endAt).getTime() : 0;

  const agents = Array.from(new Map(
    [...routing.chatUsers, ...routing.ticketUsers].map((user) => [user.id, user]),
  ).values()).sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
  const userIds = agents.map((user) => user.id);

  if (!userIds.length) {
    return {
      date, today, timezone, hoursConfigured: hours.configured,
      schedule: { enabled: dayHours.enabled, start: dayHours.start, end: dayHours.end },
      teams: [], users: [],
    };
  }

  const [membership, avatars, latest, intervals] = await Promise.all([
    db.select({ userId: teamMembers.userId, id: teams.id, name: teams.name })
      .from(teamMembers).innerJoin(teams, eq(teams.id, teamMembers.teamId))
      .where(inArray(teamMembers.userId, userIds)),
    db.select({ userId: userProfiles.userId }).from(userProfiles)
      .where(and(inArray(userProfiles.userId, userIds), isNotNull(userProfiles.avatarKey))),
    db.execute(sql`
      SELECT agent.id::text AS "userId", recent.last_activity_at AS "lastOnlineAt"
      FROM users agent
      LEFT JOIN LATERAL (
        SELECT last_activity_at FROM support_presence_intervals intervals
        WHERE intervals.user_id = agent.id ORDER BY started_at DESC LIMIT 1
      ) recent ON true
      WHERE agent.id IN (${sql.join(userIds.map((id) => sql`${id}::uuid`), sql`, `)})
    `),
    window
      ? db.execute(sql`
          SELECT user_id::text AS "userId", status, started_at AS "startedAt",
            last_activity_at AS "lastActivityAt", ended_at AS "endedAt",
            close_reason AS "closeReason"
          FROM support_presence_intervals
          WHERE user_id IN (${sql.join(userIds.map((id) => sql`${id}::uuid`), sql`, `)})
            AND started_at < ${window.endAt}
            AND COALESCE(ended_at, last_activity_at + interval '10 minutes') > ${window.startAt}
          ORDER BY user_id, started_at
        `)
      : Promise.resolve([]),
  ]);

  const avatarsSet = new Set(avatars.map((row) => row.userId));
  const latestMap = new Map(
    (latest as unknown as Array<{ userId: string; lastOnlineAt: Date | null }>)
      .map((row) => [row.userId, row.lastOnlineAt]),
  );
  const sessionMap = new Map<string, IntervalRow[]>();
  for (const row of intervals as unknown as IntervalRow[]) {
    const items = sessionMap.get(row.userId) ?? [];
    items.push(row);
    sessionMap.set(row.userId, items);
  }

  const users = agents.map((agent) => {
    const timeline = buildTimeline(sessionMap.get(agent.id) ?? [], start, end, now.getTime(), trackingStartedAt);
    return {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      currentStatus: agent.presence.effectiveStatus,
      lastOnlineAt: latestMap.get(agent.id) ?? agent.presence.lastActivityAt ?? null,
      hasAvatar: avatarsSet.has(agent.id),
      teamIds: membership.filter((row) => row.userId === agent.id).map((row) => row.id),
      ...timeline,
    };
  });

  return {
    date, today, timezone, hoursConfigured: hours.configured,
    schedule: { enabled: dayHours.enabled, start: dayHours.start, end: dayHours.end },
    teams: Array.from(new Map(membership.map((row) =>
      [row.id, { id: row.id, name: row.name }])).values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    users,
  };
}
