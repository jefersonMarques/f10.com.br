import { and, asc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { teamMembers, users } from "$lib/server/db/schema";
import {
  supportAgentPresence,
  supportChatRoutingMembers,
} from "$lib/server/db/supportRoutingSchema";
import { supportQueues } from "$lib/server/db/supportSchema";
import { SUPPORT_AWAY_AFTER_MS } from "$lib/server/support/supportAgentPresence";
import {
  getSupportRoutingConfiguration,
  listEligibleSupportResponders,
} from "$lib/server/support/supportRoutingRepository";

export async function autoAssignChatIfConfigured(
  sessionId: string,
): Promise<string | null> {
  const configuration = await getSupportRoutingConfiguration();
  if (configuration.assignmentMode !== "round_robin") return null;

  const responders = await listEligibleSupportResponders();
  if (responders.length === 0) return null;

  const db = getDatabase();
  const now = new Date();
  const activeAfter = new Date(now.getTime() - SUPPORT_AWAY_AFTER_MS);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('f10-support-chat-routing'))`);

    const [chat] = await tx
      .select({
        assignedUserId: webChatSessions.assignedUserId,
        queueId: webChatSessions.queueId,
        queueTeamId: supportQueues.teamId,
      })
      .from(webChatSessions)
      .innerJoin(supportQueues, eq(webChatSessions.queueId, supportQueues.id))
      .where(and(eq(webChatSessions.id, sessionId), isNull(webChatSessions.closedAt)))
      .limit(1);
    if (!chat || chat.assignedUserId) return chat?.assignedUserId ?? null;

    let eligibleResponderIds = responders.map((user) => user.id);
    if (chat.queueTeamId) {
      const membershipRows = await tx
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(eq(teamMembers.teamId, chat.queueTeamId));
      const teamUserIds = new Set(membershipRows.map((row) => row.userId));
      eligibleResponderIds = eligibleResponderIds.filter((userId) => teamUserIds.has(userId));
    }
    if (eligibleResponderIds.length === 0) return null;

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
      .update(webChatSessions)
      .set({
        assignedUserId: candidate.userId,
        aiState: "human",
        aiHandoffReason: "Conversa atribuída automaticamente a um atendente humano.",
        aiHandoffAt: now,
        aiProcessingAt: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(webChatSessions.id, sessionId),
          isNull(webChatSessions.assignedUserId),
          isNull(webChatSessions.closedAt),
        ),
      )
      .returning({ id: webChatSessions.id });
    if (!assigned) return null;

    await tx
      .update(supportChatRoutingMembers)
      .set({ lastAssignedAt: now, updatedAt: now })
      .where(eq(supportChatRoutingMembers.userId, candidate.userId));

    await tx.insert(internalNotifications).values({
      userId: candidate.userId,
      kind: "chat.assigned",
      title: "Novo atendimento atribuído",
      body: "Um atendimento do chat foi atribuído automaticamente a você.",
      href: `/app/chat/${sessionId}`,
      entityType: "chat",
      entityId: sessionId,
    });

    return candidate.userId;
  });
}
