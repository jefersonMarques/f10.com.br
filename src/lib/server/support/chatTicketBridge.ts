import { eq, sql } from "drizzle-orm";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import {
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

export async function createTicketFromChat(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
): Promise<{ ticketId: string; ticketNumber: number; created: boolean }> {
  if (!hasPermission(permissions, "tickets.create")) {
    throw new Error("CHAT_TICKET_CREATE_NOT_ALLOWED");
  }

  const db = getDatabase();
  const [chat] = await db
    .select({
      ticketId: webChatSessions.ticketId,
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
      defaultDueDays: supportQueues.defaultDueDays,
    })
    .from(webChatSessions)
    .innerJoin(supportQueues, eq(webChatSessions.queueId, supportQueues.id))
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);
  if (!chat) throw new Error("CHAT_NOT_FOUND");

  if (!await canAccessChat(actorUserId, permissions, chat.queueId, chat.assignedUserId)) {
    throw new Error("CHAT_TICKET_CREATE_NOT_ALLOWED");
  }

  if (chat.ticketId) {
    const [existing] = await db
      .select({ id: tickets.id, ticketNumber: tickets.ticketNumber })
      .from(tickets)
      .where(eq(tickets.id, chat.ticketId))
      .limit(1);
    if (!existing) throw new Error("CHAT_LINKED_TICKET_NOT_FOUND");
    return { ticketId: existing.id, ticketNumber: existing.ticketNumber, created: false };
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('f10-chat-ticket-conversion'))`);

    const [lockedChat] = await tx
      .select({ ticketId: webChatSessions.ticketId })
      .from(webChatSessions)
      .where(eq(webChatSessions.id, sessionId))
      .limit(1);
    if (!lockedChat) throw new Error("CHAT_NOT_FOUND");
    if (lockedChat.ticketId) {
      const [existing] = await tx
        .select({ id: tickets.id, ticketNumber: tickets.ticketNumber })
        .from(tickets)
        .where(eq(tickets.id, lockedChat.ticketId))
        .limit(1);
      if (!existing) throw new Error("CHAT_LINKED_TICKET_NOT_FOUND");
      return { ticketId: existing.id, ticketNumber: existing.ticketNumber, created: false };
    }

    const [ticket] = await tx
      .insert(tickets)
      .values({
        customerContactId: chat.customerContactId,
        queueId: chat.queueId,
        assignedUserId: chat.assignedUserId,
        subject: chat.subject,
        status: chat.assignedUserId ? "open" : "new",
        priority: "normal",
        channel: "web_chat",
        firstResponseAt: chat.firstResponseAt,
        dueOn: sql`CURRENT_DATE + ${chat.defaultDueDays}::integer`,
      })
      .returning({ id: tickets.id, ticketNumber: tickets.ticketNumber });
    if (!ticket) throw new Error("CHAT_TICKET_NOT_CREATED");

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

    await tx
      .update(webChatSessions)
      .set({ ticketId: ticket.id, updatedAt: new Date() })
      .where(eq(webChatSessions.id, sessionId));

    await tx.insert(ticketEvents).values({
      ticketId: ticket.id,
      actorUserId,
      eventType: "chat.converted_to_ticket",
      metadata: { sessionId, source: "support_agent" },
    });

    return { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, created: true };
  });
}
