import { and, eq, gt, inArray, isNull } from "drizzle-orm";
import { createHash } from "node:crypto";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import {
  remoteDevices,
  remoteSupportSessions,
} from "$lib/server/db/operationsSettingsSchema";
import { ticketEvents } from "$lib/server/db/supportSchema";
import {
  createMeshCentralDesktopShare,
  revokeMeshCentralDesktopShare,
} from "$lib/server/remote/meshCentralControl";

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
        requestedByUserId: remoteSupportSessions.requestedByUserId,
      });

    if (!session) throw new Error("REMOTE_CONSENT_INVALID");
    if (session.ticketId) {
      await tx.insert(ticketEvents).values({
        ticketId: session.ticketId,
        eventType: decision === "authorize" ? "remote.authorized" : "remote.denied",
        metadata: { remoteSessionId: session.id },
      });
    }

    if (session.requestedByUserId) {
      await tx.insert(internalNotifications).values({
        userId: session.requestedByUserId,
        kind: decision === "authorize" ? "remote.authorized" : "remote.denied",
        title: decision === "authorize"
          ? "Cliente autorizou o acesso remoto"
          : "Cliente recusou o acesso remoto",
        body: session.ticketId
          ? "A solicitação de acesso remoto do ticket foi respondida pelo cliente."
          : "A solicitação de acesso remoto foi respondida pelo cliente.",
        href: session.ticketId
          ? `/app/tickets/${session.ticketId}/remote`
          : `/app/remote/${session.id}`,
        entityType: session.ticketId ? "ticket" : "system",
        entityId: session.ticketId ?? session.id,
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
      status: remoteSupportSessions.status,
      providerSessionId: remoteSupportSessions.providerSessionId,
      providerDeviceId: remoteDevices.providerDeviceId,
      deviceName: remoteDevices.name,
      active: remoteDevices.active,
    })
    .from(remoteSupportSessions)
    .leftJoin(remoteDevices, eq(remoteSupportSessions.deviceId, remoteDevices.id))
    .where(eq(remoteSupportSessions.id, sessionId))
    .limit(1);

  if (
    !candidate?.active ||
    !candidate.providerDeviceId ||
    !["authorized", "active"].includes(candidate.status)
  ) {
    throw new Error("REMOTE_SESSION_NOT_AUTHORIZED");
  }

  if (candidate.providerSessionId) {
    await revokeMeshCentralDesktopShare(
      candidate.providerDeviceId,
      candidate.providerSessionId,
    );
  }

  const share = await createMeshCentralDesktopShare(
    candidate.providerDeviceId,
    `F10 - ${candidate.deviceName || sessionId.slice(0, 8)}`,
  );
  const now = new Date();
  const firstStart = candidate.status === "authorized";
  const providerSessionCondition = candidate.providerSessionId
    ? eq(remoteSupportSessions.providerSessionId, candidate.providerSessionId)
    : isNull(remoteSupportSessions.providerSessionId);

  try {
    const changed = await db.transaction(async (tx) => {
      const values = firstStart
        ? {
            status: "active" as const,
            startedByUserId: actorUserId,
            startedAt: now,
            providerSessionId: share.id,
            providerSessionExpiresAt: share.expiresAt,
            updatedAt: now,
          }
        : {
            providerSessionId: share.id,
            providerSessionExpiresAt: share.expiresAt,
            updatedAt: now,
          };

      const [session] = await tx
        .update(remoteSupportSessions)
        .set(values)
        .where(
          and(
            eq(remoteSupportSessions.id, sessionId),
            eq(remoteSupportSessions.status, candidate.status),
            providerSessionCondition,
          ),
        )
        .returning({
          id: remoteSupportSessions.id,
          ticketId: remoteSupportSessions.ticketId,
          deviceId: remoteSupportSessions.deviceId,
        });
      if (!session) throw new Error("REMOTE_SESSION_STATE_CHANGED");

      if (session.ticketId) {
        await tx.insert(ticketEvents).values({
          ticketId: session.ticketId,
          actorUserId,
          eventType: firstStart ? "remote.started" : "remote.reconnected",
          metadata: {
            remoteSessionId: session.id,
            deviceId: session.deviceId,
            providerSessionExpiresAt: share.expiresAt.toISOString(),
          },
        });
      }
      return session;
    });

    await recordAuditEvent({
      actorUserId,
      action: firstStart ? "remote.started" : "remote.reconnected",
      entityType: "remote_support_session",
      entityId: changed.id,
      metadata: {
        ticketId: changed.ticketId,
        providerSessionExpiresAt: share.expiresAt.toISOString(),
      },
    });
  } catch (cause) {
    try {
      await revokeMeshCentralDesktopShare(candidate.providerDeviceId, share.id);
    } catch {
      // Se a revogação de rollback falhar, o próprio share temporário ainda expirará.
    }
    throw cause;
  }

  return {
    desktopUrl: share.url,
    expiresAt: share.expiresAt,
  };
}

export async function endRemoteSupportSessionAtomic(
  actorUserId: string,
  sessionId: string,
): Promise<void> {
  const db = getDatabase();
  const [candidate] = await db
    .select({
      status: remoteSupportSessions.status,
      providerSessionId: remoteSupportSessions.providerSessionId,
      providerDeviceId: remoteDevices.providerDeviceId,
    })
    .from(remoteSupportSessions)
    .leftJoin(remoteDevices, eq(remoteSupportSessions.deviceId, remoteDevices.id))
    .where(
      and(
        eq(remoteSupportSessions.id, sessionId),
        inArray(remoteSupportSessions.status, ["active", "authorized"]),
      ),
    )
    .limit(1);

  if (!candidate) throw new Error("REMOTE_SESSION_NOT_ACTIVE");
  if (candidate.providerSessionId) {
    if (!candidate.providerDeviceId) throw new Error("REMOTE_PROVIDER_DEVICE_MISSING");
    await revokeMeshCentralDesktopShare(
      candidate.providerDeviceId,
      candidate.providerSessionId,
    );
  }

  const providerSessionCondition = candidate.providerSessionId
    ? eq(remoteSupportSessions.providerSessionId, candidate.providerSessionId)
    : isNull(remoteSupportSessions.providerSessionId);
  const now = new Date();
  const changed = await db.transaction(async (tx) => {
    const [session] = await tx
      .update(remoteSupportSessions)
      .set({
        status: "ended",
        endedByUserId: actorUserId,
        providerSessionId: null,
        providerSessionExpiresAt: null,
        endedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(remoteSupportSessions.id, sessionId),
          inArray(remoteSupportSessions.status, ["active", "authorized"]),
          providerSessionCondition,
        ),
      )
      .returning({ id: remoteSupportSessions.id, ticketId: remoteSupportSessions.ticketId });
    if (!session) throw new Error("REMOTE_SESSION_STATE_CHANGED");
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
