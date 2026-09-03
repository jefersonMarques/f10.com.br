import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";
import {
  serviceRequestAttachments,
  serviceRequestChangeSets,
  serviceRequestFieldChanges,
  serviceRequests,
} from "$lib/server/db/serviceRequestSchema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
import { ticketWorkflowStates } from "$lib/server/db/ticketWorkflowSchema";
import {
  listAuthorizedF10Contexts,
  type CustomerF10PortalSession,
} from "$lib/server/customerPortal/customerF10AuthRepository";
import { autoAssignTicketIfConfigured } from "$lib/server/support/supportRoutingRepository";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";
import { encryptServiceRequestSecrets } from "$lib/server/serviceRequests/serviceRequestCrypto";
import {
  normalizeServiceRequestFields,
  serviceRequestLabel,
  type ServiceRequestType,
} from "$lib/server/serviceRequests/serviceRequestDefinitions";
import { resolveServiceRequestIntake } from "$lib/server/serviceRequests/serviceRequestIntake";
import {
  deleteStoredServiceRequestAttachments,
  uploadServiceRequestAttachments,
  type ServiceRequestAttachmentInput,
} from "$lib/server/serviceRequests/serviceRequestStorage";

export type CreateCustomerServiceRequestInput = {
  requestType: ServiceRequestType;
  groupId: number;
  unitId: number;
  idempotencyKey: string;
  fields: Record<string, unknown>;
  attachments: ServiceRequestAttachmentInput[];
};

export type CreatedCustomerServiceRequest = {
  serviceRequestId: string;
  ticketId: string;
  ticketNumber: number;
  requestType: ServiceRequestType;
  deduplicated: boolean;
};

type ExistingRequest = {
  serviceRequestId: string;
  ticketId: string;
  ticketNumber: number;
  groupId: number;
  unitId: number;
};

function normalizeIdempotencyKey(value: string): string {
  const key = value.trim();
  if (key.length < 16 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new Error("SERVICE_REQUEST_IDEMPOTENCY_KEY_INVALID");
  }
  return key;
}

async function findExistingRequest(
  customerContactId: string,
  requestType: ServiceRequestType,
  idempotencyKey: string,
): Promise<ExistingRequest | null> {
  const db = getDatabase();
  const [row] = await db
    .select({
      serviceRequestId: serviceRequests.id,
      ticketId: serviceRequests.ticketId,
      ticketNumber: tickets.ticketNumber,
      groupId: serviceRequests.groupId,
      unitId: serviceRequests.unitId,
    })
    .from(serviceRequests)
    .innerJoin(tickets, eq(tickets.id, serviceRequests.ticketId))
    .where(
      and(
        eq(serviceRequests.customerContactId, customerContactId),
        eq(serviceRequests.requestType, requestType),
        eq(serviceRequests.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);
  return row ?? null;
}

function deduplicatedResult(
  requestType: ServiceRequestType,
  existing: ExistingRequest,
  groupId: number,
  unitId: number,
): CreatedCustomerServiceRequest {
  if (existing.groupId !== groupId || existing.unitId !== unitId) {
    throw new Error("SERVICE_REQUEST_IDEMPOTENCY_CONFLICT");
  }
  return {
    serviceRequestId: existing.serviceRequestId,
    ticketId: existing.ticketId,
    ticketNumber: existing.ticketNumber,
    requestType,
    deduplicated: true,
  };
}

export async function createCustomerServiceRequest(
  session: CustomerF10PortalSession,
  input: CreateCustomerServiceRequestInput,
): Promise<CreatedCustomerServiceRequest> {
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const context = listAuthorizedF10Contexts(session).find(
    (candidate) => candidate.groupId === input.groupId && candidate.unitId === input.unitId,
  );
  if (!context) throw new Error("SERVICE_REQUEST_CONTEXT_NOT_AUTHORIZED");

  const existing = await findExistingRequest(session.contactId, input.requestType, idempotencyKey);
  if (existing) return deduplicatedResult(input.requestType, existing, context.groupId, context.unitId);

  const normalized = normalizeServiceRequestFields(input.requestType, input.fields);
  const encryptedSecrets = encryptServiceRequestSecrets(normalized.secrets);
  const intake = await resolveServiceRequestIntake(input.requestType);
  const serviceRequestId = randomUUID();
  const ticketId = randomUUID();
  const messageId = randomUUID();
  const storedAttachments = await uploadServiceRequestAttachments(
    serviceRequestId,
    input.requestType,
    input.attachments,
  );
  const db = getDatabase();
  const now = new Date();
  const label = serviceRequestLabel(input.requestType);
  let createdNew = false;

  try {
    const result = await db.transaction(async (tx): Promise<CreatedCustomerServiceRequest> => {
      const lockKey = `${session.contactId}:${input.requestType}:${idempotencyKey}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);

      const [duplicate] = await tx
        .select({
          serviceRequestId: serviceRequests.id,
          ticketId: serviceRequests.ticketId,
          ticketNumber: tickets.ticketNumber,
          groupId: serviceRequests.groupId,
          unitId: serviceRequests.unitId,
        })
        .from(serviceRequests)
        .innerJoin(tickets, eq(tickets.id, serviceRequests.ticketId))
        .where(
          and(
            eq(serviceRequests.customerContactId, session.contactId),
            eq(serviceRequests.requestType, input.requestType),
            eq(serviceRequests.idempotencyKey, idempotencyKey),
          ),
        )
        .limit(1);

      if (duplicate) {
        return deduplicatedResult(input.requestType, duplicate, context.groupId, context.unitId);
      }

      const [ticket] = await tx
        .insert(tickets)
        .values({
          id: ticketId,
          customerContactId: session.contactId,
          queueId: intake.queueId,
          subject: `${label} · ${context.unitName}`,
          status: intake.lifecycleStatus,
          priority: "normal",
          channel: "portal",
          dueOn: sql`CURRENT_DATE + ${intake.defaultDueDays}::integer`,
        })
        .returning({ id: tickets.id, ticketNumber: tickets.ticketNumber });
      if (!ticket) throw new Error("SERVICE_REQUEST_TICKET_NOT_CREATED");

      await tx.insert(ticketMessages).values({
        id: messageId,
        ticketId,
        authorType: "customer",
        customerContactId: session.contactId,
        visibility: "public",
        channel: "portal",
        body: `Solicitação de ${label} enviada pelo Portal do Cliente. Os dados estruturados estão disponíveis nos detalhes desta solicitação.`,
      });

      await tx.insert(ticketCustomerContexts).values({
        ticketId,
        customerContactId: session.contactId,
        legacyUserId: session.legacyUserId,
        contextScope: "unit",
        groupId: context.groupId,
        groupName: context.groupName,
        unitId: context.unitId,
        unitName: context.unitName,
        unitSchema: context.unitSchema,
        updatedAt: now,
      });

      await tx.insert(ticketWorkflowStates).values({
        ticketId,
        globalWorkflowId: intake.globalWorkflowId,
        globalStageId: intake.globalStageId,
        areaId: intake.areaId,
        areaWorkflowId: intake.areaWorkflowId,
        areaStageId: intake.areaStageId,
        enteredAt: now,
        areaEnteredAt: now,
        updatedAt: now,
      });

      await tx.insert(serviceRequests).values({
        id: serviceRequestId,
        ticketId,
        requestType: input.requestType,
        customerContactId: session.contactId,
        legacyUserId: session.legacyUserId,
        groupId: context.groupId,
        groupName: context.groupName,
        unitId: context.unitId,
        unitName: context.unitName,
        unitSchema: context.unitSchema,
        idempotencyKey,
        version: 1,
        data: normalized.data,
        secretsEncrypted: encryptedSecrets,
        updatedAt: now,
      });

      if (storedAttachments.length > 0) {
        await tx.insert(serviceRequestAttachments).values(
          storedAttachments.map((attachment) => ({
            serviceRequestId,
            fieldKey: attachment.fieldKey,
            storageKey: attachment.storageKey,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            checksumSha256: attachment.checksumSha256,
          })),
        );
      }

      const [changeSet] = await tx
        .insert(serviceRequestChangeSets)
        .values({
          serviceRequestId,
          version: 1,
          source: "customer",
          actorCustomerContactId: session.contactId,
        })
        .returning({ id: serviceRequestChangeSets.id });
      if (!changeSet) throw new Error("SERVICE_REQUEST_CHANGE_SET_NOT_CREATED");

      const initialChanges = [
        ...Object.entries(normalized.data).map(([fieldKey, nextValue]) => ({
          changeSetId: changeSet.id,
          fieldKey,
          previousValue: null,
          nextValue,
          secretChanged: false,
        })),
        ...Object.keys(normalized.secrets).map((fieldKey) => ({
          changeSetId: changeSet.id,
          fieldKey,
          previousValue: null,
          nextValue: null,
          secretChanged: true,
        })),
      ];
      if (initialChanges.length > 0) {
        await tx.insert(serviceRequestFieldChanges).values(initialChanges);
      }

      await tx.insert(ticketEvents).values({
        ticketId,
        eventType: "service_request.created",
        metadata: {
          serviceRequestId,
          requestType: input.requestType,
          groupId: context.groupId,
          unitId: context.unitId,
          attachmentCount: storedAttachments.length,
          version: 1,
        },
      });

      createdNew = true;
      return {
        serviceRequestId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        requestType: input.requestType,
        deduplicated: false,
      };
    });

    if (!createdNew) {
      await deleteStoredServiceRequestAttachments(storedAttachments);
      return result;
    }

    await autoAssignTicketIfConfigured(result.ticketId).catch((cause) => {
      console.error("[service-request.assignment]", {
        ticketId: result.ticketId,
        requestType: input.requestType,
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
    });
    await notifySupportTicketNeedsAttention(
      result.ticketId,
      `Nova solicitação de ${label} enviada pelo Portal do Cliente.`,
    ).catch((cause) => {
      console.error("[service-request.notification]", {
        ticketId: result.ticketId,
        requestType: input.requestType,
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
    });

    return result;
  } catch (cause) {
    await deleteStoredServiceRequestAttachments(storedAttachments);
    throw cause;
  }
}
