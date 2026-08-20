import { and, count, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { users } from "$lib/server/db/schema";
import {
  customerContacts,
  customerOrganizations,
  tickets,
} from "$lib/server/db/supportSchema";
import type { SupportPermissionMap } from "$lib/server/support/supportAccess";

const CHAT_NOTIFICATION_KINDS = [
  "ticket.customer_reply",
  "chat.customer_reply",
  "chat.assigned",
];

function requireChatRespondPermission(permissions: SupportPermissionMap): void {
  if (!getPermissionScope(permissions, "chat.respond")) {
    throw new Error("CHAT_PERMISSION_NOT_ALLOWED");
  }
}

export async function listActiveChatDockItems(
  actorUserId: string,
  permissions: SupportPermissionMap,
) {
  requireChatRespondPermission(permissions);
  const db = getDatabase();

  const rows = await db
    .select({
      sessionId: webChatSessions.id,
      ticketId: tickets.id,
      ticketNumber: tickets.ticketNumber,
      status: tickets.status,
      customerName: customerContacts.name,
      organizationName: customerOrganizations.name,
      assignedUserName: users.name,
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
      updatedAt: tickets.updatedAt,
    })
    .from(webChatSessions)
    .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .leftJoin(users, eq(tickets.assignedUserId, users.id))
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    )
    .where(
      and(
        eq(tickets.channel, "web_chat"),
        eq(tickets.assignedUserId, actorUserId),
        ne(tickets.status, "closed"),
        isNull(webChatSessions.closedAt),
      ),
    )
    .orderBy(desc(tickets.updatedAt))
    .limit(12);

  if (rows.length === 0) return [];

  const ticketIds = rows.map((row) => row.ticketId);
  const unreadRows = await db
    .select({
      ticketId: internalNotifications.entityId,
      value: count(),
    })
    .from(internalNotifications)
    .where(
      and(
        eq(internalNotifications.userId, actorUserId),
        eq(internalNotifications.entityType, "ticket"),
        inArray(internalNotifications.entityId, ticketIds),
        inArray(internalNotifications.kind, CHAT_NOTIFICATION_KINDS),
        isNull(internalNotifications.readAt),
      ),
    )
    .groupBy(internalNotifications.entityId);

  const unreadByTicket = new Map(
    unreadRows.map((row) => [row.ticketId, Number(row.value)]),
  );

  return rows.map((row) => ({
    ...row,
    unreadCount: unreadByTicket.get(row.ticketId) ?? 0,
  }));
}

export async function markChatDockRead(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
): Promise<void> {
  requireChatRespondPermission(permissions);
  const db = getDatabase();
  const [chat] = await db
    .select({ ticketId: tickets.id })
    .from(webChatSessions)
    .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .where(
      and(
        eq(webChatSessions.id, sessionId),
        eq(tickets.assignedUserId, actorUserId),
        ne(tickets.status, "closed"),
        isNull(webChatSessions.closedAt),
      ),
    )
    .limit(1);

  if (!chat) throw new Error("CHAT_NOT_ACCESSIBLE");

  await db
    .update(internalNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(internalNotifications.userId, actorUserId),
        eq(internalNotifications.entityType, "ticket"),
        eq(internalNotifications.entityId, chat.ticketId),
        inArray(internalNotifications.kind, CHAT_NOTIFICATION_KINDS),
        isNull(internalNotifications.readAt),
      ),
    );
}
