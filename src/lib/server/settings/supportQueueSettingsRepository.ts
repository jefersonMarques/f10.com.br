import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { teams } from "$lib/server/db/schema";
import { supportQueues } from "$lib/server/db/supportSchema";
import { ticketAreas } from "$lib/server/db/ticketWorkflowSchema";

export async function getSupportQueueTeamSettings() {
  const db = getDatabase();
  const [[queue], availableTeams] = await Promise.all([
    db
      .select({ id: supportQueues.id, teamId: supportQueues.teamId })
      .from(supportQueues)
      .where(eq(supportQueues.code, "support"))
      .limit(1),
    db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.active, true))
      .orderBy(asc(teams.name)),
  ]);

  return {
    queueId: queue?.id ?? null,
    teamId: queue?.teamId ?? null,
    teams: availableTeams,
  };
}

export async function updateSupportQueueTeam(
  actorUserId: string,
  teamId: string,
): Promise<void> {
  const db = getDatabase();
  const [team] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.active, true)))
    .limit(1);
  if (!team) throw new Error("SUPPORT_TEAM_NOT_FOUND");

  const result = await db.transaction(async (tx) => {
    const [queue] = await tx
      .update(supportQueues)
      .set({ teamId: team.id, updatedAt: new Date() })
      .where(eq(supportQueues.code, "support"))
      .returning({ id: supportQueues.id });
    if (!queue) throw new Error("SUPPORT_QUEUE_NOT_FOUND");

    const inheritedQueues = await tx
      .update(supportQueues)
      .set({ teamId: team.id, updatedAt: new Date() })
      .where(
        and(
          inArray(supportQueues.code, ["sucesso", "service_nfse", "service_cell_coin"]),
          eq(supportQueues.active, true),
          isNull(supportQueues.teamId),
        ),
      )
      .returning({ id: supportQueues.id });

    const inheritedAreas = await tx
      .update(ticketAreas)
      .set({ teamId: team.id, updatedAt: new Date() })
      .where(
        and(
          eq(ticketAreas.active, true),
          isNull(ticketAreas.teamId),
          sql`lower(btrim(${ticketAreas.name})) in ('nota fiscal', 'cell coin')`,
        ),
      )
      .returning({ id: ticketAreas.id });

    return {
      queueId: queue.id,
      inheritedQueueCount: inheritedQueues.length,
      inheritedAreaCount: inheritedAreas.length,
    };
  });

  await recordAuditEvent({
    actorUserId,
    action: "operations.support_queue.team.updated",
    entityType: "support_queue",
    entityId: result.queueId,
    metadata: {
      teamId: team.id,
      inheritedServiceQueueCount: result.inheritedQueueCount,
      inheritedServiceAreaCount: result.inheritedAreaCount,
    },
  });
}

const EMAIL_INBOX_QUEUE_CODES = ["support", "sucesso", "financeiro"] as const;

export async function getSupportEmailInboxTeamSettings() {
  const db = getDatabase();
  const [queueRows, availableTeams] = await Promise.all([
    db
      .select({
        id: supportQueues.id,
        code: supportQueues.code,
        name: supportQueues.name,
        teamId: supportQueues.teamId,
        active: supportQueues.active,
      })
      .from(supportQueues)
      .where(inArray(supportQueues.code, [...EMAIL_INBOX_QUEUE_CODES])),
    db
      .select({ id: teams.id, name: teams.name })
      .from(teams)
      .where(eq(teams.active, true))
      .orderBy(asc(teams.name)),
  ]);

  const queuesByCode = new Map(queueRows.map((queue) => [queue.code, queue]));
  const inboxes = EMAIL_INBOX_QUEUE_CODES.flatMap((code) => {
    const queue = queuesByCode.get(code);
    if (!queue) return [];
    return [{
      ...queue,
      addressLabel: code === "support" ? "suporte@" : code === "sucesso" ? "sucesso@" : "financeiro@",
    }];
  });

  return { inboxes, teams: availableTeams };
}

export async function updateSupportEmailInboxTeam(
  actorUserId: string,
  queueId: string,
  teamId: string,
): Promise<void> {
  const db = getDatabase();
  const [[queue], [team]] = await Promise.all([
    db
      .select({ id: supportQueues.id, code: supportQueues.code })
      .from(supportQueues)
      .where(and(
        eq(supportQueues.id, queueId),
        eq(supportQueues.active, true),
        inArray(supportQueues.code, [...EMAIL_INBOX_QUEUE_CODES]),
      ))
      .limit(1),
    db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.active, true)))
      .limit(1),
  ]);
  if (!queue || !team) throw new Error("SUPPORT_EMAIL_INBOX_TEAM_INVALID");

  if (queue.code === "support") {
    await updateSupportQueueTeam(actorUserId, teamId);
    return;
  }

  await db
    .update(supportQueues)
    .set({ teamId, updatedAt: new Date() })
    .where(eq(supportQueues.id, queueId));

  await recordAuditEvent({
    actorUserId,
    action: "operations.support_email_inbox.team.updated",
    entityType: "support_queue",
    entityId: queueId,
    metadata: { inboxCode: queue.code, teamId },
  });
}
