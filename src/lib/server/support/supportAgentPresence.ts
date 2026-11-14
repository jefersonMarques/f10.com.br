import { eq, inArray, sql } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  supportAgentPresence,
  supportPresenceIntervals,
  type SupportAgentManualStatus,
} from "$lib/server/db/supportRoutingSchema";

export const SUPPORT_AWAY_AFTER_MS = 10 * 60_000;

export type SupportAgentEffectiveStatus = SupportAgentManualStatus | "away";

export type SupportAgentPresenceState = {
  manualStatus: SupportAgentManualStatus;
  effectiveStatus: SupportAgentEffectiveStatus;
  lastActivityAt: Date | null;
};

type LockedPresence = {
  manual_status: SupportAgentManualStatus;
  last_activity_at: Date | null;
};

function effectiveStatus(
  manualStatus: SupportAgentManualStatus,
  lastActivityAt: Date | null,
  now = new Date(),
): SupportAgentEffectiveStatus {
  if (manualStatus === "offline") return "offline";
  if (!lastActivityAt || lastActivityAt.getTime() <= now.getTime() - SUPPORT_AWAY_AFTER_MS) {
    return "away";
  }
  return manualStatus;
}

export function isSupportAgentManualStatus(
  value: string,
): value is SupportAgentManualStatus {
  return value === "online" || value === "busy" || value === "offline";
}

export async function getSupportAgentPresence(userId: string): Promise<SupportAgentPresenceState> {
  const [row] = await getDatabase()
    .select({
      manualStatus: supportAgentPresence.manualStatus,
      lastActivityAt: supportAgentPresence.lastActivityAt,
    })
    .from(supportAgentPresence)
    .where(eq(supportAgentPresence.userId, userId))
    .limit(1);

  const manualStatus = row?.manualStatus ?? "offline";
  const lastActivityAt = row?.lastActivityAt ?? null;
  return {
    manualStatus,
    effectiveStatus: effectiveStatus(manualStatus, lastActivityAt),
    lastActivityAt,
  };
}

export async function listSupportAgentPresence(
  userIds: string[],
): Promise<Map<string, SupportAgentPresenceState>> {
  const uniqueIds = Array.from(new Set(userIds));
  const result = new Map<string, SupportAgentPresenceState>();
  if (!uniqueIds.length) return result;

  const rows = await getDatabase()
    .select({
      userId: supportAgentPresence.userId,
      manualStatus: supportAgentPresence.manualStatus,
      lastActivityAt: supportAgentPresence.lastActivityAt,
    })
    .from(supportAgentPresence)
    .where(inArray(supportAgentPresence.userId, uniqueIds));

  const current = new Map(rows.map((row) => [row.userId, row]));
  const now = new Date();
  for (const userId of uniqueIds) {
    const row = current.get(userId);
    const manualStatus = row?.manualStatus ?? "offline";
    const lastActivityAt = row?.lastActivityAt ?? null;
    result.set(userId, {
      manualStatus,
      effectiveStatus: effectiveStatus(manualStatus, lastActivityAt, now),
      lastActivityAt,
    });
  }
  return result;
}

export async function setSupportAgentManualStatus(
  actorUserId: string,
  status: SupportAgentManualStatus,
): Promise<SupportAgentPresenceState> {
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    // O bloqueio de linha serializa mudanças de status e heartbeats por usuário.
    await tx.execute(sql`
      SELECT user_id FROM support_agent_presence
      WHERE user_id = ${actorUserId}::uuid FOR UPDATE
    `);

    await tx.insert(supportAgentPresence).values({
      userId: actorUserId,
      manualStatus: status,
      lastActivityAt: status === "offline" ? null : now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: supportAgentPresence.userId,
      set: {
        manualStatus: status,
        lastActivityAt: status === "offline" ? null : now,
        updatedAt: now,
      },
    });

    await tx.execute(sql`
      UPDATE support_presence_intervals
      SET ended_at = LEAST(${now}::timestamptz, last_activity_at + interval '10 minutes'),
          close_reason = CASE
            WHEN last_activity_at + interval '10 minutes' < ${now}::timestamptz
              THEN 'away'
            ELSE 'status'
          END
      WHERE user_id = ${actorUserId}::uuid AND ended_at IS NULL
    `);

    if (status !== "offline") {
      await tx.insert(supportPresenceIntervals).values({
        userId: actorUserId,
        status,
        startedAt: now,
        lastActivityAt: now,
      });
    }
  });

  await recordAuditEvent({
    actorUserId,
    action: "support.presence.changed",
    entityType: "user",
    entityId: actorUserId,
    metadata: { status },
  });

  return {
    manualStatus: status,
    effectiveStatus: status,
    lastActivityAt: status === "offline" ? null : now,
  };
}

export async function heartbeatSupportAgent(
  userId: string,
): Promise<SupportAgentPresenceState> {
  const db = getDatabase();
  const now = new Date();

  const state = await db.transaction(async (tx) => {
    const rows = await tx.execute(sql`
      SELECT manual_status, last_activity_at FROM support_agent_presence
      WHERE user_id = ${userId}::uuid FOR UPDATE
    `);
    const previous = (rows as unknown as LockedPresence[])[0];
    if (!previous || previous.manual_status === "offline") return null;

    const stale = !previous.last_activity_at ||
      previous.last_activity_at.getTime() <= now.getTime() - SUPPORT_AWAY_AFTER_MS;

    if (stale) {
      await tx.execute(sql`
        UPDATE support_presence_intervals
        SET ended_at = LEAST(${now}::timestamptz, last_activity_at + interval '10 minutes'),
            close_reason = 'away'
        WHERE user_id = ${userId}::uuid AND ended_at IS NULL
      `);
    }

    const open = await tx.execute(sql`
      SELECT id FROM support_presence_intervals
      WHERE user_id = ${userId}::uuid AND ended_at IS NULL
      LIMIT 1
    `);

    if ((open as unknown as Array<{ id: string }>).length) {
      await tx.execute(sql`
        UPDATE support_presence_intervals SET last_activity_at = ${now}
        WHERE user_id = ${userId}::uuid AND ended_at IS NULL
      `);
    } else {
      // Para usuários já online na implantação, a medição começa no primeiro heartbeat.
      await tx.insert(supportPresenceIntervals).values({
        userId,
        status: previous.manual_status,
        startedAt: now,
        lastActivityAt: now,
      });
    }

    await tx.update(supportAgentPresence)
      .set({ lastActivityAt: now, updatedAt: now })
      .where(eq(supportAgentPresence.userId, userId));

    return previous.manual_status;
  });

  if (!state) return getSupportAgentPresence(userId);
  return { manualStatus: state, effectiveStatus: state, lastActivityAt: now };
}
