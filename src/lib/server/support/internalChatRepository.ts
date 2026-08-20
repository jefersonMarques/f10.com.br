import {
  and,
  asc,
  desc,
  eq,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { getPermissionScope, hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { users } from "$lib/server/db/schema";
import { webChatSessions } from "$lib/server/db/chatSchema";
import {
  customerContacts,
  customerOrganizations,
  supportQueues,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";
import {
  getUserSupportQueueIds,
  requireTicketAccess,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";
import { listEligibleSupportResponders } from "$lib/server/support/supportRoutingRepository";

function requireChatScope(
  permissions: SupportPermissionMap,
  permissionCode: string,
) {
  const scope = getPermissionScope(permissions, permissionCode);
  if (!scope) throw new Error("CHAT_PERMISSION_NOT_ALLOWED");
  return scope;
}

export async function listInternalChats(
  actorUserId: string,
  permissions: SupportPermissionMap,
) {
  const scope = requireChatScope(permissions, "chat.view");
  const ownCondition = eq(tickets.assignedUserId, actorUserId);
  let accessCondition = ownCondition;

  if (scope === "all") {
    accessCondition = undefined;
  } else if (scope === "team") {
    const queueIds = await getUserSupportQueueIds(actorUserId);
    accessCondition =
      queueIds.length > 0
        ? or(ownCondition, inArray(tickets.queueId, queueIds))
        : ownCondition;
  }

  const baseCondition = and(
    eq(tickets.channel, "web_chat"),
    accessCondition,
  );

  return getDatabase()
    .select({
      sessionId: webChatSessions.id,
      ticketId: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      aiState: webChatSessions.aiState,
      aiHandoffReason: webChatSessions.aiHandoffReason,
      assignedUserId: tickets.assignedUserId,
      assignedUserName: users.name,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      organizationName: customerOrganizations.name,
      firstResponseDueAt: tickets.firstResponseDueAt,
      resolutionDueAt: tickets.resolutionDueAt,
      firstResponseAt: tickets.firstResponseAt,
      lastMessageBody: sql<string | null>`(
        select tm.body
        from ticket_messages tm
        where tm.ticket_id = ${tickets.id} and tm.visibility = 'public'
        order by tm.created_at desc
        limit 1
      )`,
      lastMessageAuthorType: sql<string | null>`(
        select tm.author_type::text
        from ticket_messages tm
        where tm.ticket_id = ${tickets.id} and tm.visibility = 'public'
        order by tm.created_at desc
        limit 1
      )`,
      lastSeenAt: webChatSessions.lastSeenAt,
      updatedAt: tickets.updatedAt,
      closedAt: webChatSessions.closedAt,
    })
    .from(webChatSessions)
    .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .leftJoin(users, eq(tickets.assignedUserId, users.id))
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    )
    .where(baseCondition)
    .orderBy(desc(tickets.updatedAt))
    .limit(300);
}

export async function getInternalChat(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
) {
  const scope = requireChatScope(permissions, "chat.view");
  const db = getDatabase();
  const [chat] = await db
    .select({
      sessionId: webChatSessions.id,
      ticketId: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      queueName: supportQueues.name,
      aiState: webChatSessions.aiState,
      aiHandoffReason: webChatSessions.aiHandoffReason,
      aiHandoffAt: webChatSessions.aiHandoffAt,
      assignedUserId: tickets.assignedUserId,
      assignedUserName: users.name,
      customerContactId: tickets.customerContactId,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      customerPhone: customerContacts.phone,
      organizationName: customerOrganizations.name,
      contextUrl: webChatSessions.contextUrl,
      contextData: webChatSessions.contextData,
      firstResponseDueAt: tickets.firstResponseDueAt,
      resolutionDueAt: tickets.resolutionDueAt,
      firstResponseAt: tickets.firstResponseAt,
      linkedTaskId: tickets.linkedTaskId,
      lastSeenAt: webChatSessions.lastSeenAt,
      createdAt: webChatSessions.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(webChatSessions)
    .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(users, eq(tickets.assignedUserId, users.id))
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    )
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);

  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireTicketAccess(actorUserId, scope, chat.ticketId);

  return chat;
}

export async function listInternalChatMessages(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
) {
  const chat = await getInternalChat(actorUserId, permissions, sessionId);
  const db = getDatabase();

  const messages = await db
    .select({
      id: ticketMessages.id,
      authorType: ticketMessages.authorType,
      authorUserName: users.name,
      visibility: ticketMessages.visibility,
      channel: ticketMessages.channel,
      body: ticketMessages.body,
      createdAt: ticketMessages.createdAt,
    })
    .from(ticketMessages)
    .leftJoin(users, eq(ticketMessages.authorUserId, users.id))
    .where(eq(ticketMessages.ticketId, chat.ticketId))
    .orderBy(asc(ticketMessages.createdAt));

  return { chat, messages };
}

export async function listChatAssignees() {
  return listEligibleSupportResponders();
}

export async function claimInternalChat(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
): Promise<void> {
  const scope = requireChatScope(permissions, "chat.respond");
  const db = getDatabase();
  const [chat] = await db
    .select({
      ticketId: tickets.id,
      assignedUserId: tickets.assignedUserId,
      status: tickets.status,
    })
    .from(webChatSessions)
    .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);
  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireTicketAccess(actorUserId, scope, chat.ticketId);
  if (chat.status === "closed") throw new Error("CHAT_CLOSED");
  if (chat.assignedUserId && chat.assignedUserId !== actorUserId) {
    throw new Error("CHAT_ALREADY_ASSIGNED");
  }
  if (chat.assignedUserId === actorUserId) return;

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({
        assignedUserId: actorUserId,
        status: chat.status === "new" ? "open" : chat.status,
        updatedAt: now,
      })
      .where(eq(tickets.id, chat.ticketId));
    await tx
      .update(webChatSessions)
      .set({
        aiState: "human",
        aiHandoffReason: "Conversa assumida por um atendente humano.",
        aiHandoffAt: now,
        aiProcessingAt: null,
      })
      .where(eq(webChatSessions.id, sessionId));
    await tx.insert(ticketEvents).values({
      ticketId: chat.ticketId,
      actorUserId,
      eventType: "chat.claimed",
      metadata: { assignedUserId: actorUserId },
    });
    await tx.insert(ticketMessages).values({
      ticketId: chat.ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: "Um atendente da equipe F10 assumiu o atendimento.",
    });
  });
}

export async function assignInternalChat(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
  targetUserId: string,
): Promise<void> {
  const assignScope = getPermissionScope(permissions, "tickets.assign");
  if (!assignScope) throw new Error("CHAT_ASSIGN_NOT_ALLOWED");

  const targetPermissions = await resolveUserPermissions(targetUserId);
  if (!hasPermission(targetPermissions, "chat.respond")) {
    throw new Error("CHAT_ASSIGNEE_NOT_ELIGIBLE");
  }

  const db = getDatabase();
  const [[target], [chat]] = await Promise.all([
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.id, targetUserId), eq(users.status, "active")))
      .limit(1),
    db
      .select({
        ticketId: tickets.id,
        ticketNumber: tickets.ticketNumber,
        status: tickets.status,
      })
      .from(webChatSessions)
      .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
      .where(eq(webChatSessions.id, sessionId))
      .limit(1),
  ]);
  if (!target) throw new Error("CHAT_ASSIGNEE_NOT_ELIGIBLE");
  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireTicketAccess(actorUserId, assignScope, chat.ticketId);
  if (chat.status === "closed") throw new Error("CHAT_CLOSED");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({
        assignedUserId: targetUserId,
        status: chat.status === "new" ? "open" : chat.status,
        updatedAt: now,
      })
      .where(eq(tickets.id, chat.ticketId));
    await tx
      .update(webChatSessions)
      .set({
        aiState: "human",
        aiHandoffReason: "Conversa atribuída a um atendente humano.",
        aiHandoffAt: now,
        aiProcessingAt: null,
      })
      .where(eq(webChatSessions.id, sessionId));
    await tx.insert(ticketEvents).values({
      ticketId: chat.ticketId,
      actorUserId,
      eventType: "chat.assigned",
      metadata: { assignedUserId: targetUserId },
    });
    await tx.insert(ticketMessages).values({
      ticketId: chat.ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: "Seu atendimento foi encaminhado para a equipe responsável.",
    });
    if (targetUserId !== actorUserId) {
      await tx.insert(internalNotifications).values({
        userId: targetUserId,
        actorUserId,
        kind: "chat.assigned",
        title: `Atendimento atribuído a você · #${chat.ticketNumber}`,
        body: "Abra a conversa para continuar o atendimento.",
        href: `/app/chat/${sessionId}`,
        entityType: "ticket",
        entityId: chat.ticketId,
      });
    }
  });
}

export async function respondToInternalChat(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
  body: string,
): Promise<void> {
  const respondScope = requireChatScope(permissions, "chat.respond");
  const db = getDatabase();
  const [chat] = await db
    .select({
      ticketId: tickets.id,
      status: tickets.status,
      assignedUserId: tickets.assignedUserId,
      firstResponseAt: tickets.firstResponseAt,
    })
    .from(webChatSessions)
    .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);

  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireTicketAccess(actorUserId, respondScope, chat.ticketId);
  if (chat.status === "closed") throw new Error("CHAT_CLOSED");
  if (chat.assignedUserId && chat.assignedUserId !== actorUserId) {
    throw new Error("CHAT_ASSIGNED_TO_OTHER_USER");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(webChatSessions)
      .set({
        aiState: "human",
        aiHandoffReason: "Conversa assumida por um atendente humano.",
        aiHandoffAt: now,
        aiProcessingAt: null,
      })
      .where(eq(webChatSessions.id, sessionId));

    await tx.insert(ticketMessages).values({
      ticketId: chat.ticketId,
      authorType: "user",
      authorUserId: actorUserId,
      visibility: "public",
      channel: "web_chat",
      body: body.trim(),
    });

    await tx
      .update(tickets)
      .set({
        assignedUserId: chat.assignedUserId ?? actorUserId,
        firstResponseAt: chat.firstResponseAt ?? now,
        status: chat.status === "new" ? "open" : chat.status,
        updatedAt: now,
      })
      .where(eq(tickets.id, chat.ticketId));

    await tx.insert(ticketEvents).values({
      ticketId: chat.ticketId,
      actorUserId,
      eventType: "chat.agent.message",
      metadata: { aiState: "human" },
    });
  });
}
