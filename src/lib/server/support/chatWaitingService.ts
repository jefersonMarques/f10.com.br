import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getPermissionScope, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { supportChatEvents, webChatSessions } from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { teamMembers, users } from "$lib/server/db/schema";
import { supportQueues, tickets } from "$lib/server/db/supportSchema";
import { sendDevicePushAlerts } from "$lib/server/notifications/devicePush";
import { getChatWaitingSettings, type ChatWaitingSettings } from "$lib/server/settings/chatWaitingSettingsRepository";
import { chatWaitingSinceMs } from "$lib/server/support/chatWaitingQuery";
import { canAccessTicket, getUserSupportQueueIds } from "$lib/server/support/supportAccess";
import { listSupportAgentPresence } from "$lib/server/support/supportAgentPresence";
import { getChatEscalationLevel, type ChatEscalationLevel } from "$lib/support/chatOperationalPolicy";
import { getSupportAvailabilityStatus } from "$lib/server/support/publicSupportStatus";

const REMINDER_EVENT = "wait_reminder";
const NO_RECIPIENT_EVENT = "wait_reminder_no_recipient";
const TEAM_EVENT = "wait_escalation_team";
const SUPERVISOR_EVENT = "wait_escalation_supervisor";
const MAX_REMINDERS_PER_CYCLE = 5;
const BATCH_SIZE = 25;

export async function getPublicChatWaitingStatus(sessionId: string) {
  const [settings, rows] = await Promise.all([
    getChatWaitingSettings(),
    getDatabase().select({
      waitingSinceMs: chatWaitingSinceMs(),
      closedAt: webChatSessions.closedAt,
      aiState: webChatSessions.aiState,
      ticketId: webChatSessions.ticketId,
      ticketStatus: tickets.status,
    }).from(webChatSessions)
      .leftJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
      .where(eq(webChatSessions.id, sessionId)).limit(1),
  ]);
  const chat = rows[0];
  const waitingSinceMs = chat?.waitingSinceMs ?? null;
  const canConvert = Boolean(chat && !chat.closedAt && chat.aiState !== "active"
    && (!chat.ticketId || (chat.ticketStatus && !["resolved", "closed"].includes(chat.ticketStatus))));
  if (!canConvert) return { waitingSinceMs, offerTicket: false };

  const delayedOffer = settings.enabled && settings.offerTicket && waitingSinceMs !== null
    && Date.now() - waitingSinceMs >= settings.delaySeconds * 1000;
  if (delayedOffer) return { waitingSinceMs, offerTicket: true };

  // A opção fora do expediente independe dos reforços e do tempo de espera.
  const availability = await getSupportAvailabilityStatus().catch(() => null);
  return { waitingSinceMs, offerTicket: availability?.isOpen === false };
}

type ReminderChat = {
  id: string;
  ticketId: string | null;
  queueId: string;
  assignedUserId: string | null;
  subject: string;
};

async function getReminderRecipients(
  chat: ReminderChat,
  level: ChatEscalationLevel,
): Promise<string[]> {
  const db = getDatabase();
  const [queue] = await db.select({ teamId: supportQueues.teamId })
    .from(supportQueues).where(eq(supportQueues.id, chat.queueId)).limit(1);

  const candidates = level === "owner" && chat.assignedUserId
    ? await db.select({ id: users.id }).from(users)
        .where(and(eq(users.id, chat.assignedUserId), eq(users.status, "active")))
    : queue?.teamId && level !== "supervisor"
      ? await db.select({ id: users.id }).from(teamMembers)
          .innerJoin(users, eq(teamMembers.userId, users.id))
          .where(and(eq(teamMembers.teamId, queue.teamId), eq(users.status, "active")))
      : await db.select({ id: users.id }).from(users).where(eq(users.status, "active"));

  const candidateIds = [...new Set(candidates.map(({ id }) => id))];
  const presence = level === "team" ? await listSupportAgentPresence(candidateIds) : null;
  const eligible = await Promise.all(candidateIds.map(async (id) => {
    const permissions = await resolveUserPermissions(id);
    const view = getPermissionScope(permissions, "chat.view");
    const action = getPermissionScope(permissions, level === "supervisor" ? "chat.manage" : "chat.respond");
    if (!view || !action) return null;
    if (presence && id !== chat.assignedUserId && presence.get(id)?.effectiveStatus !== "online") return null;
    if (chat.ticketId) {
      return await canAccessTicket(id, view, chat.ticketId)
        && await canAccessTicket(id, action, chat.ticketId) ? id : null;
    }
    if (chat.assignedUserId === id) return id;
    if (view === "own" || action === "own") return null;
    if (view === "team" || action === "team") {
      const queues = await getUserSupportQueueIds(id);
      if (!queues.includes(chat.queueId)) return null;
    }
    return id;
  }));
  return eligible.filter((id): id is string => Boolean(id));
}

async function sendReminder(
  chat: ReminderChat & { waitingSinceMs: number | null },
  settings: ChatWaitingSettings,
): Promise<void> {
  if (chat.waitingSinceMs === null) return;
  const level = getChatEscalationLevel(
    (Date.now() - chat.waitingSinceMs) / 1000,
    settings.teamEscalationSeconds,
    settings.supervisorEscalationSeconds,
  );
  let recipientIds = await getReminderRecipients(chat, level);
  if (level === "supervisor" && recipientIds.length === 0) {
    recipientIds = await getReminderRecipients(chat, "team");
  }
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
    if (waitingSinceMs == null || waitingSinceMs !== chat.waitingSinceMs
      || now.getTime() - waitingSinceMs < settings.delaySeconds * 1000) return [];
    const currentLevel = getChatEscalationLevel(
      (now.getTime() - waitingSinceMs) / 1000,
      settings.teamEscalationSeconds,
      settings.supervisorEscalationSeconds,
    );
    if (currentLevel !== level) return [];
    const escalationEvent = level === "supervisor" ? SUPERVISOR_EVENT : level === "team" ? TEAM_EVENT : null;
    const [previousEscalation] = escalationEvent ? await tx.select({ id: supportChatEvents.id })
      .from(supportChatEvents).where(and(
        eq(supportChatEvents.sessionId, chat.id),
        eq(supportChatEvents.eventType, escalationEvent),
        gt(supportChatEvents.occurredAt, new Date(waitingSinceMs - 1)),
      )).limit(1) : [];
    const firstEscalation = Boolean(escalationEvent && !previousEscalation);

    const previous = await tx.select({ occurredAt: supportChatEvents.occurredAt })
      .from(supportChatEvents).where(and(
        eq(supportChatEvents.sessionId, chat.id),
        eq(supportChatEvents.eventType, REMINDER_EVENT),
        gt(supportChatEvents.occurredAt, new Date(waitingSinceMs - 1)),
      )).orderBy(desc(supportChatEvents.occurredAt)).limit(MAX_REMINDERS_PER_CYCLE);
    if (!firstEscalation && (previous.length >= MAX_REMINDERS_PER_CYCLE
      || (previous[0] && now.getTime() - previous[0].occurredAt.getTime() < settings.repeatSeconds * 1000))) return [];

    if (firstEscalation && escalationEvent) {
      await tx.insert(supportChatEvents).values({ sessionId: chat.id, eventType: escalationEvent, occurredAt: now });
    }

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
      title: level === "supervisor" ? "Atendimento crítico" : level === "team" ? "Equipe: cliente aguardando" : "Cliente aguardando atendimento",
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
    waitingSinceMs: waiting,
  }).from(webChatSessions).where(and(
    isNull(webChatSessions.closedAt),
    sql`${waiting} <= ${now - settings.delaySeconds * 1000}`,
    sql`((
      not exists (
        select 1 from support_chat_events e
        where e.session_id = ${webChatSessions.id} and e.event_type in (${REMINDER_EVENT}, ${NO_RECIPIENT_EVENT})
          and extract(epoch from e.occurred_at) * 1000 >= greatest(
            ${waiting}, ${now - settings.repeatSeconds * 1000}
          )
      )
      and (
        select count(*) from support_chat_events e
        where e.session_id = ${webChatSessions.id} and e.event_type = ${REMINDER_EVENT}
          and extract(epoch from e.occurred_at) * 1000 >= ${waiting}
      ) < ${MAX_REMINDERS_PER_CYCLE}
    ) or (
      ${waiting} <= ${now - settings.teamEscalationSeconds * 1000}
      and not exists (
        select 1 from support_chat_events e
        where e.session_id = ${webChatSessions.id}
          and e.event_type = case
            when ${waiting} <= ${now - settings.supervisorEscalationSeconds * 1000}
            then ${SUPERVISOR_EVENT} else ${TEAM_EVENT} end
          and extract(epoch from e.occurred_at) * 1000 >= ${waiting}
      )
    ))`,
  )).orderBy(waiting).limit(BATCH_SIZE);

  for (const chat of candidates) {
    try { await sendReminder(chat, settings); }
    catch (cause) { console.error("[chat.wait_reminder]", { sessionId: chat.id, cause }); }
  }
}
