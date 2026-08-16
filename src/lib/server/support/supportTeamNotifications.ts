import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { teamMembers, users } from "$lib/server/db/schema";
import { supportQueues, tickets } from "$lib/server/db/supportSchema";

export async function notifySupportTicketNeedsAttention(
  ticketId: string,
  reason: string,
): Promise<void> {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      channel: tickets.channel,
      assignedUserId: tickets.assignedUserId,
      teamId: supportQueues.teamId,
    })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) return;

  let recipientIds: string[] = [];
  if (ticket.assignedUserId) {
    recipientIds = [ticket.assignedUserId];
  } else if (ticket.teamId) {
    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(and(eq(teamMembers.teamId, ticket.teamId), eq(users.status, "active")));
    recipientIds = Array.from(new Set(members.map((member) => member.userId)));
  }

  if (recipientIds.length === 0) return;

  const [chatSession] = ticket.channel === "web_chat"
    ? await db
        .select({ id: webChatSessions.id })
        .from(webChatSessions)
        .where(eq(webChatSessions.ticketId, ticketId))
        .limit(1)
    : [];
  const isChatNotification = Boolean(chatSession?.id);
  const kind = isChatNotification ? "chat.needs_attention" : "ticket.needs_attention";
  const href = isChatNotification
    ? `/app/chat/${chatSession.id}`
    : `/app/tickets/${ticketId}`;
  const title = isChatNotification
    ? `Chat #${ticket.ticketNumber} precisa de atendimento`
    : `Ticket #${ticket.ticketNumber} precisa de atendimento`;

  const existing = await db
    .select({ userId: internalNotifications.userId })
    .from(internalNotifications)
    .where(
      and(
        inArray(internalNotifications.userId, recipientIds),
        eq(internalNotifications.kind, kind),
        eq(internalNotifications.entityType, "ticket"),
        eq(internalNotifications.entityId, ticketId),
        isNull(internalNotifications.readAt),
      ),
    );
  const alreadyNotified = new Set(existing.map((notification) => notification.userId));
  const pendingRecipients = recipientIds.filter((userId) => !alreadyNotified.has(userId));
  if (pendingRecipients.length === 0) return;

  await db.insert(internalNotifications).values(
    pendingRecipients.map((userId) => ({
      userId,
      kind,
      title,
      body: `${ticket.subject} — ${reason}`.slice(0, 500),
      href,
      entityType: "ticket",
      entityId: ticketId,
    })),
  );
}
