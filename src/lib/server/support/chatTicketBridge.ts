import { createHash, randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { isAuthorizedF10Context, type CustomerF10PortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";
import { resolveCustomerPortalTicketIntake } from "$lib/server/customerPortal/customerPortalTicketIntake";
import { ticketWorkflowStates } from "$lib/server/db/ticketWorkflowSchema";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";
import { markTicketCustomerWaitingForResponse } from "$lib/server/support/ticketSlaService";
import { deleteStoredSupportImages, uploadSupportChatMessageAttachments } from "$lib/server/support/supportMessageAttachmentRepository";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { reuseTicketCommercialUnit } from "$lib/server/support/ticketCommercialUnitRepository";
import { notifyNewTicketCustomer } from "$lib/server/support/ticketCreationNotificationService";
import { calculateTicketSlaDeadlines } from "$lib/server/support/ticketSlaService";
import { notifyTicketOperatorsByEmail } from "$lib/server/support/ticketOperatorEmailNotification";
import {
  supportChatEvents,
  webChatMessageAttachments,
  webChatMessages,
  webChatSessions,
} from "$lib/server/db/chatSchema";
import { ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";
import { ticketMessageAttachments } from "$lib/server/db/supportChatEntrySchema";
import {
  supportQueues,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";
import {
  getUserSupportQueueIds,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";

async function canAccessChat(
  actorUserId: string,
  permissions: SupportPermissionMap,
  queueId: string,
  assignedUserId: string | null,
): Promise<boolean> {
  const scope = getPermissionScope(permissions, "chat.view");
  if (!scope) return false;
  if (scope === "all") return true;
  if (assignedUserId === actorUserId) return true;
  if (scope === "own") return false;
  const queueIds = await getUserSupportQueueIds(actorUserId);
  return queueIds.includes(queueId);
}

type CustomerChatTicketInput = {
  subject: string;
  description: string;
  files: File[];
};

type ConversionActor =
  | { kind: "agent"; userId: string; permissions: SupportPermissionMap }
  | { kind: "customer"; customer: CustomerF10PortalSession; token: string; input: CustomerChatTicketInput };

type ConversionResult = { ticketId: string; ticketNumber: number; created: boolean; submitted?: boolean };

export async function createTicketFromChat(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
): Promise<ConversionResult> {
  if (!hasPermission(permissions, "tickets.create")) {
    throw new Error("CHAT_TICKET_CREATE_NOT_ALLOWED");
  }
  return convertChatToTicket(sessionId, { kind: "agent", userId: actorUserId, permissions });
}

export async function createCustomerTicketFromChat(
  customer: CustomerF10PortalSession,
  sessionId: string,
  token: string,
  input: CustomerChatTicketInput,
): Promise<ConversionResult> {
  const subject = input.subject.trim();
  const description = input.description.trim();
  if (subject.length < 3 || subject.length > 180 || !description || description.length > 10_000) {
    throw new Error("CHAT_TICKET_INVALID_INPUT");
  }
  return convertChatToTicket(sessionId, {
    kind: "customer", customer, token, input: { ...input, subject, description },
  });
}

async function convertChatToTicket(sessionId: string, actor: ConversionActor): Promise<ConversionResult> {

  const db = getDatabase();
  const [initialChat] = await db
    .select({
      ticketId: webChatSessions.ticketId,
      tokenHash: webChatSessions.tokenHash,
      closedAt: webChatSessions.closedAt,
      closeReason: webChatSessions.closeReason,
      expiresAt: webChatSessions.expiresAt,
      aiState: webChatSessions.aiState,
      customerContactId: webChatSessions.customerContactId,
      queueId: webChatSessions.queueId,
      assignedUserId: webChatSessions.assignedUserId,
      subject: webChatSessions.subject,
      legacyUserId: webChatSessions.legacyUserId,
      groupId: webChatSessions.groupId,
      groupName: webChatSessions.groupName,
      unitId: webChatSessions.unitId,
      unitName: webChatSessions.unitName,
      unitSchema: webChatSessions.unitSchema,
      firstResponseAt: webChatSessions.firstResponseAt,
      createdAt: webChatSessions.createdAt,
      defaultDueDays: supportQueues.defaultDueDays,
    })
    .from(webChatSessions)
    .innerJoin(supportQueues, eq(webChatSessions.queueId, supportQueues.id))
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);
  if (!initialChat) throw new Error("CHAT_NOT_FOUND");

  const customer = actor.kind === "customer" ? actor.customer : null;
  const customerInput = actor.kind === "customer" ? actor.input : null;
  const tokenHash = actor.kind === "customer"
    ? createHash("sha256").update(actor.token).digest("hex") : null;

  if (actor.kind === "agent") {
    if (!await canAccessChat(actor.userId, actor.permissions, initialChat.queueId, initialChat.assignedUserId)) {
      throw new Error("CHAT_TICKET_CREATE_NOT_ALLOWED");
    }
  } else if (
    initialChat.tokenHash !== tokenHash
    || initialChat.legacyUserId !== actor.customer.legacyUserId
    || initialChat.customerContactId !== actor.customer.contactId
    || initialChat.groupId === null || initialChat.unitId === null
    || !isAuthorizedF10Context(actor.customer, initialChat.groupId, initialChat.unitId)
    || initialChat.expiresAt.getTime() <= Date.now()
  ) {
    throw new Error("CHAT_TICKET_CREATE_NOT_ALLOWED");
  }

  const alreadyConverted = customer && initialChat.closedAt
    && initialChat.closeReason === "converted_to_ticket" && initialChat.ticketId;
  if (alreadyConverted || (!customer && initialChat.ticketId)) {
    const [existing] = await db.select({ id: tickets.id, ticketNumber: tickets.ticketNumber })
      .from(tickets).where(eq(tickets.id, initialChat.ticketId!)).limit(1);
    if (!existing) throw new Error("CHAT_LINKED_TICKET_NOT_FOUND");
    return { ticketId: existing.id, ticketNumber: existing.ticketNumber, created: false, submitted: Boolean(alreadyConverted) };
  }
  if (initialChat.closedAt || (customer && initialChat.aiState === "active")) {
    throw new Error("CHAT_TICKET_NOT_AVAILABLE");
  }

  const intake = customer && !initialChat.ticketId ? await resolveCustomerPortalTicketIntake() : null;
  const sla = await calculateTicketSlaDeadlines(initialChat.queueId, customer ? new Date() : initialChat.createdAt);
  const messageId = randomUUID();
  const attachmentsToAdd = customerInput
    ? await uploadSupportChatMessageAttachments(sessionId, messageId, customerInput.files)
    : [];

  let result: ConversionResult;
  try {
    result = await db.transaction(async (tx) => {
      const [lockedChat] = await tx.select().from(webChatSessions)
        .where(eq(webChatSessions.id, sessionId)).limit(1).for("update");
      if (!lockedChat) throw new Error("CHAT_NOT_FOUND");
      const chat = { ...initialChat, ...lockedChat };

      if (customer && (
        chat.tokenHash !== tokenHash || chat.expiresAt.getTime() <= Date.now()
        || chat.legacyUserId !== customer.legacyUserId || chat.customerContactId !== customer.contactId
        || chat.groupId === null || chat.unitId === null
        || !isAuthorizedF10Context(customer, chat.groupId, chat.unitId)
      )) throw new Error("CHAT_TICKET_CREATE_NOT_ALLOWED");
      if (chat.queueId !== initialChat.queueId || (!customer && chat.assignedUserId !== initialChat.assignedUserId)) {
        throw new Error("CHAT_TICKET_NOT_AVAILABLE");
      }

      async function submitCustomerDetails(ticketId: string, existing: boolean): Promise<void> {
        if (!customerInput || !customer) return;
        const now = new Date();
        await tx.insert(ticketMessages).values({
          id: messageId,
          ticketId,
          authorType: "customer",
          customerContactId: customer.contactId,
          visibility: "public",
          channel: "web_chat",
          body: existing ? `${customerInput.subject}\n\n${customerInput.description}` : customerInput.description,
        });
        if (attachmentsToAdd.length) {
          await tx.insert(ticketMessageAttachments).values(attachmentsToAdd.map((attachment) => ({
            messageId, ticketId, ...attachment,
          })));
        }
        await tx.update(webChatSessions).set({
          ticketId, closedAt: now, closeReason: "converted_to_ticket",
          aiState: "disabled", aiProcessingAt: null, updatedAt: now,
        }).where(eq(webChatSessions.id, sessionId));
        await tx.insert(supportChatEvents).values({
          sessionId, eventType: "converted_to_ticket", occurredAt: now,
        });
        await tx.insert(ticketEvents).values({
          ticketId, eventType: "chat.customer.converted_to_ticket",
          metadata: { sessionId, attachmentCount: attachmentsToAdd.length },
        });
        await tx.update(tickets).set({ updatedAt: now }).where(eq(tickets.id, ticketId));
      }

      if (chat.ticketId) {
        const [existing] = await tx.select({
          id: tickets.id, ticketNumber: tickets.ticketNumber, status: tickets.status,
        }).from(tickets).where(eq(tickets.id, chat.ticketId)).limit(1).for("update");
        if (!existing) throw new Error("CHAT_LINKED_TICKET_NOT_FOUND");
        if (customer && chat.closedAt && chat.closeReason === "converted_to_ticket") {
          return { ticketId: existing.id, ticketNumber: existing.ticketNumber, created: false, submitted: false };
        }
        if (customer) {
          if (chat.closedAt || chat.aiState === "active" || ["resolved", "closed"].includes(existing.status)) {
            throw new Error("CHAT_TICKET_NOT_AVAILABLE");
          }
          if (existing.status === "waiting_customer") {
            await tx.update(tickets).set({ status: "open" }).where(eq(tickets.id, existing.id));
          }
          await submitCustomerDetails(existing.id, true);
        }
        return { ticketId: existing.id, ticketNumber: existing.ticketNumber, created: false, submitted: Boolean(customer) };
      }

      if (chat.closedAt || (customer && chat.aiState === "active")) throw new Error("CHAT_TICKET_NOT_AVAILABLE");
      if (customer && (!intake || ["resolved", "closed", "waiting_customer"].includes(intake.lifecycleStatus))) {
        throw new Error("CHAT_TICKET_INTAKE_UNAVAILABLE");
      }

      const [ticket] = await tx.insert(tickets).values({
        customerContactId: chat.customerContactId,
        queueId: chat.queueId,
        assignedUserId: chat.assignedUserId,
        subject: customerInput?.subject ?? chat.subject,
        status: customer && intake ? intake.lifecycleStatus : chat.assignedUserId ? "open" : "new",
        priority: "normal",
        channel: "web_chat",
        firstResponseAt: chat.firstResponseAt,
        firstResponseDueAt: sla.firstResponseDueAt,
        resolutionDueAt: sla.resolutionDueAt,
        dueOn: sql`CURRENT_DATE + ${chat.defaultDueDays}::integer`,
      }).returning({ id: tickets.id, ticketNumber: tickets.ticketNumber });
      if (!ticket) throw new Error("CHAT_TICKET_NOT_CREATED");

      if (customer && intake) {
        await tx.insert(ticketWorkflowStates).values({
          ticketId: ticket.id,
          globalWorkflowId: intake.workflowId,
          globalStageId: intake.stageId,
          enteredAt: new Date(),
          updatedAt: new Date(),
        });
      }

      const messages = await tx
        .select({
          id: webChatMessages.id,
          authorType: webChatMessages.authorType,
          authorUserId: webChatMessages.authorUserId,
          customerContactId: webChatMessages.customerContactId,
          visibility: webChatMessages.visibility,
          body: webChatMessages.body,
          createdAt: webChatMessages.createdAt,
        })
        .from(webChatMessages)
        .where(eq(webChatMessages.sessionId, sessionId));

      if (messages.length > 0) {
        await tx.insert(ticketMessages).values(
          messages.map((message) => ({
            id: message.id,
            ticketId: ticket.id,
            authorType: message.authorType,
            authorUserId: message.authorUserId,
            customerContactId: message.customerContactId,
            visibility: message.visibility,
            channel: "web_chat" as const,
            body: message.body,
            createdAt: message.createdAt,
          })),
        );
      }


      if (messages.length > 0) {
        const messageIds = messages.map((message) => message.id);
        await tx.execute(sql`
          INSERT INTO support_message_reactions
            (source_kind, message_id, actor_kind, actor_key, reaction, created_at)
          SELECT 'ticket', message_id, actor_kind, actor_key, reaction, created_at
          FROM support_message_reactions
          WHERE source_kind = 'chat'
            AND message_id IN (${sql.join(messageIds.map((id) => sql`${id}::uuid`), sql`, `)})
          ON CONFLICT DO NOTHING
        `);
        await tx.execute(sql`
          DELETE FROM support_message_reactions
          WHERE source_kind = 'chat'
            AND message_id IN (${sql.join(messageIds.map((id) => sql`${id}::uuid`), sql`, `)})
        `);

        // Preserva a origem das tarefas quando a conversa passa a pertencer a um ticket.
        await tx.execute(sql`
          UPDATE support_message_task_links
          SET source_kind = 'ticket'
          WHERE source_kind = 'chat'
            AND message_id IN (${sql.join(messageIds.map((id) => sql`${id}::uuid`), sql`, `)})
        `);
        await tx.execute(sql`
          INSERT INTO ticket_task_links (ticket_id, task_id, created_by, created_at)
          SELECT ${ticket.id}::uuid, task_id, created_by, created_at
          FROM support_message_task_links
          WHERE source_kind = 'ticket'
            AND message_id IN (${sql.join(messageIds.map((id) => sql`${id}::uuid`), sql`, `)})
          ON CONFLICT DO NOTHING
        `);
      }

      const attachments = await tx
        .select({
          id: webChatMessageAttachments.id,
          messageId: webChatMessageAttachments.messageId,
          storageKey: webChatMessageAttachments.storageKey,
          originalName: webChatMessageAttachments.originalName,
          mimeType: webChatMessageAttachments.mimeType,
          sizeBytes: webChatMessageAttachments.sizeBytes,
          checksumSha256: webChatMessageAttachments.checksumSha256,
          createdAt: webChatMessageAttachments.createdAt,
        })
        .from(webChatMessageAttachments)
        .where(eq(webChatMessageAttachments.sessionId, sessionId));

      if (attachments.length > 0) {
        await tx.insert(ticketMessageAttachments).values(
          attachments.map((attachment) => ({
            id: attachment.id,
            messageId: attachment.messageId,
            ticketId: ticket.id,
            storageKey: attachment.storageKey,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            checksumSha256: attachment.checksumSha256,
            createdAt: attachment.createdAt,
          })),
        );
      }

      if (
        chat.legacyUserId &&
        chat.groupId !== null &&
        chat.groupName &&
        chat.unitId !== null &&
        chat.unitName &&
        chat.unitSchema
      ) {
        await tx.insert(ticketCustomerContexts).values({
          ticketId: ticket.id,
          customerContactId: chat.customerContactId,
          legacyUserId: chat.legacyUserId,
          contextScope: "unit",
          groupId: chat.groupId,
          groupName: chat.groupName,
          unitId: chat.unitId,
          unitName: chat.unitName,
          unitSchema: chat.unitSchema,
        });
      }

      if (customer) {
        await submitCustomerDetails(ticket.id, false);
      } else {
        await tx.update(webChatSessions)
          .set({ ticketId: ticket.id, updatedAt: new Date() })
          .where(eq(webChatSessions.id, sessionId));
      }

      await tx.insert(ticketEvents).values({
        ticketId: ticket.id,
        actorUserId: actor.kind === "agent" ? actor.userId : null,
        eventType: "chat.converted_to_ticket",
        metadata: { sessionId, source: actor.kind === "agent" ? "support_agent" : "customer" },
      });
      return { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, created: true, submitted: Boolean(customer) };
    });
  } catch (cause) {
    await deleteStoredSupportImages(attachmentsToAdd);
    throw cause;
  }

  if (!result.submitted && attachmentsToAdd.length > 0) {
    await deleteStoredSupportImages(attachmentsToAdd);
  }

  if (result.created) {
    await notifyNewTicketCustomer({
      ticketId: result.ticketId,
      origin: "web_chat",
      messageBody: customerInput?.description ?? initialChat.subject,
      expectedContactId: initialChat.customerContactId ?? undefined,
      verifiedPortalEmail: customer?.email,
    }).catch((cause) => {
      console.error("[chat.ticket.customer_receipt]", {
        ticketId: result.ticketId,
        errorType: cause instanceof Error ? cause.name : typeof cause,
      });
    });
    await reuseTicketCommercialUnit(
      result.ticketId, initialChat.customerContactId, initialChat.unitName,
    ).catch((cause) => {
      console.error("[ticket.commercial_unit.auto_reuse]", {
        ticketId: result.ticketId,
        errorType: cause instanceof Error ? cause.name : typeof cause,
      });
    });
    if (!customer) await notifyTicketOperatorsByEmail(result.ticketId).catch((cause) => {
      console.error("[chat.ticket.operator_email]", {
        ticketId: result.ticketId,
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
    });
  }

  if (customer && result.submitted) {
    if (!result.created) {
      await markTicketCustomerWaitingForResponse(result.ticketId, new Date()).catch((cause) => {
        console.error("[chat.customer.ticket.sla]", { ticketId: result.ticketId, cause });
      });
    }
    await notifySupportTicketNeedsAttention(
      result.ticketId,
      "Cliente optou por continuar o atendimento por chamado.",
      { newTicket: result.created },
    ).catch((cause) => {
      console.error("[chat.customer.ticket.notification]", { ticketId: result.ticketId, cause });
    });
  }
  return result;
}
