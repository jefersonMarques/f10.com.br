import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, inArray, or } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  remoteDevices,
  remoteSupportSessions,
} from "$lib/server/db/operationsSettingsSchema";
import { users } from "$lib/server/db/schema";
import { webChatSessions } from "$lib/server/db/chatSchema";
import {
  customerContacts,
  customerOrganizations,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";
import { getGeneralOperationsSettings } from "$lib/server/settings/operationsSettingsRepository";
import { getRemoteSupportProvider } from "$lib/server/remote/remoteSupportProvider";

export type RemoteAccessScope = "own" | "team" | "all";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function listRemoteDevices(limit = 300) {
  const db = getDatabase();
  return db
    .select({
      id: remoteDevices.id,
      name: remoteDevices.name,
      provider: remoteDevices.provider,
      providerDeviceId: remoteDevices.providerDeviceId,
      active: remoteDevices.active,
      customerContactId: remoteDevices.customerContactId,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      customerOrganizationId: remoteDevices.customerOrganizationId,
      organizationName: customerOrganizations.name,
      updatedAt: remoteDevices.updatedAt,
    })
    .from(remoteDevices)
    .leftJoin(customerContacts, eq(remoteDevices.customerContactId, customerContacts.id))
    .leftJoin(customerOrganizations, eq(remoteDevices.customerOrganizationId, customerOrganizations.id))
    .orderBy(desc(remoteDevices.updatedAt))
    .limit(Math.min(Math.max(limit, 1), 500));
}

export async function registerRemoteDevice(
  actorUserId: string,
  input: { name: string; providerDeviceId: string; customerEmail?: string },
) {
  const db = getDatabase();
  const email = input.customerEmail?.trim().toLowerCase() ?? "";
  let customerContactId: string | null = null;
  let customerOrganizationId: string | null = null;

  if (email) {
    const [contact] = await db
      .select({ id: customerContacts.id, organizationId: customerContacts.organizationId })
      .from(customerContacts)
      .where(and(eq(customerContacts.email, email), eq(customerContacts.active, true)))
      .limit(1);
    if (!contact) throw new Error("REMOTE_CUSTOMER_NOT_FOUND");
    customerContactId = contact.id;
    customerOrganizationId = contact.organizationId ?? null;
  }

  const [device] = await db
    .insert(remoteDevices)
    .values({
      name: input.name.trim().slice(0, 160),
      provider: "meshcentral",
      providerDeviceId: input.providerDeviceId.trim().slice(0, 500),
      customerContactId,
      customerOrganizationId,
      createdBy: actorUserId,
    })
    .onConflictDoUpdate({
      target: [remoteDevices.provider, remoteDevices.providerDeviceId],
      set: {
        name: input.name.trim().slice(0, 160),
        customerContactId,
        customerOrganizationId,
        active: true,
        updatedAt: new Date(),
      },
    })
    .returning({ id: remoteDevices.id });

  if (!device) throw new Error("REMOTE_DEVICE_NOT_CREATED");
  await recordAuditEvent({
    actorUserId,
    action: "remote.device.registered",
    entityType: "remote_device",
    entityId: device.id,
    metadata: { provider: "meshcentral", customerContactId },
  });
  return device.id;
}

export async function listRemoteSessions(
  actorUserId: string,
  scope: RemoteAccessScope,
  limit = 200,
) {
  const db = getDatabase();
  const query = db
    .select({
      id: remoteSupportSessions.id,
      status: remoteSupportSessions.status,
      ticketId: remoteSupportSessions.ticketId,
      deviceId: remoteSupportSessions.deviceId,
      deviceName: remoteDevices.name,
      customerName: customerContacts.name,
      requestedByUserId: remoteSupportSessions.requestedByUserId,
      requestedByName: users.name,
      requestedAt: remoteSupportSessions.requestedAt,
      authorizedAt: remoteSupportSessions.authorizedAt,
      startedAt: remoteSupportSessions.startedAt,
      endedAt: remoteSupportSessions.endedAt,
      updatedAt: remoteSupportSessions.updatedAt,
    })
    .from(remoteSupportSessions)
    .leftJoin(remoteDevices, eq(remoteSupportSessions.deviceId, remoteDevices.id))
    .leftJoin(customerContacts, eq(remoteSupportSessions.customerContactId, customerContacts.id))
    .leftJoin(users, eq(remoteSupportSessions.requestedByUserId, users.id))
    .orderBy(desc(remoteSupportSessions.updatedAt))
    .limit(Math.min(Math.max(limit, 1), 500));

  return scope === "all"
    ? query
    : query.where(eq(remoteSupportSessions.requestedByUserId, actorUserId));
}

export async function getRemoteDevicesForTicket(ticketId: string) {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      customerContactId: tickets.customerContactId,
      organizationId: customerContacts.organizationId,
    })
    .from(tickets)
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!ticket?.customerContactId) return [];

  const condition = ticket.organizationId
    ? or(
        eq(remoteDevices.customerContactId, ticket.customerContactId),
        eq(remoteDevices.customerOrganizationId, ticket.organizationId),
      )
    : eq(remoteDevices.customerContactId, ticket.customerContactId);

  return db
    .select({ id: remoteDevices.id, name: remoteDevices.name, providerDeviceId: remoteDevices.providerDeviceId })
    .from(remoteDevices)
    .where(and(eq(remoteDevices.active, true), condition));
}

async function requireEligibleDevice(ticketId: string, deviceId: string) {
  const devices = await getRemoteDevicesForTicket(ticketId);
  const device = devices.find((item) => item.id === deviceId);
  if (!device) throw new Error("REMOTE_DEVICE_NOT_ELIGIBLE");
  return device;
}

export async function requestRemoteSupport(
  actorUserId: string,
  ticketId: string,
  deviceId: string,
  consentBaseUrl: string,
) {
  const device = await requireEligibleDevice(ticketId, deviceId);
  const db = getDatabase();
  const [ticket] = await db
    .select({ customerContactId: tickets.customerContactId, channel: tickets.channel })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);
  if (!ticket?.customerContactId) throw new Error("REMOTE_TICKET_CUSTOMER_REQUIRED");

  const token = randomBytes(32).toString("base64url");
  const settings = await getGeneralOperationsSettings();
  const consentExpiresAt = new Date(Date.now() + settings.remoteConsentMinutes * 60_000);
  const [chat] = await db
    .select({ id: webChatSessions.id })
    .from(webChatSessions)
    .where(eq(webChatSessions.ticketId, ticketId))
    .limit(1);
  const now = new Date();

  const [session] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(remoteSupportSessions)
      .values({
        ticketId,
        webChatSessionId: chat?.id ?? null,
        customerContactId: ticket.customerContactId,
        deviceId,
        requestedByUserId: actorUserId,
        status: "requested",
        consentTokenHash: hashToken(token),
        consentExpiresAt,
        requestedAt: now,
        updatedAt: now,
      })
      .returning({ id: remoteSupportSessions.id });
    if (!created) throw new Error("REMOTE_SESSION_NOT_CREATED");

    const consentUrl = `${consentBaseUrl.replace(/\/$/, "")}/suporte-remoto/${encodeURIComponent(token)}`;
    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "system",
      customerContactId: ticket.customerContactId,
      visibility: "public",
      channel: ticket.channel,
      body: `A equipe F10 solicitou acesso remoto ao computador “${device.name}”. Autorize ou recuse com segurança neste link: ${consentUrl}`,
    });
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "remote.requested",
      metadata: { remoteSessionId: created.id, deviceId, consentExpiresAt: consentExpiresAt.toISOString() },
    });
    return [created];
  });

  await recordAuditEvent({
    actorUserId,
    action: "remote.requested",
    entityType: "remote_support_session",
    entityId: session.id,
    metadata: { ticketId, deviceId },
  });
  return { id: session.id, consentExpiresAt };
}

export async function getRemoteConsentByToken(token: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      id: remoteSupportSessions.id,
      status: remoteSupportSessions.status,
      consentExpiresAt: remoteSupportSessions.consentExpiresAt,
      deviceName: remoteDevices.name,
      customerName: customerContacts.name,
      ticketId: remoteSupportSessions.ticketId,
    })
    .from(remoteSupportSessions)
    .leftJoin(remoteDevices, eq(remoteSupportSessions.deviceId, remoteDevices.id))
    .leftJoin(customerContacts, eq(remoteSupportSessions.customerContactId, customerContacts.id))
    .where(eq(remoteSupportSessions.consentTokenHash, hashToken(token)))
    .limit(1);
  if (!row) return null;
  const expired = row.consentExpiresAt <= new Date();
  return { ...row, expired };
}

export async function decideRemoteConsent(token: string, decision: "authorize" | "deny") {
  const db = getDatabase();
  const now = new Date();
  const [session] = await db
    .select({ id: remoteSupportSessions.id, ticketId: remoteSupportSessions.ticketId })
    .from(remoteSupportSessions)
    .where(
      and(
        eq(remoteSupportSessions.consentTokenHash, hashToken(token)),
        eq(remoteSupportSessions.status, "requested"),
        gt(remoteSupportSessions.consentExpiresAt, now),
      ),
    )
    .limit(1);
  if (!session) throw new Error("REMOTE_CONSENT_INVALID");
  const status = decision === "authorize" ? "authorized" : "denied";

  await db.transaction(async (tx) => {
    await tx
      .update(remoteSupportSessions)
      .set({
        status,
        authorizedAt: decision === "authorize" ? now : null,
        deniedAt: decision === "deny" ? now : null,
        updatedAt: now,
      })
      .where(and(eq(remoteSupportSessions.id, session.id), eq(remoteSupportSessions.status, "requested")));
    if (session.ticketId) {
      await tx.insert(ticketEvents).values({
        ticketId: session.ticketId,
        eventType: decision === "authorize" ? "remote.authorized" : "remote.denied",
        metadata: { remoteSessionId: session.id },
      });
    }
  });
  await recordAuditEvent({
    action: decision === "authorize" ? "remote.authorized" : "remote.denied",
    entityType: "remote_support_session",
    entityId: session.id,
    metadata: { ticketId: session.ticketId },
  });
  return status;
}

export async function startRemoteSupportSession(actorUserId: string, sessionId: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      id: remoteSupportSessions.id,
      status: remoteSupportSessions.status,
      ticketId: remoteSupportSessions.ticketId,
      deviceId: remoteDevices.id,
      providerDeviceId: remoteDevices.providerDeviceId,
      active: remoteDevices.active,
    })
    .from(remoteSupportSessions)
    .leftJoin(remoteDevices, eq(remoteSupportSessions.deviceId, remoteDevices.id))
    .where(eq(remoteSupportSessions.id, sessionId))
    .limit(1);
  if (!row || row.status !== "authorized" || !row.active || !row.providerDeviceId) {
    throw new Error("REMOTE_SESSION_NOT_AUTHORIZED");
  }
  const provider = getRemoteSupportProvider();
  const launchUrl = provider.getLaunchUrl(row.providerDeviceId);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(remoteSupportSessions).set({ status: "active", startedAt: now, updatedAt: now }).where(and(eq(remoteSupportSessions.id, sessionId), eq(remoteSupportSessions.status, "authorized")));
    if (row.ticketId) await tx.insert(ticketEvents).values({ ticketId: row.ticketId, actorUserId, eventType: "remote.started", metadata: { remoteSessionId: sessionId, deviceId: row.deviceId } });
  });
  await recordAuditEvent({ actorUserId, action: "remote.started", entityType: "remote_support_session", entityId: sessionId, metadata: { ticketId: row.ticketId } });
  return launchUrl;
}

export async function endRemoteSupportSession(actorUserId: string, sessionId: string): Promise<void> {
  const db = getDatabase();
  const [row] = await db
    .select({ ticketId: remoteSupportSessions.ticketId })
    .from(remoteSupportSessions)
    .where(and(eq(remoteSupportSessions.id, sessionId), inArray(remoteSupportSessions.status, ["active", "authorized"])))
    .limit(1);
  if (!row) throw new Error("REMOTE_SESSION_NOT_ACTIVE");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(remoteSupportSessions).set({ status: "ended", endedAt: now, updatedAt: now }).where(eq(remoteSupportSessions.id, sessionId));
    if (row.ticketId) await tx.insert(ticketEvents).values({ ticketId: row.ticketId, actorUserId, eventType: "remote.ended", metadata: { remoteSessionId: sessionId } });
  });
  await recordAuditEvent({ actorUserId, action: "remote.ended", entityType: "remote_support_session", entityId: sessionId, metadata: { ticketId: row.ticketId } });
}

export async function getRemoteSupportSession(sessionId: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      id: remoteSupportSessions.id,
      status: remoteSupportSessions.status,
      ticketId: remoteSupportSessions.ticketId,
      deviceName: remoteDevices.name,
      providerDeviceId: remoteDevices.providerDeviceId,
      customerName: customerContacts.name,
      requestedByName: users.name,
      requestedAt: remoteSupportSessions.requestedAt,
      consentExpiresAt: remoteSupportSessions.consentExpiresAt,
      authorizedAt: remoteSupportSessions.authorizedAt,
      deniedAt: remoteSupportSessions.deniedAt,
      startedAt: remoteSupportSessions.startedAt,
      endedAt: remoteSupportSessions.endedAt,
      failureReason: remoteSupportSessions.failureReason,
    })
    .from(remoteSupportSessions)
    .leftJoin(remoteDevices, eq(remoteSupportSessions.deviceId, remoteDevices.id))
    .leftJoin(customerContacts, eq(remoteSupportSessions.customerContactId, customerContacts.id))
    .leftJoin(users, eq(remoteSupportSessions.requestedByUserId, users.id))
    .where(eq(remoteSupportSessions.id, sessionId))
    .limit(1);
  return row ?? null;
}
