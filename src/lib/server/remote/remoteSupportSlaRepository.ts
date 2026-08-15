import { desc, gte } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { remoteSupportSessions } from "$lib/server/db/operationsSettingsSchema";
import { users } from "$lib/server/db/schema";

type RemoteSupportSlaAgent = {
  userId: string;
  userName: string;
  startedSessions: number;
  completedSessions: number;
  avgPickupSeconds: number | null;
  p90PickupSeconds: number | null;
  avgHandleSeconds: number | null;
  avgRequestToStartSeconds: number | null;
};

type AgentAccumulator = {
  startedSessions: number;
  completedSessions: number;
  pickupSeconds: number[];
  handleSeconds: number[];
  requestToStartSeconds: number[];
};

function secondsBetween(start: Date | null, end: Date | null): number | null {
  if (!start || !end) return null;
  const value = Math.round((end.getTime() - start.getTime()) / 1000);
  return value >= 0 ? value : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil(ordered.length * ratio) - 1),
  );
  return ordered[index] ?? null;
}

function pushMetric(target: number[], value: number | null): void {
  if (value !== null) target.push(value);
}

export async function getRemoteSupportSlaSnapshot(windowDays = 30) {
  const db = getDatabase();
  const safeWindowDays = Math.min(Math.max(Math.trunc(windowDays), 1), 365);
  const since = new Date(Date.now() - safeWindowDays * 24 * 60 * 60 * 1000);

  const [sessions, userRows] = await Promise.all([
    db
      .select({
        status: remoteSupportSessions.status,
        requestedByUserId: remoteSupportSessions.requestedByUserId,
        startedByUserId: remoteSupportSessions.startedByUserId,
        requestedAt: remoteSupportSessions.requestedAt,
        authorizedAt: remoteSupportSessions.authorizedAt,
        startedAt: remoteSupportSessions.startedAt,
        endedAt: remoteSupportSessions.endedAt,
      })
      .from(remoteSupportSessions)
      .where(gte(remoteSupportSessions.requestedAt, since))
      .orderBy(desc(remoteSupportSessions.requestedAt))
      .limit(10_000),
    db.select({ id: users.id, name: users.name }).from(users),
  ]);

  const userNames = new Map(userRows.map((user) => [user.id, user.name]));
  const customerConsentSeconds: number[] = [];
  const operatorPickupSeconds: number[] = [];
  const requestToStartSeconds: number[] = [];
  const handleSeconds: number[] = [];
  const agents = new Map<string, AgentAccumulator>();
  let directAttributionSessions = 0;
  let historicalFallbackSessions = 0;

  for (const session of sessions) {
    pushMetric(
      customerConsentSeconds,
      secondsBetween(session.requestedAt, session.authorizedAt),
    );
    pushMetric(
      operatorPickupSeconds,
      secondsBetween(session.authorizedAt, session.startedAt),
    );
    pushMetric(
      requestToStartSeconds,
      secondsBetween(session.requestedAt, session.startedAt),
    );
    pushMetric(handleSeconds, secondsBetween(session.startedAt, session.endedAt));

    if (!session.startedAt) continue;

    const operatorUserId = session.startedByUserId ?? session.requestedByUserId;
    if (!operatorUserId) continue;

    if (session.startedByUserId) directAttributionSessions += 1;
    else historicalFallbackSessions += 1;

    const accumulator = agents.get(operatorUserId) ?? {
      startedSessions: 0,
      completedSessions: 0,
      pickupSeconds: [],
      handleSeconds: [],
      requestToStartSeconds: [],
    };

    accumulator.startedSessions += 1;
    if (session.endedAt) accumulator.completedSessions += 1;
    pushMetric(
      accumulator.pickupSeconds,
      secondsBetween(session.authorizedAt, session.startedAt),
    );
    pushMetric(
      accumulator.handleSeconds,
      secondsBetween(session.startedAt, session.endedAt),
    );
    pushMetric(
      accumulator.requestToStartSeconds,
      secondsBetween(session.requestedAt, session.startedAt),
    );
    agents.set(operatorUserId, accumulator);
  }

  const attributedSessions = directAttributionSessions + historicalFallbackSessions;
  const agentRows: RemoteSupportSlaAgent[] = [...agents.entries()]
    .map(([userId, metrics]) => ({
      userId,
      userName: userNames.get(userId) ?? "Usuário removido",
      startedSessions: metrics.startedSessions,
      completedSessions: metrics.completedSessions,
      avgPickupSeconds: average(metrics.pickupSeconds),
      p90PickupSeconds: percentile(metrics.pickupSeconds, 0.9),
      avgHandleSeconds: average(metrics.handleSeconds),
      avgRequestToStartSeconds: average(metrics.requestToStartSeconds),
    }))
    .sort(
      (a, b) =>
        b.startedSessions - a.startedSessions ||
        a.userName.localeCompare(b.userName, "pt-BR"),
    );

  return {
    windowDays: safeWindowDays,
    generatedAt: new Date().toISOString(),
    totals: {
      requests: sessions.length,
      authorized: sessions.filter((session) => session.authorizedAt).length,
      started: sessions.filter((session) => session.startedAt).length,
      completed: sessions.filter((session) => session.endedAt).length,
      denied: sessions.filter((session) => session.status === "denied").length,
      avgCustomerConsentSeconds: average(customerConsentSeconds),
      avgOperatorPickupSeconds: average(operatorPickupSeconds),
      p90OperatorPickupSeconds: percentile(operatorPickupSeconds, 0.9),
      avgRequestToStartSeconds: average(requestToStartSeconds),
      avgHandleSeconds: average(handleSeconds),
      directAttributionSessions,
      historicalFallbackSessions,
      attributionCoveragePercent:
        attributedSessions > 0
          ? Math.round((directAttributionSessions / attributedSessions) * 100)
          : 100,
    },
    agents: agentRows,
  };
}
