import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  notInArray,
  sql,
} from "drizzle-orm";
import { hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { operationsSettings } from "$lib/server/db/operationsSettingsSchema";
import { teamMembers, users } from "$lib/server/db/schema";
import {
  supportAgentPresence,
  supportChatRoutingMembers,
  supportTicketRoutingMembers,
} from "$lib/server/db/supportRoutingSchema";
import { supportQueues, ticketEvents, tickets } from "$lib/server/db/supportSchema";
import { ticketAreas, ticketWorkflowStates } from "$lib/server/db/ticketWorkflowSchema";
import {
  listSupportAgentPresence,
  SUPPORT_AWAY_AFTER_MS,
} from "$lib/server/support/supportAgentPresence";

export type SupportAssignmentMode = "manual" | "round_robin";

export type SupportRoutingConfiguration = {
  assignmentMode: SupportAssignmentMode;
  aiMaxRunsPerConversation: number;
  aiDailyTokenBudget: number;
  aiMaxOutputTokens: number;
};

const DEFAULT_CONFIGURATION: SupportRoutingConfiguration = {
  assignmentMode: "manual",
  aiMaxRunsPerConversation: 6,
  aiDailyTokenBudget: 100_000,
  aiMaxOutputTokens: 500,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(Math.max(Math.round(numberValue), minimum), maximum);
}

export async function getSupportRoutingConfiguration(): Promise<SupportRoutingConfiguration> {
  const db = getDatabase();
  const [row] = await db
    .select({ value: operationsSettings.value })
    .from(operationsSettings)
    .where(eq(operationsSettings.key, "support_routing"))
    .limit(1);
  const value = asRecord(row?.value);

  return {
    assignmentMode: value.assignmentMode === "round_robin" ? "round_robin" : "manual",
    aiMaxRunsPerConversation: boundedInteger(
      value.aiMaxRunsPerConversation,
      DEFAULT_CONFIGURATION.aiMaxRunsPerConversation,
      1,
      20,
    ),
    aiDailyTokenBudget: boundedInteger(
      value.aiDailyTokenBudget,
      DEFAULT_CONFIGURATION.aiDailyTokenBudget,
      5_000,
      5_000_000,
    ),
    aiMaxOutputTokens: boundedInteger(
      value.aiMaxOutputTokens,
      DEFAULT_CONFIGURATION.aiMaxOutputTokens,
      200,
      700,
    ),
  };
}

async function listEligibleResponders(permissionCode: "chat.respond" | "tickets.reply") {
  const db = getDatabase();
  const userRows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.status, "active"))
    .orderBy(asc(users.name));

  const eligibility = await Promise.all(
    userRows.map(async (user) => ({
      user,
      permissions: await resolveUserPermissions(user.id),
    })),
  );

  return eligibility
    .filter((entry) => hasPermission(entry.permissions, permissionCode))
    .map((entry) => entry.user);
}

export async function listEligibleChatResponders() {
  return listEligibleResponders("chat.respond");
}

export async function listEligibleTicketResponders() {
  return listEligibleResponders("tickets.reply");
}

export async function listEligibleSupportResponders() {
  return listEligibleChatResponders();
}

export async function countAvailableSupportRespondersForQueue(
  queueId: string,
): Promise<number> {
  const configuration = await getSupportRoutingConfiguration();
  if (configuration.assignmentMode !== "round_robin") return 0;

  const responders = await listEligibleChatResponders();
  if (responders.length === 0) return 0;

  const db = getDatabase();
  const [queue] = await db
    .select({ teamId: supportQueues.teamId })
    .from(supportQueues)
    .where(and(eq(supportQueues.id, queueId), eq(supportQueues.active, true)))
    .limit(1);
  if (!queue) return 0;

  let eligibleResponderIds = responders.map((user) => user.id);
  if (queue.teamId) {
    const membershipRows = await db
      .select({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, queue.teamId));
    const teamUserIds = new Set(membershipRows.map((row) => row.userId));
    eligibleResponderIds = eligibleResponderIds.filter((userId) => teamUserIds.has(userId));
  }
  if (eligibleResponderIds.length === 0) return 0;

  const now = new Date();
  const activeAfter = new Date(now.getTime() - SUPPORT_AWAY_AFTER_MS);
  const rows = await db
    .select({ userId: supportChatRoutingMembers.userId })
    .from(supportChatRoutingMembers)
    .innerJoin(users, eq(users.id, supportChatRoutingMembers.userId))
    .innerJoin(
      supportAgentPresence,
      eq(supportAgentPresence.userId, supportChatRoutingMembers.userId),
    )
    .where(
      and(
        eq(supportChatRoutingMembers.enabled, true),
        inArray(supportChatRoutingMembers.userId, eligibleResponderIds),
        eq(users.status, "active"),
        eq(supportAgentPresence.manualStatus, "online"),
        gt(supportAgentPresence.lastActivityAt, activeAfter),
      ),
    );

  return rows.length;
}

export async function getSupportRoutingSettings() {
  const [configuration, chatUsers, ticketUsers] = await Promise.all([
    getSupportRoutingConfiguration(),
    listEligibleChatResponders(),
    listEligibleTicketResponders(),
  ]);
  const db = getDatabase();
  const [chatMemberRows, ticketMemberRows] = await Promise.all([
    db
      .select({
        userId: supportChatRoutingMembers.userId,
        enabled: supportChatRoutingMembers.enabled,
        lastAssignedAt: supportChatRoutingMembers.lastAssignedAt,
      })
      .from(supportChatRoutingMembers),
    db
      .select({
        userId: supportTicketRoutingMembers.userId,
        enabled: supportTicketRoutingMembers.enabled,
        lastAssignedAt: supportTicketRoutingMembers.lastAssignedAt,
      })
      .from(supportTicketRoutingMembers),
  ]);
  const chatMemberByUser = new Map(chatMemberRows.map((row) => [row.userId, row]));
  const ticketMemberByUser = new Map(ticketMemberRows.map((row) => [row.userId, row]));
  const allUserIds = Array.from(new Set([
    ...chatUsers.map((user) => user.id),
    ...ticketUsers.map((user) => user.id),
  ]));
  const presence = await listSupportAgentPresence(allUserIds);

  return {
    configuration,
    chatUsers: chatUsers.map((user) => ({
      ...user,
      included: chatMemberByUser.get(user.id)?.enabled === true,
      lastAssignedAt: chatMemberByUser.get(user.id)?.lastAssignedAt ?? null,
      presence: presence.get(user.id) ?? {
        manualStatus: "offline" as const,
        effectiveStatus: "offline" as const,
        lastActivityAt: null,
      },
    })),
    ticketUsers: ticketUsers.map((user) => ({
      ...user,
      included: ticketMemberByUser.get(user.id)?.enabled === true,
      lastAssignedAt: ticketMemberByUser.get(user.id)?.lastAssignedAt ?? null,
      presence: presence.get(user.id) ?? {
        manualStatus: "offline" as const,
        effectiveStatus: "offline" as const,
        lastActivityAt: null,
      },
    })),
  };
}

export async function updateSupportRoutingSettings(
  actorUserId: string,
  configuration: SupportRoutingConfiguration,
  requestedChatUserIds: string[],
  requestedTicketUserIds: string[],
): Promise<void> {
  const [eligibleChatUsers, eligibleTicketUsers] = await Promise.all([
    listEligibleChatResponders(),
    listEligibleTicketResponders(),
  ]);
  const eligibleChatIds = new Set(eligibleChatUsers.map((user) => user.id));
  const eligibleTicketIds = new Set(eligibleTicketUsers.map((user) => user.id));
  const chatUserIds = Array.from(new Set(requestedChatUserIds)).filter((id) => eligibleChatIds.has(id));
  const ticketUserIds = Array.from(new Set(requestedTicketUserIds)).filter((id) => eligibleTicketIds.has(id));
  const normalized: SupportRoutingConfiguration = {
    assignmentMode: configuration.assignmentMode === "round_robin" ? "round_robin" : "manual",
    aiMaxRunsPerConversation: boundedInteger(configuration.aiMaxRunsPerConversation, 6, 1, 20),
    aiDailyTokenBudget: boundedInteger(configuration.aiDailyTokenBudget, 100_000, 5_000, 5_000_000),
    aiMaxOutputTokens: boundedInteger(configuration.aiMaxOutputTokens, 500, 200, 700),
  };
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .insert(operationsSettings)
      .values({
        key: "support_routing",
        value: normalized,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: operationsSettings.key,
        set: { value: normalized, updatedBy: actorUserId, updatedAt: now },
      });

    if (chatUserIds.length === 0) {
      await tx.delete(supportChatRoutingMembers);
    } else {
      await tx
        .delete(supportChatRoutingMembers)
        .where(notInArray(supportChatRoutingMembers.userId, chatUserIds));
      for (const userId of chatUserIds) {
        await tx
          .insert(supportChatRoutingMembers)
          .values({ userId, enabled: true, addedBy: actorUserId, updatedAt: now })
          .onConflictDoUpdate({
            target: supportChatRoutingMembers.userId,
            set: { enabled: true, addedBy: actorUserId, updatedAt: now },
          });
      }
    }

    if (ticketUserIds.length === 0) {
      await tx.delete(supportTicketRoutingMembers);
    } else {
      await tx
        .delete(supportTicketRoutingMembers)
        .where(notInArray(supportTicketRoutingMembers.userId, ticketUserIds));
      for (const userId of ticketUserIds) {
        await tx
          .insert(supportTicketRoutingMembers)
          .values({ userId, enabled: true, addedBy: actorUserId, updatedAt: now })
          .onConflictDoUpdate({
            target: supportTicketRoutingMembers.userId,
            set: { enabled: true, addedBy: actorUserId, updatedAt: now },
          });
      }
    }
  });

  await recordAuditEvent({
    actorUserId,
    action: "operations.support_routing.updated",
    entityType: "operations_settings",
    entityId: "support_routing",
    metadata: {
      assignmentMode: normalized.assignmentMode,
      chatMemberCount: chatUserIds.length,
      ticketMemberCount: ticketUserIds.length,
      aiMaxRunsPerConversation: normalized.aiMaxRunsPerConversation,
      aiDailyTokenBudget: normalized.aiDailyTokenBudget,
      aiMaxOutputTokens: normalized.aiMaxOutputTokens,
    },
  });
}

export async function setSupportRoutingMembership(
  actorUserId: string,
  userId: string,
  included: boolean,
): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  if (!included) {
    await db.delete(supportChatRoutingMembers).where(eq(supportChatRoutingMembers.userId, userId));
    return;
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("SUPPORT_ROUTING_USER_NOT_FOUND");

  await db
    .insert(supportChatRoutingMembers)
    .values({ userId, enabled: true, addedBy: actorUserId, updatedAt: now })
    .onConflictDoUpdate({
      target: supportChatRoutingMembers.userId,
      set: { enabled: true, addedBy: actorUserId, updatedAt: now },
    });
}

export async function setSupportTicketRoutingMembership(
  actorUserId: string,
  userId: string,
  included: boolean,
): Promise<void> {
  const db = getDatabase();
  const now = new Date();
  if (!included) {
    await db.delete(supportTicketRoutingMembers).where(eq(supportTicketRoutingMembers.userId, userId));
    return;
  }

  const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("SUPPORT_ROUTING_USER_NOT_FOUND");

  await db
    .insert(supportTicketRoutingMembers)
    .values({ userId, enabled: true, addedBy: actorUserId, updatedAt: now })
    .onConflictDoUpdate({
      target: supportTicketRoutingMembers.userId,
      set: { enabled: true, addedBy: actorUserId, updatedAt: now },
    });
}

export async function autoAssignTicketIfConfigured(
  ticketId: string,
): Promise<string | null> {
  const configuration = await getSupportRoutingConfiguration();
  if (configuration.assignmentMode !== "round_robin") return null;

  const db = getDatabase();
  const [chatSession] = await db
    .select({ id: webChatSessions.id })
    .from(webChatSessions)
    .where(eq(webChatSessions.ticketId, ticketId))
    .limit(1);
  const isChat = Boolean(chatSession?.id);
  const responders = isChat
    ? await listEligibleChatResponders()
    : await listEligibleTicketResponders();
  const responderIds = responders.map((user) => user.id);
  if (responderIds.length === 0) return null;

  const now = new Date();
  const activeAfter = new Date(now.getTime() - SUPPORT_AWAY_AFTER_MS);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('f10-support-ticket-routing'))`);

    const [ticket] = await tx
      .select({
        assignedUserId: tickets.assignedUserId,
        ticketNumber: tickets.ticketNumber,
        queueTeamId: supportQueues.teamId,
        areaTeamId: ticketAreas.teamId,
      })
      .from(tickets)
      .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
      .leftJoin(ticketWorkflowStates, eq(ticketWorkflowStates.ticketId, tickets.id))
      .leftJoin(ticketAreas, eq(ticketAreas.id, ticketWorkflowStates.areaId))
      .where(eq(tickets.id, ticketId))
      .limit(1);
    if (!ticket || ticket.assignedUserId) return ticket?.assignedUserId ?? null;

    const effectiveTeamId = !isChat && ticket.areaTeamId
      ? ticket.areaTeamId
      : ticket.queueTeamId;
    let eligibleResponderIds = responderIds;
    if (effectiveTeamId) {
      const membershipRows = await tx
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, effectiveTeamId));
      const teamUserIds = new Set(membershipRows.map((row) => row.userId));
      eligibleResponderIds = responderIds.filter((userId) => teamUserIds.has(userId));
      if (eligibleResponderIds.length === 0) return null;
    }

    let candidate: { userId: string } | undefined;
    if (isChat) {
      [candidate] = await tx
        .select({ userId: supportChatRoutingMembers.userId })
        .from(supportChatRoutingMembers)
        .innerJoin(users, eq(users.id, supportChatRoutingMembers.userId))
        .innerJoin(
          supportAgentPresence,
          eq(supportAgentPresence.userId, supportChatRoutingMembers.userId),
        )
        .where(
          and(
            eq(supportChatRoutingMembers.enabled, true),
            inArray(supportChatRoutingMembers.userId, eligibleResponderIds),
            eq(users.status, "active"),
            eq(supportAgentPresence.manualStatus, "online"),
            gt(supportAgentPresence.lastActivityAt, activeAfter),
          ),
        )
        .orderBy(
          sql`${supportChatRoutingMembers.lastAssignedAt} asc nulls first`,
          asc(supportChatRoutingMembers.createdAt),
        )
        .limit(1);
    } else {
      [candidate] = await tx
        .select({ userId: supportTicketRoutingMembers.userId })
        .from(supportTicketRoutingMembers)
        .innerJoin(users, eq(users.id, supportTicketRoutingMembers.userId))
        .innerJoin(
          supportAgentPresence,
          eq(supportAgentPresence.userId, supportTicketRoutingMembers.userId),
        )
        .where(
          and(
            eq(supportTicketRoutingMembers.enabled, true),
            inArray(supportTicketRoutingMembers.userId, eligibleResponderIds),
            eq(users.status, "active"),
            eq(supportAgentPresence.manualStatus, "online"),
            gt(supportAgentPresence.lastActivityAt, activeAfter),
          ),
        )
        .orderBy(
          sql`${supportTicketRoutingMembers.lastAssignedAt} asc nulls first`,
          asc(supportTicketRoutingMembers.createdAt),
        )
        .limit(1);
    }

    if (!candidate) return null;

    const [assigned] = await tx
      .update(tickets)
      .set({ assignedUserId: candidate.userId, updatedAt: now })
      .where(and(eq(tickets.id, ticketId), isNull(tickets.assignedUserId)))
      .returning({ id: tickets.id });
    if (!assigned) return null;

    if (isChat) {
      await tx
        .update(supportChatRoutingMembers)
        .set({ lastAssignedAt: now, updatedAt: now })
        .where(eq(supportChatRoutingMembers.userId, candidate.userId));
    } else {
      await tx
        .update(supportTicketRoutingMembers)
        .set({ lastAssignedAt: now, updatedAt: now })
        .where(eq(supportTicketRoutingMembers.userId, candidate.userId));
    }

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId: null,
      eventType: isChat ? "chat.auto_assigned" : "ticket.auto_assigned",
      metadata: {
        assignedUserId: candidate.userId,
        strategy: "round_robin",
        teamId: effectiveTeamId,
      },
    });

    await tx.insert(internalNotifications).values({
      userId: candidate.userId,
      kind: isChat ? "chat.assigned" : "ticket.assigned",
      title: isChat
        ? `Novo atendimento atribuído${ticket.ticketNumber ? ` · #${ticket.ticketNumber}` : ""}`
        : `Ticket #${ticket.ticketNumber} atribuído automaticamente`,
      body: isChat
        ? "Um atendimento do chat foi atribuído automaticamente a você."
        : "Um novo ticket foi atribuído automaticamente a você.",
      href: isChat && chatSession?.id
        ? `/app/chat/${chatSession.id}`
        : `/app/tickets/${ticketId}`,
      entityType: "ticket",
      entityId: ticketId,
    });

    return candidate.userId;
  });
}
