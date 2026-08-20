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
} from "$lib/server/db/supportRoutingSchema";
import { supportQueues, ticketEvents, tickets } from "$lib/server/db/supportSchema";
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

export async function listEligibleSupportResponders() {
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
    .filter((entry) => hasPermission(entry.permissions, "chat.respond"))
    .map((entry) => entry.user);
}

export async function countAvailableSupportRespondersForQueue(
  queueId: string,
): Promise<number> {
  const configuration = await getSupportRoutingConfiguration();
  if (configuration.assignmentMode !== "round_robin") return 0;

  const responders = await listEligibleSupportResponders();
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
  const [configuration, eligibleUsers] = await Promise.all([
    getSupportRoutingConfiguration(),
    listEligibleSupportResponders(),
  ]);
  const db = getDatabase();
  const memberRows = await db
    .select({
      userId: supportChatRoutingMembers.userId,
      enabled: supportChatRoutingMembers.enabled,
      lastAssignedAt: supportChatRoutingMembers.lastAssignedAt,
    })
    .from(supportChatRoutingMembers);
  const memberByUser = new Map(memberRows.map((row) => [row.userId, row]));
  const presence = await listSupportAgentPresence(eligibleUsers.map((user) => user.id));

  return {
    configuration,
    users: eligibleUsers.map((user) => ({
      ...user,
      included: memberByUser.get(user.id)?.enabled === true,
      lastAssignedAt: memberByUser.get(user.id)?.lastAssignedAt ?? null,
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
  requestedUserIds: string[],
): Promise<void> {
  const eligible = await listEligibleSupportResponders();
  const eligibleIds = new Set(eligible.map((user) => user.id));
  const userIds = Array.from(new Set(requestedUserIds)).filter((id) => eligibleIds.has(id));
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

    if (userIds.length === 0) {
      await tx.delete(supportChatRoutingMembers);
    } else {
      await tx
        .delete(supportChatRoutingMembers)
        .where(notInArray(supportChatRoutingMembers.userId, userIds));

      for (const userId of userIds) {
        await tx
          .insert(supportChatRoutingMembers)
          .values({
            userId,
            enabled: true,
            addedBy: actorUserId,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: supportChatRoutingMembers.userId,
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
      memberCount: userIds.length,
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
    await db
      .delete(supportChatRoutingMembers)
      .where(eq(supportChatRoutingMembers.userId, userId));
    return;
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user) throw new Error("SUPPORT_ROUTING_USER_NOT_FOUND");

  await db
    .insert(supportChatRoutingMembers)
    .values({ userId, enabled: true, addedBy: actorUserId, updatedAt: now })
    .onConflictDoUpdate({
      target: supportChatRoutingMembers.userId,
      set: { enabled: true, addedBy: actorUserId, updatedAt: now },
    });
}

export async function autoAssignTicketIfConfigured(
  ticketId: string,
): Promise<string | null> {
  const configuration = await getSupportRoutingConfiguration();
  if (configuration.assignmentMode !== "round_robin") return null;

  const responders = await listEligibleSupportResponders();
  if (responders.length === 0) return null;
  const responderIds = responders.map((user) => user.id);
  const db = getDatabase();
  const now = new Date();
  const activeAfter = new Date(now.getTime() - SUPPORT_AWAY_AFTER_MS);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('f10-support-chat-routing'))`);

    const [ticket] = await tx
      .select({
        assignedUserId: tickets.assignedUserId,
        ticketNumber: tickets.ticketNumber,
        queueTeamId: supportQueues.teamId,
      })
      .from(tickets)
      .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
      .where(eq(tickets.id, ticketId))
      .limit(1);
    if (!ticket || ticket.assignedUserId) return ticket?.assignedUserId ?? null;

    let eligibleResponderIds = responderIds;
    if (ticket.queueTeamId) {
      const membershipRows = await tx
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, ticket.queueTeamId));
      const teamUserIds = new Set(membershipRows.map((row) => row.userId));
      eligibleResponderIds = responderIds.filter((userId) => teamUserIds.has(userId));
      if (eligibleResponderIds.length === 0) return null;
    }

    const [candidate] = await tx
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

    if (!candidate) return null;

    const [assigned] = await tx
      .update(tickets)
      .set({ assignedUserId: candidate.userId, updatedAt: now })
      .where(and(eq(tickets.id, ticketId), isNull(tickets.assignedUserId)))
      .returning({ id: tickets.id });
    if (!assigned) return null;

    await tx
      .update(supportChatRoutingMembers)
      .set({ lastAssignedAt: now, updatedAt: now })
      .where(eq(supportChatRoutingMembers.userId, candidate.userId));

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId: null,
      eventType: "chat.auto_assigned",
      metadata: {
        assignedUserId: candidate.userId,
        strategy: "round_robin",
        queueTeamId: ticket.queueTeamId,
      },
    });

    const [chatSession] = await tx
      .select({ id: webChatSessions.id })
      .from(webChatSessions)
      .where(eq(webChatSessions.ticketId, ticketId))
      .limit(1);

    await tx.insert(internalNotifications).values({
      userId: candidate.userId,
      kind: "chat.assigned",
      title: `Novo atendimento atribuído${ticket.ticketNumber ? ` · #${ticket.ticketNumber}` : ""}`,
      body: "Um atendimento do chat foi atribuído automaticamente a você.",
      href: chatSession?.id ? `/app/chat/${chatSession.id}` : `/app/tickets/${ticketId}`,
      entityType: "ticket",
      entityId: ticketId,
    });

    return candidate.userId;
  });
}
