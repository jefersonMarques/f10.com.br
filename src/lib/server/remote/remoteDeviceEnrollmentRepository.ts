import { createHash, randomBytes } from "node:crypto";
import { env } from "$env/dynamic/private";
import { and, eq, inArray, lt, or } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import {
  remoteCustomerGroups,
  remoteDeviceEnrollments,
  remoteDevices,
  remoteSupportSessions,
} from "$lib/server/db/operationsSettingsSchema";
import {
  customerContacts,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";
import {
  buildMeshCentralAgentDownloadUrl,
  ensureMeshCentralDeviceGroup,
  listMeshCentralDevices,
} from "$lib/server/remote/meshCentralControl";

function hashToken(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function enrollmentHours(): number {
  const parsed = Number.parseInt(env.REMOTE_ENROLLMENT_HOURS ?? "24", 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 168) return 24;
  return parsed;
}

function groupName(input: { organizationId: string | null; contactId: string }): string {
  const id = (input.organizationId ?? input.contactId).replaceAll("-", "").slice(0, 20);
  return input.organizationId ? `F10-ORG-${id}` : `F10-CONTATO-${id}`;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

async function getTicketSubject(ticketId: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      ticketId: tickets.id,
      channel: tickets.channel,
      customerContactId: tickets.customerContactId,
      customerOrganizationId: customerContacts.organizationId,
      customerName: customerContacts.name,
    })
    .from(tickets)
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!row?.customerContactId) throw new Error("REMOTE_TICKET_CUSTOMER_REQUIRED");

  const [chat] = await db
    .select({ id: webChatSessions.id })
    .from(webChatSessions)
    .where(eq(webChatSessions.ticketId, ticketId))
    .limit(1);

  return {
    ...row,
    customerContactId: row.customerContactId,
    customerOrganizationId: row.customerOrganizationId ?? null,
    webChatSessionId: chat?.id ?? null,
  };
}

type TicketSubject = Awaited<ReturnType<typeof getTicketSubject>>;

async function findCustomerGroup(subject: TicketSubject) {
  const db = getDatabase();
  const subjectCondition = subject.customerOrganizationId
    ? eq(remoteCustomerGroups.customerOrganizationId, subject.customerOrganizationId)
    : eq(remoteCustomerGroups.customerContactId, subject.customerContactId);

  const [group] = await db
    .select()
    .from(remoteCustomerGroups)
    .where(
      and(
        eq(remoteCustomerGroups.provider, "meshcentral"),
        subjectCondition,
      ),
    )
    .limit(1);

  return group ?? null;
}

async function getOrCreateCustomerGroup(ticketId: string) {
  const subject = await getTicketSubject(ticketId);
  const existing = await findCustomerGroup(subject);
  if (existing) return { subject, group: existing };

  const providerGroup = await ensureMeshCentralDeviceGroup(
    groupName({
      organizationId: subject.customerOrganizationId,
      contactId: subject.customerContactId,
    }),
  );
  const db = getDatabase();

  const [created] = await db
    .insert(remoteCustomerGroups)
    .values({
      customerContactId: subject.customerOrganizationId ? null : subject.customerContactId,
      customerOrganizationId: subject.customerOrganizationId,
      provider: "meshcentral",
      providerGroupId: providerGroup.id,
      providerGroupName: providerGroup.name,
    })
    .onConflictDoNothing()
    .returning();

  if (created) return { subject, group: created };

  const concurrent = await findCustomerGroup(subject);
  if (!concurrent) throw new Error("REMOTE_CUSTOMER_GROUP_NOT_CREATED");
  return { subject, group: concurrent };
}

function deviceMetadata(raw: Record<string, unknown>): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const key of ["osdesc", "ip", "agent", "icon", "pwr", "conn"]) {
    const value = raw[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      metadata[key] = value;
    }
  }
  return metadata;
}

export async function syncRemoteDevicesForTicket(ticketId: string) {
  const subject = await getTicketSubject(ticketId);
  const group = await findCustomerGroup(subject);
  if (!group) return [];

  const providerDevices = await listMeshCentralDevices(group.providerGroupName);
  const db = getDatabase();
  const now = new Date();
  const deviceContactId = subject.customerOrganizationId
    ? null
    : subject.customerContactId;

  await db
    .update(remoteDevices)
    .set({ online: false, updatedAt: now })
    .where(
      and(
        eq(remoteDevices.provider, "meshcentral"),
        eq(remoteDevices.providerGroupId, group.providerGroupId),
      ),
    );

  const synced: Array<{
    id: string;
    providerDeviceId: string;
    name: string;
    online: boolean;
  }> = [];

  for (const providerDevice of providerDevices) {
    const [device] = await db
      .insert(remoteDevices)
      .values({
        customerContactId: deviceContactId,
        customerOrganizationId: subject.customerOrganizationId,
        name: providerDevice.name.slice(0, 160),
        provider: "meshcentral",
        providerDeviceId: providerDevice.id,
        providerGroupId: group.providerGroupId,
        active: true,
        online: providerDevice.online,
        lastSeenAt: now,
        lastOnlineAt: providerDevice.online ? now : null,
        metadata: deviceMetadata(providerDevice.raw),
      })
      .onConflictDoUpdate({
        target: [remoteDevices.provider, remoteDevices.providerDeviceId],
        set: {
          customerContactId: deviceContactId,
          customerOrganizationId: subject.customerOrganizationId,
          name: providerDevice.name.slice(0, 160),
          providerGroupId: group.providerGroupId,
          active: true,
          online: providerDevice.online,
          lastSeenAt: now,
          ...(providerDevice.online ? { lastOnlineAt: now } : {}),
          metadata: deviceMetadata(providerDevice.raw),
          updatedAt: now,
        },
      })
      .returning({
        id: remoteDevices.id,
        providerDeviceId: remoteDevices.providerDeviceId,
        name: remoteDevices.name,
        online: remoteDevices.online,
      });
    if (device) synced.push(device);
  }

  await db
    .update(remoteDeviceEnrollments)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(remoteDeviceEnrollments.remoteCustomerGroupId, group.id),
        inArray(remoteDeviceEnrollments.status, ["pending", "downloaded"]),
        lt(remoteDeviceEnrollments.expiresAt, now),
      ),
    );

  const [enrollment] = await db
    .select()
    .from(remoteDeviceEnrollments)
    .where(
      and(
        eq(remoteDeviceEnrollments.remoteCustomerGroupId, group.id),
        inArray(remoteDeviceEnrollments.status, ["pending", "downloaded"]),
      ),
    )
    .limit(1);

  if (enrollment) {
    const baseline = isStringArray(enrollment.baselineProviderDeviceIds)
      ? new Set(enrollment.baselineProviderDeviceIds)
      : new Set<string>();
    const discovered = synced.find(
      (device) => !baseline.has(device.providerDeviceId),
    );

    if (discovered) {
      await db.transaction(async (tx) => {
        await tx
          .update(remoteDeviceEnrollments)
          .set({
            status: "completed",
            deviceId: discovered.id,
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(remoteDeviceEnrollments.id, enrollment.id));
        if (enrollment.ticketId) {
          await tx.insert(ticketEvents).values({
            ticketId: enrollment.ticketId,
            eventType: "remote.device.enrolled",
            metadata: {
              enrollmentId: enrollment.id,
              deviceId: discovered.id,
              deviceName: discovered.name,
            },
          });
        }
      });
      await recordAuditEvent({
        actorUserId: enrollment.requestedByUserId,
        action: "remote.device.enrolled",
        entityType: "remote_device",
        entityId: discovered.id,
        metadata: {
          enrollmentId: enrollment.id,
          ticketId: enrollment.ticketId,
        },
      });
    }
  }

  return synced;
}

export async function listKnownRemoteDevicesForTicket(ticketId: string) {
  const subject = await getTicketSubject(ticketId);
  const db = getDatabase();
  const condition = subject.customerOrganizationId
    ? or(
        eq(remoteDevices.customerContactId, subject.customerContactId),
        eq(remoteDevices.customerOrganizationId, subject.customerOrganizationId),
      )
    : eq(remoteDevices.customerContactId, subject.customerContactId);

  return db
    .select({
      id: remoteDevices.id,
      name: remoteDevices.name,
      online: remoteDevices.online,
      lastSeenAt: remoteDevices.lastSeenAt,
      lastOnlineAt: remoteDevices.lastOnlineAt,
      providerDeviceId: remoteDevices.providerDeviceId,
    })
    .from(remoteDevices)
    .where(and(eq(remoteDevices.active, true), condition));
}

export async function createRemoteDeviceEnrollment(
  actorUserId: string,
  ticketId: string,
  publicBaseUrl: string,
) {
  const { subject, group } = await getOrCreateCustomerGroup(ticketId);
  const providerDevices = await listMeshCentralDevices(group.providerGroupName);
  const baselineProviderDeviceIds = providerDevices.map((device) => device.id);
  const db = getDatabase();
  const now = new Date();

  await db
    .update(remoteDeviceEnrollments)
    .set({ status: "cancelled", updatedAt: now })
    .where(
      and(
        eq(remoteDeviceEnrollments.remoteCustomerGroupId, group.id),
        inArray(remoteDeviceEnrollments.status, ["pending", "downloaded"]),
      ),
    );

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    now.getTime() + enrollmentHours() * 60 * 60_000,
  );

  const [enrollment] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(remoteDeviceEnrollments)
      .values({
        ticketId,
        webChatSessionId: subject.webChatSessionId,
        customerContactId: subject.customerContactId,
        customerOrganizationId: subject.customerOrganizationId,
        remoteCustomerGroupId: group.id,
        requestedByUserId: actorUserId,
        tokenHash: hashToken(token),
        status: "pending",
        baselineProviderDeviceIds,
        expiresAt,
      })
      .returning({ id: remoteDeviceEnrollments.id });
    if (!created) throw new Error("REMOTE_ENROLLMENT_NOT_CREATED");

    const installUrl = `${publicBaseUrl.replace(/\/$/, "")}/suporte-remoto/instalar/${encodeURIComponent(token)}`;
    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "system",
      customerContactId: subject.customerContactId,
      visibility: "public",
      channel: subject.channel,
      body: `Para permitir o suporte remoto, instale o Suporte Remoto F10 neste computador: ${installUrl}`,
    });
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "remote.enrollment.requested",
      metadata: {
        enrollmentId: created.id,
        expiresAt: expiresAt.toISOString(),
      },
    });
    return [created];
  });

  await recordAuditEvent({
    actorUserId,
    action: "remote.enrollment.requested",
    entityType: "remote_device_enrollment",
    entityId: enrollment.id,
    metadata: {
      ticketId,
      customerContactId: subject.customerContactId,
    },
  });

  return {
    id: enrollment.id,
    installUrl: `${publicBaseUrl.replace(/\/$/, "")}/suporte-remoto/instalar/${token}`,
    expiresAt,
  };
}

export async function getRemoteEnrollmentByToken(token: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      id: remoteDeviceEnrollments.id,
      status: remoteDeviceEnrollments.status,
      expiresAt: remoteDeviceEnrollments.expiresAt,
      downloadedAt: remoteDeviceEnrollments.downloadedAt,
      completedAt: remoteDeviceEnrollments.completedAt,
      deviceId: remoteDeviceEnrollments.deviceId,
      customerName: customerContacts.name,
      providerGroupId: remoteCustomerGroups.providerGroupId,
    })
    .from(remoteDeviceEnrollments)
    .leftJoin(
      customerContacts,
      eq(remoteDeviceEnrollments.customerContactId, customerContacts.id),
    )
    .innerJoin(
      remoteCustomerGroups,
      eq(
        remoteDeviceEnrollments.remoteCustomerGroupId,
        remoteCustomerGroups.id,
      ),
    )
    .where(eq(remoteDeviceEnrollments.tokenHash, hashToken(token)))
    .limit(1);

  if (!row) return null;
  return { ...row, expired: row.expiresAt <= new Date() };
}

export async function markRemoteEnrollmentDownloaded(token: string) {
  const db = getDatabase();
  const now = new Date();
  const [row] = await db
    .select({
      id: remoteDeviceEnrollments.id,
      status: remoteDeviceEnrollments.status,
      expiresAt: remoteDeviceEnrollments.expiresAt,
      providerGroupId: remoteCustomerGroups.providerGroupId,
    })
    .from(remoteDeviceEnrollments)
    .innerJoin(
      remoteCustomerGroups,
      eq(
        remoteDeviceEnrollments.remoteCustomerGroupId,
        remoteCustomerGroups.id,
      ),
    )
    .where(eq(remoteDeviceEnrollments.tokenHash, hashToken(token)))
    .limit(1);

  if (
    !row ||
    row.expiresAt <= now ||
    !["pending", "downloaded"].includes(row.status)
  ) {
    throw new Error("REMOTE_ENROLLMENT_INVALID");
  }

  await db
    .update(remoteDeviceEnrollments)
    .set({ status: "downloaded", downloadedAt: now, updatedAt: now })
    .where(eq(remoteDeviceEnrollments.id, row.id));

  return buildMeshCentralAgentDownloadUrl(row.providerGroupId);
}

export async function createKnownDeviceRemoteSession(
  actorUserId: string,
  ticketId: string,
  deviceId: string,
) {
  const subject = await getTicketSubject(ticketId);
  const devices = await listKnownRemoteDevicesForTicket(ticketId);
  const device = devices.find((item) => item.id === deviceId);
  if (!device) throw new Error("REMOTE_DEVICE_NOT_ELIGIBLE");
  if (!device.online) throw new Error("REMOTE_DEVICE_OFFLINE");

  const db = getDatabase();
  const now = new Date();
  const technicalToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + 10 * 60_000);

  const [session] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(remoteSupportSessions)
      .values({
        ticketId,
        webChatSessionId: subject.webChatSessionId,
        customerContactId: subject.customerContactId,
        deviceId,
        requestedByUserId: actorUserId,
        status: "authorized",
        consentTokenHash: hashToken(technicalToken),
        consentExpiresAt: expiresAt,
        authorizedAt: now,
        requestedAt: now,
        updatedAt: now,
        providerSessionId: "meshcentral-local-prompt",
      })
      .returning({ id: remoteSupportSessions.id });
    if (!created) throw new Error("REMOTE_SESSION_NOT_CREATED");

    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "system",
      customerContactId: subject.customerContactId,
      visibility: "public",
      channel: subject.channel,
      body: `A equipe F10 solicitou acesso remoto ao computador “${device.name}”. Confirme o acesso na mensagem exibida no próprio computador.`,
    });
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "remote.requested",
      metadata: {
        remoteSessionId: created.id,
        deviceId,
        consentMode: "meshcentral-local-prompt",
      },
    });
    return [created];
  });

  await recordAuditEvent({
    actorUserId,
    action: "remote.requested",
    entityType: "remote_support_session",
    entityId: session.id,
    metadata: {
      ticketId,
      deviceId,
      consentMode: "meshcentral-local-prompt",
    },
  });

  return session.id;
}
