import { and, asc, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { teams } from "$lib/server/db/schema";
import { supportQueues } from "$lib/server/db/supportSchema";

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

  const [queue] = await db
    .update(supportQueues)
    .set({ teamId: team.id, updatedAt: new Date() })
    .where(eq(supportQueues.code, "support"))
    .returning({ id: supportQueues.id });
  if (!queue) throw new Error("SUPPORT_QUEUE_NOT_FOUND");

  await recordAuditEvent({
    actorUserId,
    action: "operations.support_queue.team.updated",
    entityType: "support_queue",
    entityId: queue.id,
    metadata: { teamId: team.id },
  });
}
