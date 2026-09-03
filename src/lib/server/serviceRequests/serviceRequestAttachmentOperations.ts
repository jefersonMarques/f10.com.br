import { and, eq, sql } from "drizzle-orm";
import type { PermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import {
  serviceRequestAttachments,
  serviceRequestChangeSets,
  serviceRequestFieldChanges,
  serviceRequests,
} from "$lib/server/db/serviceRequestSchema";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";
import type { CustomerF10PortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";
import { getCustomerF10Ticket } from "$lib/server/customerPortal/customerF10TicketRepository";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";
import { serviceRequestLabel, type ServiceRequestType } from "$lib/server/serviceRequests/serviceRequestDefinitions";
import {
  deleteStoredServiceRequestAttachments,
  uploadServiceRequestAttachmentField,
} from "$lib/server/serviceRequests/serviceRequestStorage";

export type ReplaceServiceRequestAttachmentInput = {
  expectedVersion: number;
  fieldKey: string;
  files: File[];
  delayAcknowledged?: boolean;
};

type RequestRow = {
  id: string;
  ticketId: string;
  requestType: ServiceRequestType;
  customerContactId: string;
  version: number;
  ticketStatus: "new" | "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
};

function requireExpectedVersion(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("SERVICE_REQUEST_VERSION_INVALID");
  return value;
}

function requireFieldKey(value: string): string {
  const fieldKey = value.trim();
  if (!/^[A-Za-z][A-Za-z0-9_.:-]{0,79}$/.test(fieldKey)) {
    throw new Error("SERVICE_REQUEST_ATTACHMENT_FIELD_INVALID");
  }
  return fieldKey;
}

async function readRequest(ticketId: string, customerContactId?: string): Promise<RequestRow | null> {
  const conditions = [eq(serviceRequests.ticketId, ticketId)];
  if (customerContactId) conditions.push(eq(serviceRequests.customerContactId, customerContactId));
  const [row] = await getDatabase()
    .select({
      id: serviceRequests.id,
      ticketId: serviceRequests.ticketId,
      requestType: serviceRequests.requestType,
      customerContactId: serviceRequests.customerContactId,
      version: serviceRequests.version,
      ticketStatus: tickets.status,
    })
    .from(serviceRequests)
    .innerJoin(tickets, eq(tickets.id, serviceRequests.ticketId))
    .where(and(...conditions))
    .limit(1);
  return row ?? null;
}

function attachmentHistoryValue(
  attachments: Array<{ originalName: string; sizeBytes: number; checksumSha256: string }>,
): string {
  if (attachments.length === 0) return "Nenhum arquivo";
  return attachments
    .map((attachment) => {
      const sizeMb = attachment.sizeBytes / (1024 * 1024);
      const size = sizeMb >= 0.1
        ? `${sizeMb.toFixed(1)} MB`
        : `${Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB`;
      return `${attachment.originalName} · ${size} · SHA-256 ${attachment.checksumSha256.slice(0, 12)}…`;
    })
    .join("\n");
}

async function replaceRequestAttachment(params: {
  row: RequestRow;
  source: "customer" | "user";
  actorCustomerContactId?: string;
  actorUserId?: string;
  input: ReplaceServiceRequestAttachmentInput;
}): Promise<void> {
  const expectedVersion = requireExpectedVersion(params.input.expectedVersion);
  const fieldKey = requireFieldKey(params.input.fieldKey);
  if (params.row.ticketStatus === "closed") throw new Error("SERVICE_REQUEST_TICKET_CLOSED");
  if (params.source === "customer" && params.input.delayAcknowledged !== true) {
    throw new Error("SERVICE_REQUEST_DELAY_ACK_REQUIRED");
  }
  if (params.input.files.length === 0) throw new Error("SERVICE_REQUEST_ATTACHMENT_REQUIRED");

  const stored = await uploadServiceRequestAttachmentField(
    params.row.id,
    params.row.requestType,
    fieldKey,
    params.input.files,
  );
  const db = getDatabase();
  const now = new Date();
  const nextVersion = expectedVersion + 1;
  let previousStored: Array<{ storageKey: string }> = [];

  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`service-request:${params.row.id}`}))`);
      const [locked] = await tx
        .select({ version: serviceRequests.version })
        .from(serviceRequests)
        .where(eq(serviceRequests.id, params.row.id))
        .limit(1);
      if (!locked) throw new Error("SERVICE_REQUEST_NOT_FOUND");
      if (locked.version !== expectedVersion) throw new Error("SERVICE_REQUEST_VERSION_CONFLICT");

      const previous = await tx
        .select({
          id: serviceRequestAttachments.id,
          storageKey: serviceRequestAttachments.storageKey,
          originalName: serviceRequestAttachments.originalName,
          mimeType: serviceRequestAttachments.mimeType,
          sizeBytes: serviceRequestAttachments.sizeBytes,
          checksumSha256: serviceRequestAttachments.checksumSha256,
        })
        .from(serviceRequestAttachments)
        .where(
          and(
            eq(serviceRequestAttachments.serviceRequestId, params.row.id),
            eq(serviceRequestAttachments.fieldKey, fieldKey),
          ),
        );
      previousStored = previous.map((attachment) => ({ storageKey: attachment.storageKey }));

      await tx
        .delete(serviceRequestAttachments)
        .where(
          and(
            eq(serviceRequestAttachments.serviceRequestId, params.row.id),
            eq(serviceRequestAttachments.fieldKey, fieldKey),
          ),
        );
      await tx.insert(serviceRequestAttachments).values(
        stored.map((attachment) => ({
          serviceRequestId: params.row.id,
          fieldKey: attachment.fieldKey,
          storageKey: attachment.storageKey,
          originalName: attachment.originalName,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.sizeBytes,
          checksumSha256: attachment.checksumSha256,
        })),
      );

      await tx
        .update(serviceRequests)
        .set({ version: nextVersion, updatedAt: now })
        .where(eq(serviceRequests.id, params.row.id));

      const [changeSet] = await tx
        .insert(serviceRequestChangeSets)
        .values({
          serviceRequestId: params.row.id,
          version: nextVersion,
          source: params.source,
          actorUserId: params.actorUserId ?? null,
          actorCustomerContactId: params.actorCustomerContactId ?? null,
        })
        .returning({ id: serviceRequestChangeSets.id });
      if (!changeSet) throw new Error("SERVICE_REQUEST_CHANGE_SET_NOT_CREATED");

      await tx.insert(serviceRequestFieldChanges).values({
        changeSetId: changeSet.id,
        fieldKey,
        previousValue: attachmentHistoryValue(previous),
        nextValue: attachmentHistoryValue(stored),
        secretChanged: false,
      });

      await tx.insert(ticketEvents).values({
        ticketId: params.row.ticketId,
        actorUserId: params.actorUserId ?? null,
        eventType: "service_request.attachment.updated",
        metadata: {
          serviceRequestId: params.row.id,
          requestType: params.row.requestType,
          fieldKey,
          version: nextVersion,
          source: params.source,
          previousFileCount: previous.length,
          nextFileCount: stored.length,
          delayAcknowledged: params.source === "customer" ? true : undefined,
        },
      });

      if (params.source === "customer") {
        await tx
          .update(tickets)
          .set({
            status:
              params.row.ticketStatus === "resolved" || params.row.ticketStatus === "waiting_customer"
                ? "open"
                : params.row.ticketStatus,
            updatedAt: now,
          })
          .where(eq(tickets.id, params.row.ticketId));
      }
    });
  } catch (cause) {
    await deleteStoredServiceRequestAttachments(stored);
    throw cause;
  }

  await deleteStoredServiceRequestAttachments(previousStored);

  if (params.source === "customer") {
    await notifySupportTicketNeedsAttention(
      params.row.ticketId,
      `Cliente substituiu documento da solicitação de ${serviceRequestLabel(params.row.requestType)}.`,
    ).catch((cause) => {
      console.error("[service-request.attachment.notification]", {
        ticketId: params.row.ticketId,
        requestType: params.row.requestType,
        fieldKey,
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
    });
  }
}

export async function replaceCustomerServiceRequestAttachment(
  session: CustomerF10PortalSession,
  ticketId: string,
  input: ReplaceServiceRequestAttachmentInput,
): Promise<void> {
  const ticket = await getCustomerF10Ticket(session, ticketId);
  if (!ticket) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  const row = await readRequest(ticketId, session.contactId);
  if (!row) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  await replaceRequestAttachment({
    row,
    source: "customer",
    actorCustomerContactId: session.contactId,
    input,
  });
}

export async function replaceSupportServiceRequestAttachment(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
  input: ReplaceServiceRequestAttachmentInput,
): Promise<void> {
  await requireTicketAccess(userId, scope, ticketId);
  const row = await readRequest(ticketId);
  if (!row) throw new Error("SERVICE_REQUEST_NOT_FOUND");
  await replaceRequestAttachment({ row, source: "user", actorUserId: userId, input });
}
