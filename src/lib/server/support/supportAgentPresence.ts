import { and, eq, inArray, ne } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  supportAgentPresence,
  type SupportAgentManualStatus,
} from "$lib/server/db/supportRoutingSchema";

export const SUPPORT_AWAY_AFTER_MS = 10 * 60_000;

export type SupportAgentEffectiveStatus =
  | SupportAgentManualStatus
  | "away";

export type SupportAgentPresenceState = {
  manualStatus: SupportAgentManualStatus;
  effectiveStatus: SupportAgentEffectiveStatus;
  lastActivityAt: Date | null;
};

function effectiveStatus(
  manualStatus: SupportAgentManualStatus,
  lastActivityAt: Date | null,
  now = new Date(),
): SupportAgentEffectiveStatus {
  if (manualStatus === "offline") return "offline";
  if (!lastActivityAt) return "away";
  if (lastActivityAt.getTime() <= now.getTime() - SUPPORT_AWAY_AFTER_MS) {
    return "away";
  }
  return manualStatus;
}

export function isSupportAgentManualStatus(
  value: string,
): value is SupportAgentManualStatus {
  return value === "online" || value === "busy" || value === "offline";
}

export async function getSupportAgentPresence(
  userId: string,
): Promise<SupportAgentPresenceState> {
  const db = getDatabase();
  const [row] = await db
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
  if (uniqueIds.length === 0) return result;

  const db = getDatabase();
  const rows = await db
    .select({
      userId: supportAgentPresence.userId,
      manualStatus: supportAgentPresence.manualStatus,
      lastActivityAt: supportAgentPresence.lastActivityAt,
    })
    .from(supportAgentPresence)
    .where(inArray(supportAgentPresence.userId, uniqueIds));
  const now = new Date();

  for (const userId of uniqueIds) {
    const row = rows.find((candidate) => candidate.userId === userId);
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
  await db
    .insert(supportAgentPresence)
    .values({
      userId: actorUserId,
      manualStatus: status,
      lastActivityAt: status === "offline" ? null : now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: supportAgentPresence.userId,
      set: {
        manualStatus: status,
        lastActivityAt: status === "offline" ? null : now,
        updatedAt: now,
      },
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
  const [updated] = await db
    .update(supportAgentPresence)
    .set({ lastActivityAt: now, updatedAt: now })
    .where(
      and(
        eq(supportAgentPresence.userId, userId),
        ne(supportAgentPresence.manualStatus, "offline"),
      ),
    )
    .returning({ manualStatus: supportAgentPresence.manualStatus });

  if (!updated) return getSupportAgentPresence(userId);
  return {
    manualStatus: updated.manualStatus,
    effectiveStatus: updated.manualStatus,
    lastActivityAt: now,
  };
}
