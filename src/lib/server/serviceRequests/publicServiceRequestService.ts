import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  serviceRequestAttachments,
  serviceRequestChangeSets,
  serviceRequestFieldChanges,
  serviceRequests,
} from "$lib/server/db/serviceRequestSchema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
import { ticketWorkflowStates } from "$lib/server/db/ticketWorkflowSchema";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";
import { encryptServiceRequestSecrets } from "$lib/server/serviceRequests/serviceRequestCrypto";
import {
  normalizeServiceRequestFields,
  serviceRequestLabel,
  type ServiceRequestDataValue,
  type ServiceRequestType,
} from "$lib/server/serviceRequests/serviceRequestDefinitions";
import { resolveServiceRequestIntake } from "$lib/server/serviceRequests/serviceRequestIntake";
import {
  deleteStoredServiceRequestAttachments,
  uploadServiceRequestAttachments,
  type ServiceRequestAttachmentInput,
} from "$lib/server/serviceRequests/serviceRequestStorage";

export type CreatePublicServiceRequestInput = {
  requestType: ServiceRequestType;
  idempotencyKey: string;
  fields: Record<string, unknown>;
  attachments: ServiceRequestAttachmentInput[];
};

export type CreatedPublicServiceRequest = {
  serviceRequestId: string;
  ticketId: string;
  ticketNumber: number;
  requestType: ServiceRequestType;
  deduplicated: boolean;
};

function normalizeIdempotencyKey(value: string): string {
  const key = value.trim();
  if (key.length < 16 || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) {
    throw new Error("SERVICE_REQUEST_IDEMPOTENCY_KEY_INVALID");
  }
  return key;
}

function subjectDetail(data: Record<string, ServiceRequestDataValue>): string {
  const candidates = [
    data.unitFantasyName,
    data.fantasyName,
    data.unitLegalName,
    data.legalName,
    data.cnpj,
  ];
  const value = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());
  return typeof value === "string" ? value.trim().slice(0, 120) : "Solicitação pública";
}

async function findExistingPublicRequest(
  requestType: ServiceRequestType,
  idempotencyKey: string,
): Promise<CreatedPublicServiceRequest | null> {
  const [row] = await getDatabase()
    .select({
      serviceRequestId: serviceRequests.id,
      ticketId: serviceRequests.ticketId,
      ticketNumber: tickets.ticketNumber,
    })
    .from(serviceRequests)
    .innerJoin(tickets, eq(tickets.id, serviceRequests.ticketId))
    .where(
      and(
        isNull(serviceRequests.customerContactId),
        eq(serviceRequests.requestType, requestType),
        eq(serviceRequests.idempotencyKey, idempotencyKey),
      ),
    )
    .limit(1);

  return row
    ? {
        ...row,
        requestType,
        deduplicated: true,
      }
    : null;
}

export async function createPublicServiceRequest(
  input: CreatePublicServiceRequestInput,
): Promise<CreatedPublicServiceRequest> {
  const idempotencyKey = normalizeIdempotencyKey(input.idempotencyKey);
  const existing = await findExistingPublicRequest(input.requestType, idempotencyKey);
  if (existing) return existing;

  const normalized = normalizeServiceRequestFields(input.requestType, input.fields);
  const encryptedSecrets = encryptServiceRequestSecrets(normalized.secrets);
  const intake = await resolveServiceRequestIntake(input.requestType);
  const serviceRequestId = randomUUID();
  const ticketId = randomUUID();
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
    const result = await db.transaction(async (tx): Promise<CreatedPublicServiceRequest> => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`public:${input.requestType}:${idempotencyKey}`}))`,
      );

      const duplicate = await findExistingPublicRequest(input.requestType, idempotencyKey);
      if (duplicate) return duplicate;

      const [ticket] = await tx
        .insert(tickets)
        .values({
          id: ticketId,
          customerContactId: null,
          queueId: intake.queueId,
          assignedUserId: null,
          subject: `${label} · ${subjectDetail(normalized.data)}`,
          status: intake.lifecycleStatus,
          priority: "normal",
          channel: "manual",
          dueOn: sql`CURRENT_DATE + ${intake.defaultDueDays}::integer`,
        })
        .returning({ id: tickets.id, ticketNumber: tickets.ticketNumber });
      if (!ticket) throw new Error("SERVICE_REQUEST_TICKET_NOT_CREATED");

      await tx.insert(ticketMessages).values({
        ticketId,
        authorType: "system",
        visibility: "public",
        channel: "manual",
        body: `Solicitação pública de ${label} recebida. O solicitante externo não foi cadastrado automaticamente como cliente F10; os dados enviados estão disponíveis na solicitação estruturada.`,
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
        customerContactId: null,
        legacyUserId: null,
        groupId: null,
        groupName: null,
        unitId: null,
        unitName: null,
        unitSchema: null,
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
          source: "system",
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
          publicSubmission: true,
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

    await notifySupportTicketNeedsAttention(
      result.ticketId,
      `Nova solicitação pública de ${label} aguardando atendimento.`,
    ).catch((cause) => {
      console.error("[service-request.public.notification]", {
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
