import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { teamMembers, users } from "$lib/server/db/schema";
import { ticketAreas, ticketWorkflowStates } from "$lib/server/db/ticketWorkflowSchema";
import { supportQueues, tickets } from "$lib/server/db/supportSchema";
import { autoAssignChatIfConfigured } from "$lib/server/support/supportChatRoutingRepository";
import { autoAssignTicketIfConfigured } from "$lib/server/support/supportRoutingRepository";

export async function notifySupportChatNeedsAttention(
  sessionId: string,
  reason: string,
): Promise<void> {
  const db = getDatabase();
  const [chat] = await db
    .select({
      subject: webChatSessions.subject,
      assignedUserId: webChatSessions.assignedUserId,
      teamId: supportQueues.teamId,
    })
    .from(webChatSessions)
    .innerJoin(supportQueues, eq(webChatSessions.queueId, supportQueues.id))
    .where(and(eq(webChatSessions.id, sessionId), isNull(webChatSessions.closedAt)))
    .limit(1);
  if (!chat) return;

  if (!chat.assignedUserId) {
    const autoAssignedUserId = await autoAssignChatIfConfigured(sessionId);
    if (autoAssignedUserId) return;
  }

  let recipientIds: string[] = [];
  if (chat.assignedUserId) {
    recipientIds = [chat.assignedUserId];
  } else if (chat.teamId) {
    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(and(eq(teamMembers.teamId, chat.teamId), eq(users.status, "active")));
    recipientIds = Array.from(new Set(members.map((member) => member.userId)));
  }
  if (recipientIds.length === 0) return;

  const existing = await db
    .select({ userId: internalNotifications.userId })
    .from(internalNotifications)
    .where(
      and(
        inArray(internalNotifications.userId, recipientIds),
        eq(internalNotifications.kind, "chat.needs_attention"),
        eq(internalNotifications.entityType, "chat"),
        eq(internalNotifications.entityId, sessionId),
        isNull(internalNotifications.readAt),
      ),
    );
  const alreadyNotified = new Set(existing.map((notification) => notification.userId));
  const pendingRecipients = recipientIds.filter((userId) => !alreadyNotified.has(userId));
  if (pendingRecipients.length === 0) return;

  await db.insert(internalNotifications).values(
    pendingRecipients.map((userId) => ({
      userId,
      kind: "chat.needs_attention",
      title: "Chat precisa de atendimento",
      body: `${chat.subject} — ${reason}`.slice(0, 500),
      href: `/app/chat/${sessionId}`,
      entityType: "chat",
      entityId: sessionId,
    })),
  );
}

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
      queueTeamId: supportQueues.teamId,
      areaTeamId: ticketAreas.teamId,
    })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(ticketWorkflowStates, eq(ticketWorkflowStates.ticketId, tickets.id))
    .leftJoin(ticketAreas, eq(ticketAreas.id, ticketWorkflowStates.areaId))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) return;

  if (!ticket.assignedUserId) {
    const autoAssignedUserId = await autoAssignTicketIfConfigured(ticketId);
    if (autoAssignedUserId) return;
  }

  const teamId = ticket.areaTeamId ?? ticket.queueTeamId;
  let recipientIds: string[] = [];
  if (ticket.assignedUserId) {
    recipientIds = [ticket.assignedUserId];
  } else if (teamId) {
    const members = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .where(and(eq(teamMembers.teamId, teamId), eq(users.status, "active")));
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
