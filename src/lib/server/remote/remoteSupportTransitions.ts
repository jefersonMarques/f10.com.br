import { and, eq, gt, inArray } from "drizzle-orm";
import { createHash } from "node:crypto";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  remoteDevices,
  remoteSupportSessions,
} from "$lib/server/db/operationsSettingsSchema";
import { ticketEvents } from "$lib/server/db/supportSchema";
import { getRemoteSupportProvider } from "$lib/server/remote/remoteSupportProvider";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function decideRemoteConsentAtomic(
  token: string,
  decision: "authorize" | "deny",
) {
  const db = getDatabase();
  const now = new Date();
  const status = decision === "authorize" ? "authorized" : "denied";

  const changed = await db.transaction(async (tx) => {
    const [session] = await tx
      .update(remoteSupportSessions)
      .set({
        status,
        authorizedAt: decision === "authorize" ? now : null,
        deniedAt: decision === "deny" ? now : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(remoteSupportSessions.consentTokenHash, hashToken(token)),
          eq(remoteSupportSessions.status, "requested"),
          gt(remoteSupportSessions.consentExpiresAt, now),
        ),
      )
      .returning({
        id: remoteSupportSessions.id,
        ticketId: remoteSupportSessions.ticketId,
      });

    if (!session) throw new Error("REMOTE_CONSENT_INVALID");
    if (session.ticketId) {
      await tx.insert(ticketEvents).values({
        ticketId: session.ticketId,
        eventType: decision === "authorize" ? "remote.authorized" : "remote.denied",
        metadata: { remoteSessionId: session.id },
      });
    }
    return session;
  });

  await recordAuditEvent({
    action: decision === "authorize" ? "remote.authorized" : "remote.denied",
    entityType: "remote_support_session",
    entityId: changed.id,
    metadata: { ticketId: changed.ticketId },
  });
  return status;
}

export async function startRemoteSupportSessionAtomic(
  actorUserId: string,
  sessionId: string,
) {
  const db = getDatabase();
  const [candidate] = await db
    .select({
      providerDeviceId: remoteDevices.providerDeviceId,
      active: remoteDevices.active,
    })
    .from(remoteSupportSessions)
    .leftJoin(remoteDevices, eq(remoteSupportSessions.deviceId, remoteDevices.id))
    .where(and(eq(remoteSupportSessions.id, sessionId), eq(remoteSupportSessions.status, "authorized")))
    .limit(1);

  if (!candidate?.active || !candidate.providerDeviceId) {
    throw new Error("REMOTE_SESSION_NOT_AUTHORIZED");
  }
  const launchUrl = getRemoteSupportProvider().getLaunchUrl(candidate.providerDeviceId);
  const now = new Date();

  const changed = await db.transaction(async (tx) => {
    const [session] = await tx
      .update(remoteSupportSessions)
      .set({
        status: "active",
        startedByUserId: actorUserId,
        startedAt: now,
        updatedAt: now,
      })
      .where(and(eq(remoteSupportSessions.id, sessionId), eq(remoteSupportSessions.status, "authorized")))
      .returning({
        id: remoteSupportSessions.id,
        ticketId: remoteSupportSessions.ticketId,
        deviceId: remoteSupportSessions.deviceId,
      });
    if (!session) throw new Error("REMOTE_SESSION_ALREADY_STARTED");
    if (session.ticketId) {
      await tx.insert(ticketEvents).values({
        ticketId: session.ticketId,
        actorUserId,
        eventType: "remote.started",
        metadata: { remoteSessionId: session.id, deviceId: session.deviceId },
      });
    }
    return session;
  });

  await recordAuditEvent({
    actorUserId,
    action: "remote.started",
    entityType: "remote_support_session",
    entityId: changed.id,
    metadata: { ticketId: changed.ticketId },
  });
  return launchUrl;
}

export async function endRemoteSupportSessionAtomic(
  actorUserId: string,
  sessionId: string,
): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  const changed = await db.transaction(async (tx) => {
    const [session] = await tx
      .update(remoteSupportSessions)
      .set({
        status: "ended",
        endedByUserId: actorUserId,
        endedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(remoteSupportSessions.id, sessionId),
          inArray(remoteSupportSessions.status, ["active", "authorized"]),
        ),
      )
      .returning({ id: remoteSupportSessions.id, ticketId: remoteSupportSessions.ticketId });
    if (!session) throw new Error("REMOTE_SESSION_NOT_ACTIVE");
    if (session.ticketId) {
      await tx.insert(ticketEvents).values({
        ticketId: session.ticketId,
        actorUserId,
        eventType: "remote.ended",
        metadata: { remoteSessionId: session.id },
      });
    }
    return session;
  });

  await recordAuditEvent({
    actorUserId,
    action: "remote.ended",
    entityType: "remote_support_session",
    entityId: changed.id,
    metadata: { ticketId: changed.ticketId },
  });
}
