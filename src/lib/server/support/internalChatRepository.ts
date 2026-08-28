import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";
import { getPermissionScope, hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { webChatMessages, webChatSessions } from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { users } from "$lib/server/db/schema";
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

async function requireChatAccess(
  actorUserId: string,
  scope: "own" | "team" | "all",
  chat: {
    ticketId: string | null;
    queueId: string;
    assignedUserId: string | null;
  },
): Promise<void> {
  if (chat.ticketId) {
    await requireTicketAccess(actorUserId, scope, chat.ticketId);
    return;
  }
  if (scope === "all" || chat.assignedUserId === actorUserId) return;
  if (scope === "team") {
    const queueIds = await getUserSupportQueueIds(actorUserId);
    if (queueIds.includes(chat.queueId)) return;
  }
  throw new Error("CHAT_ACCESS_DENIED");
}

function chatAssignmentScope(permissions: SupportPermissionMap) {
  return getPermissionScope(permissions, "chat.manage") ?? getPermissionScope(permissions, "tickets.assign");
}

export async function listInternalChats(
  actorUserId: string,
  permissions: SupportPermissionMap,
) {
  const scope = requireChatScope(permissions, "chat.view");
  const ownCondition = eq(webChatSessions.assignedUserId, actorUserId);
  let accessCondition = ownCondition;

  if (scope === "all") {
    accessCondition = undefined;
  } else if (scope === "team") {
    const queueIds = await getUserSupportQueueIds(actorUserId);
    accessCondition = queueIds.length > 0
      ? or(ownCondition, inArray(webChatSessions.queueId, queueIds))
      : ownCondition;
  }

  return getDatabase()
    .select({
      sessionId: webChatSessions.id,
      ticketId: webChatSessions.ticketId,
      ticketNumber: tickets.ticketNumber,
      subject: webChatSessions.subject,
      status: sql<string>`coalesce(${tickets.status}::text, case when ${webChatSessions.closedAt} is null then 'open' else 'closed' end)`,
      priority: sql<string>`coalesce(${tickets.priority}::text, 'normal')`,
      aiState: webChatSessions.aiState,
      aiHandoffReason: webChatSessions.aiHandoffReason,
      assignedUserId: webChatSessions.assignedUserId,
      assignedUserName: users.name,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      organizationName: customerOrganizations.name,
      firstResponseDueAt: tickets.firstResponseDueAt,
      resolutionDueAt: tickets.resolutionDueAt,
      firstResponseAt: sql<Date | null>`coalesce(${tickets.firstResponseAt}, ${webChatSessions.firstResponseAt})`,
      lastMessageBody: sql<string | null>`coalesce(
        (
          select tm.body
          from ticket_messages tm
          where tm.ticket_id = ${webChatSessions.ticketId} and tm.visibility = 'public'
          order by tm.created_at desc
          limit 1
        ),
        (
          select cm.body
          from web_chat_messages cm
          where cm.session_id = ${webChatSessions.id}
          order by cm.created_at desc
          limit 1
        )
      )`,
      lastMessageAuthorType: sql<string | null>`coalesce(
        (
          select tm.author_type::text
          from ticket_messages tm
          where tm.ticket_id = ${webChatSessions.ticketId} and tm.visibility = 'public'
          order by tm.created_at desc
          limit 1
        ),
        (
          select cm.author_type::text
          from web_chat_messages cm
          where cm.session_id = ${webChatSessions.id}
          order by cm.created_at desc
          limit 1
        )
      )`,
      lastSeenAt: webChatSessions.lastSeenAt,
      updatedAt: webChatSessions.updatedAt,
      closedAt: webChatSessions.closedAt,
      legacyUserId: webChatSessions.legacyUserId,
      groupId: webChatSessions.groupId,
      groupName: webChatSessions.groupName,
      unitId: webChatSessions.unitId,
      unitName: webChatSessions.unitName,
      unitSchema: webChatSessions.unitSchema,
    })
    .from(webChatSessions)
    .leftJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .leftJoin(users, eq(webChatSessions.assignedUserId, users.id))
    .leftJoin(customerContacts, eq(webChatSessions.customerContactId, customerContacts.id))
    .leftJoin(customerOrganizations, eq(customerContacts.organizationId, customerOrganizations.id))
    .where(accessCondition)
    .orderBy(desc(webChatSessions.updatedAt))
    .limit(300)
    .then((rows) => rows.map((row) => ({
      ...row,
      customerContext: row.legacyUserId && row.groupId !== null && row.groupName && row.unitId !== null && row.unitName
        ? {
            scope: "unit" as const,
            legacyUserId: row.legacyUserId,
            groupId: row.groupId,
            groupName: row.groupName,
            unitId: row.unitId,
            unitName: row.unitName,
            unitSchema: row.unitSchema,
          }
        : null,
    })));
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
      ticketId: webChatSessions.ticketId,
      ticketNumber: tickets.ticketNumber,
      subject: webChatSessions.subject,
      status: sql<string>`coalesce(${tickets.status}::text, case when ${webChatSessions.closedAt} is null then 'open' else 'closed' end)`,
      priority: sql<string>`coalesce(${tickets.priority}::text, 'normal')`,
      queueId: webChatSessions.queueId,
      queueName: supportQueues.name,
      aiState: webChatSessions.aiState,
      aiHandoffReason: webChatSessions.aiHandoffReason,
      aiHandoffAt: webChatSessions.aiHandoffAt,
      assignedUserId: webChatSessions.assignedUserId,
      assignedUserName: users.name,
      customerContactId: webChatSessions.customerContactId,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      customerPhone: customerContacts.phone,
      organizationName: customerOrganizations.name,
      contextUrl: webChatSessions.contextUrl,
      contextData: webChatSessions.contextData,
      firstResponseDueAt: tickets.firstResponseDueAt,
      resolutionDueAt: tickets.resolutionDueAt,
      firstResponseAt: sql<Date | null>`coalesce(${tickets.firstResponseAt}, ${webChatSessions.firstResponseAt})`,
      linkedTaskId: tickets.linkedTaskId,
      lastSeenAt: webChatSessions.lastSeenAt,
      createdAt: webChatSessions.createdAt,
      updatedAt: webChatSessions.updatedAt,
      closedAt: webChatSessions.closedAt,
      legacyUserId: webChatSessions.legacyUserId,
      groupId: webChatSessions.groupId,
      groupName: webChatSessions.groupName,
      unitId: webChatSessions.unitId,
      unitName: webChatSessions.unitName,
      unitSchema: webChatSessions.unitSchema,
    })
    .from(webChatSessions)
    .innerJoin(supportQueues, eq(webChatSessions.queueId, supportQueues.id))
    .leftJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .leftJoin(users, eq(webChatSessions.assignedUserId, users.id))
    .leftJoin(customerContacts, eq(webChatSessions.customerContactId, customerContacts.id))
    .leftJoin(customerOrganizations, eq(customerContacts.organizationId, customerOrganizations.id))
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);

  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireChatAccess(actorUserId, scope, chat);

  return {
    ...chat,
    customerContext: chat.legacyUserId && chat.groupId !== null && chat.groupName && chat.unitId !== null && chat.unitName
      ? {
          scope: "unit" as const,
          legacyUserId: chat.legacyUserId,
          groupId: chat.groupId,
          groupName: chat.groupName,
          unitId: chat.unitId,
          unitName: chat.unitName,
          unitSchema: chat.unitSchema,
        }
      : null,
  };
}

export async function listInternalChatMessages(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
) {
  const chat = await getInternalChat(actorUserId, permissions, sessionId);
  const db = getDatabase();

  const messages = chat.ticketId
    ? await db
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
        .orderBy(asc(ticketMessages.createdAt))
    : await db
        .select({
          id: webChatMessages.id,
          authorType: webChatMessages.authorType,
          authorUserName: users.name,
          body: webChatMessages.body,
          createdAt: webChatMessages.createdAt,
        })
        .from(webChatMessages)
        .leftJoin(users, eq(webChatMessages.authorUserId, users.id))
        .where(eq(webChatMessages.sessionId, sessionId))
        .orderBy(asc(webChatMessages.createdAt))
        .then((rows) => rows.map((message) => ({
          ...message,
          visibility: "public" as const,
          channel: "web_chat" as const,
        })));

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
      ticketId: webChatSessions.ticketId,
      queueId: webChatSessions.queueId,
      assignedUserId: webChatSessions.assignedUserId,
      closedAt: webChatSessions.closedAt,
      ticketStatus: tickets.status,
    })
    .from(webChatSessions)
    .leftJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);
  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireChatAccess(actorUserId, scope, chat);
  if (chat.closedAt) throw new Error("CHAT_CLOSED");
  if (chat.assignedUserId && chat.assignedUserId !== actorUserId) {
    throw new Error("CHAT_ALREADY_ASSIGNED");
  }
  if (chat.assignedUserId === actorUserId) return;

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(webChatSessions)
      .set({
        assignedUserId: actorUserId,
        aiState: "human",
        aiHandoffReason: "Conversa assumida por um atendente humano.",
        aiHandoffAt: now,
        aiProcessingAt: null,
        updatedAt: now,
      })
      .where(eq(webChatSessions.id, sessionId));

    if (chat.ticketId) {
      await tx
        .update(tickets)
        .set({
          assignedUserId: actorUserId,
          status: chat.ticketStatus === "new" ? "open" : chat.ticketStatus,
          updatedAt: now,
        })
        .where(eq(tickets.id, chat.ticketId));
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
    } else {
      await tx.insert(webChatMessages).values({
        sessionId,
        authorType: "system",
        body: "Um atendente da equipe F10 assumiu o atendimento.",
      });
    }
  });
}

export async function assignInternalChat(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
  targetUserId: string,
): Promise<void> {
  const assignScope = chatAssignmentScope(permissions);
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
        ticketId: webChatSessions.ticketId,
        queueId: webChatSessions.queueId,
        assignedUserId: webChatSessions.assignedUserId,
        closedAt: webChatSessions.closedAt,
        ticketNumber: tickets.ticketNumber,
        ticketStatus: tickets.status,
      })
      .from(webChatSessions)
      .leftJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
      .where(eq(webChatSessions.id, sessionId))
      .limit(1),
  ]);
  if (!target) throw new Error("CHAT_ASSIGNEE_NOT_ELIGIBLE");
  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireChatAccess(actorUserId, assignScope, chat);
  if (chat.closedAt) throw new Error("CHAT_CLOSED");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(webChatSessions)
      .set({
        assignedUserId: targetUserId,
        aiState: "human",
        aiHandoffReason: "Conversa atribuída a um atendente humano.",
        aiHandoffAt: now,
        aiProcessingAt: null,
        updatedAt: now,
      })
      .where(eq(webChatSessions.id, sessionId));

    if (chat.ticketId) {
      await tx
        .update(tickets)
        .set({
          assignedUserId: targetUserId,
          status: chat.ticketStatus === "new" ? "open" : chat.ticketStatus,
          updatedAt: now,
        })
        .where(eq(tickets.id, chat.ticketId));
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
    } else {
      await tx.insert(webChatMessages).values({
        sessionId,
        authorType: "system",
        body: "Seu atendimento foi encaminhado para a equipe responsável.",
      });
    }

    if (targetUserId !== actorUserId) {
      await tx.insert(internalNotifications).values({
        userId: targetUserId,
        actorUserId,
        kind: "chat.assigned",
        title: chat.ticketNumber
          ? `Atendimento atribuído a você · #${chat.ticketNumber}`
          : "Atendimento atribuído a você",
        body: "Abra a conversa para continuar o atendimento.",
        href: `/app/chat/${sessionId}`,
        entityType: chat.ticketId ? "ticket" : "chat",
        entityId: chat.ticketId ?? sessionId,
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
      ticketId: webChatSessions.ticketId,
      queueId: webChatSessions.queueId,
      assignedUserId: webChatSessions.assignedUserId,
      closedAt: webChatSessions.closedAt,
      firstResponseAt: webChatSessions.firstResponseAt,
      ticketStatus: tickets.status,
      ticketFirstResponseAt: tickets.firstResponseAt,
    })
    .from(webChatSessions)
    .leftJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);

  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireChatAccess(actorUserId, respondScope, chat);
  if (chat.closedAt) throw new Error("CHAT_CLOSED");
  if (chat.assignedUserId && chat.assignedUserId !== actorUserId) {
    throw new Error("CHAT_ASSIGNED_TO_OTHER_USER");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(webChatSessions)
      .set({
        assignedUserId: chat.assignedUserId ?? actorUserId,
        aiState: "human",
        aiHandoffReason: "Conversa assumida por um atendente humano.",
        aiHandoffAt: now,
        aiProcessingAt: null,
        firstResponseAt: chat.firstResponseAt ?? now,
        updatedAt: now,
      })
      .where(eq(webChatSessions.id, sessionId));

    if (chat.ticketId) {
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
          firstResponseAt: chat.ticketFirstResponseAt ?? now,
          status: chat.ticketStatus === "new" ? "open" : chat.ticketStatus,
          updatedAt: now,
        })
        .where(eq(tickets.id, chat.ticketId));
      await tx.insert(ticketEvents).values({
        ticketId: chat.ticketId,
        actorUserId,
        eventType: "chat.agent.message",
        metadata: { aiState: "human" },
      });
    } else {
      await tx.insert(webChatMessages).values({
        sessionId,
        authorType: "user",
        authorUserId: actorUserId,
        body: body.trim(),
      });
    }
  });
}
