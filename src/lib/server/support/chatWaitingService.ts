import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getPermissionScope, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { supportChatEvents, webChatSessions } from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { teamMembers, users } from "$lib/server/db/schema";
import { supportQueues } from "$lib/server/db/supportSchema";
import { sendDevicePushAlerts } from "$lib/server/notifications/devicePush";
import { getChatWaitingSettings, type ChatWaitingSettings } from "$lib/server/settings/chatWaitingSettingsRepository";
import { chatWaitingSinceMs } from "$lib/server/support/chatWaitingQuery";
import { canAccessTicket, getUserSupportQueueIds } from "$lib/server/support/supportAccess";
import { getSupportAvailabilityStatus } from "$lib/server/support/publicSupportStatus";

const REMINDER_EVENT = "wait_reminder";
const NO_RECIPIENT_EVENT = "wait_reminder_no_recipient";
const MAX_REMINDERS_PER_CYCLE = 5;
const BATCH_SIZE = 25;

export async function getPublicChatWaitingStatus(sessionId: string) {
  const [settings, rows] = await Promise.all([
    getChatWaitingSettings(),
    getDatabase().select({ waitingSinceMs: chatWaitingSinceMs() })
      .from(webChatSessions).where(eq(webChatSessions.id, sessionId)).limit(1),
  ]);
  const waitingSinceMs = rows[0]?.waitingSinceMs ?? null;
  const elapsed = waitingSinceMs === null ? 0 : Date.now() - waitingSinceMs;
  const outsideHours = waitingSinceMs !== null && settings.enabled && settings.offerTicket
    && elapsed < settings.delaySeconds * 1000
    && (await getSupportAvailabilityStatus()).isOpen === false;
  return {
    waitingSinceMs,
    offerTicket: settings.enabled && settings.offerTicket && waitingSinceMs !== null
      && (outsideHours || elapsed >= settings.delaySeconds * 1000),
  };
}

type ReminderChat = {
  id: string;
  ticketId: string | null;
  queueId: string;
  assignedUserId: string | null;
  subject: string;
};

async function getReminderRecipients(chat: ReminderChat): Promise<string[]> {
  const db = getDatabase();
  const [queue] = await db.select({ teamId: supportQueues.teamId })
    .from(supportQueues).where(eq(supportQueues.id, chat.queueId)).limit(1);

  const candidates = chat.assignedUserId
    ? await db.select({ id: users.id }).from(users)
        .where(and(eq(users.id, chat.assignedUserId), eq(users.status, "active")))
    : queue?.teamId
      ? await db.select({ id: users.id }).from(teamMembers)
          .innerJoin(users, eq(teamMembers.userId, users.id))
          .where(and(eq(teamMembers.teamId, queue.teamId), eq(users.status, "active")))
      : await db.select({ id: users.id }).from(users).where(eq(users.status, "active"));

  const eligible = await Promise.all(candidates.map(async ({ id }) => {
    const permissions = await resolveUserPermissions(id);
    const view = getPermissionScope(permissions, "chat.view");
    const respond = getPermissionScope(permissions, "chat.respond");
    if (!view || !respond) return null;
    if (chat.ticketId) {
      return await canAccessTicket(id, view, chat.ticketId)
        && await canAccessTicket(id, respond, chat.ticketId) ? id : null;
    }
    if (chat.assignedUserId === id) return id;
    if (view === "own" || respond === "own") return null;
    if (view === "team" || respond === "team") {
      const queues = await getUserSupportQueueIds(id);
      if (!queues.includes(chat.queueId)) return null;
    }
    return id;
  }));
  return [...new Set(eligible.filter((id): id is string => Boolean(id)))];
}

async function sendReminder(chat: ReminderChat, settings: ChatWaitingSettings): Promise<void> {
  const recipientIds = await getReminderRecipients(chat);
  const notifications = await getDatabase().transaction(async (tx) => {
    const [locked] = await tx.select({
      ticketId: webChatSessions.ticketId,
      queueId: webChatSessions.queueId,
      assignedUserId: webChatSessions.assignedUserId,
      closedAt: webChatSessions.closedAt,
    }).from(webChatSessions).where(eq(webChatSessions.id, chat.id)).limit(1).for("update");
    if (!locked || locked.closedAt || locked.assignedUserId !== chat.assignedUserId
      || locked.ticketId !== chat.ticketId || locked.queueId !== chat.queueId) return [];

    const [state] = await tx.select({ waitingSinceMs: chatWaitingSinceMs() })
      .from(webChatSessions).where(eq(webChatSessions.id, chat.id)).limit(1);
    const waitingSinceMs = state?.waitingSinceMs;
    const now = new Date();
    if (waitingSinceMs == null || now.getTime() - waitingSinceMs < settings.delaySeconds * 1000) return [];

    const previous = await tx.select({ occurredAt: supportChatEvents.occurredAt })
      .from(supportChatEvents).where(and(
        eq(supportChatEvents.sessionId, chat.id),
        eq(supportChatEvents.eventType, REMINDER_EVENT),
        gt(supportChatEvents.occurredAt, new Date(waitingSinceMs - 1)),
      )).orderBy(desc(supportChatEvents.occurredAt)).limit(MAX_REMINDERS_PER_CYCLE);
    if (previous.length >= MAX_REMINDERS_PER_CYCLE
      || (previous[0] && now.getTime() - previous[0].occurredAt.getTime() < settings.repeatSeconds * 1000)) return [];

    if (recipientIds.length === 0) {
      const [lastAttempt] = await tx.select({ occurredAt: supportChatEvents.occurredAt })
        .from(supportChatEvents).where(and(
          eq(supportChatEvents.sessionId, chat.id),
          eq(supportChatEvents.eventType, NO_RECIPIENT_EVENT),
          gt(supportChatEvents.occurredAt, new Date(waitingSinceMs - 1)),
        )).orderBy(desc(supportChatEvents.occurredAt)).limit(1);
      if (!lastAttempt || now.getTime() - lastAttempt.occurredAt.getTime() >= settings.repeatSeconds * 1000) {
        await tx.insert(supportChatEvents).values({ sessionId: chat.id, eventType: NO_RECIPIENT_EVENT, occurredAt: now });
      }
      return [];
    }

    const elapsed = Math.floor((now.getTime() - waitingSinceMs) / 1000);
    const duration = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}min`;
    const added = await tx.insert(internalNotifications).values(recipientIds.map((userId) => ({
      userId,
      kind: "chat.wait_reminder",
      title: "Cliente aguardando atendimento",
      body: `${chat.subject} — sem resposta há ${duration}.`.slice(0, 500),
      href: `/app/chat/${chat.id}`,
      entityType: "chat",
      entityId: chat.id,
    }))).returning({
      id: internalNotifications.id,
      userId: internalNotifications.userId,
      title: internalNotifications.title,
      body: internalNotifications.body,
      kind: internalNotifications.kind,
    });
    await tx.insert(supportChatEvents).values({
      sessionId: chat.id, eventType: REMINDER_EVENT, occurredAt: now,
    });
    return added;
  });
  if (notifications.length > 0) {
    await sendDevicePushAlerts(notifications).catch((cause) => {
      console.error("[chat.wait_reminder.push]", { sessionId: chat.id, cause });
    });
  }
}

export async function processChatWaitingReminders(): Promise<void> {
  const settings = await getChatWaitingSettings();
  if (!settings.enabled || !settings.notifyTeam) return;
  if ((await getSupportAvailabilityStatus()).isOpen === false) return;

  const now = Date.now();
  const waiting = chatWaitingSinceMs();
  const candidates = await getDatabase().select({
    id: webChatSessions.id,
    ticketId: webChatSessions.ticketId,
    queueId: webChatSessions.queueId,
    assignedUserId: webChatSessions.assignedUserId,
    subject: webChatSessions.subject,
  }).from(webChatSessions).where(and(
    isNull(webChatSessions.closedAt),
    sql`${waiting} <= ${now - settings.delaySeconds * 1000}`,
    sql`not exists (
      select 1 from support_chat_events e
      where e.session_id = ${webChatSessions.id} and e.event_type in (${REMINDER_EVENT}, ${NO_RECIPIENT_EVENT})
        and extract(epoch from e.occurred_at) * 1000 >= greatest(
          ${waiting}, ${now - settings.repeatSeconds * 1000}
        )
    )`,
    sql`(
      select count(*) from support_chat_events e
      where e.session_id = ${webChatSessions.id} and e.event_type = ${REMINDER_EVENT}
        and extract(epoch from e.occurred_at) * 1000 >= ${waiting}
    ) < ${MAX_REMINDERS_PER_CYCLE}`,
  )).orderBy(waiting).limit(BATCH_SIZE);

  for (const chat of candidates) {
    try { await sendReminder(chat, settings); }
    catch (cause) { console.error("[chat.wait_reminder]", { sessionId: chat.id, cause }); }
  }
}
