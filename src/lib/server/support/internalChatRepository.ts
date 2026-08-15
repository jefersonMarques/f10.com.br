import {
  and,
  asc,
  desc,
  eq,
  inArray,
  or,
} from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
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
  const db = getDatabase();
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

  return db
    .select({
      sessionId: webChatSessions.id,
      ticketId: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      assignedUserName: users.name,
      customerName: customerContacts.name,
      organizationName: customerOrganizations.name,
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
      assignedUserId: tickets.assignedUserId,
      assignedUserName: users.name,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      organizationName: customerOrganizations.name,
      contextUrl: webChatSessions.contextUrl,
      contextData: webChatSessions.contextData,
      lastSeenAt: webChatSessions.lastSeenAt,
      createdAt: webChatSessions.createdAt,
    })
    .from(webChatSessions)
    .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
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
      body: ticketMessages.body,
      createdAt: ticketMessages.createdAt,
    })
    .from(ticketMessages)
    .leftJoin(users, eq(ticketMessages.authorUserId, users.id))
    .where(
      and(
        eq(ticketMessages.ticketId, chat.ticketId),
        eq(ticketMessages.visibility, "public"),
      ),
    )
    .orderBy(asc(ticketMessages.createdAt));

  return { chat, messages };
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
      firstResponseAt: tickets.firstResponseAt,
    })
    .from(webChatSessions)
    .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);

  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireTicketAccess(actorUserId, respondScope, chat.ticketId);
  if (chat.status === "closed") throw new Error("CHAT_CLOSED");

  const now = new Date();
  await db.transaction(async (tx) => {
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
        assignedUserId: actorUserId,
        firstResponseAt: chat.firstResponseAt ?? now,
        status: chat.status === "new" ? "open" : chat.status,
        updatedAt: now,
      })
      .where(eq(tickets.id, chat.ticketId));

    await tx.insert(ticketEvents).values({
      ticketId: chat.ticketId,
      actorUserId,
      eventType: "chat.agent.message",
      metadata: {},
    });
  });
}
