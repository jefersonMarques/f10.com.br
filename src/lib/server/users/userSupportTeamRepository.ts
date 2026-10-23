import { and, asc, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { teamMembers, teams } from "$lib/server/db/schema";
import { ticketAreas } from "$lib/server/db/ticketWorkflowSchema";
import { supportQueues } from "$lib/server/db/supportSchema";
import { getManagedUserDetails } from "$lib/server/users/userManagementRepository";

export type ManagedUserSupportTeam = {
  teamId: string;
  teamName: string;
  active: boolean;
  areas: string[];
  queues: string[];
  included: boolean;
};

export async function listUserSupportTeams(
  userId: string,
): Promise<ManagedUserSupportTeam[]> {
  const db = getDatabase();
  const [teamRows, areaRows, queueRows, membershipRows] = await Promise.all([
    db
      .select({ id: teams.id, name: teams.name, active: teams.active })
      .from(teams)
      .orderBy(asc(teams.name)),
    db
      .select({ teamId: ticketAreas.teamId, areaName: ticketAreas.name })
      .from(ticketAreas)
      .where(eq(ticketAreas.active, true)),
    db
      .select({ teamId: supportQueues.teamId, queueName: supportQueues.name })
      .from(supportQueues)
      .where(eq(supportQueues.active, true)),
    db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId)),
  ]);

  const includedTeamIds = new Set(membershipRows.map((row) => row.teamId));
  const areasByTeam = new Map<string, string[]>();
  const queuesByTeam = new Map<string, string[]>();

  for (const area of areaRows) {
    if (!area.teamId) continue;
    const names = areasByTeam.get(area.teamId) ?? [];
    names.push(area.areaName);
    areasByTeam.set(area.teamId, names);
  }

  for (const queue of queueRows) {
    if (!queue.teamId) continue;
    const names = queuesByTeam.get(queue.teamId) ?? [];
    names.push(queue.queueName);
    queuesByTeam.set(queue.teamId, names);
  }

  return teamRows
    .filter((team) => team.active || includedTeamIds.has(team.id))
    .map((team) => ({
      teamId: team.id,
      teamName: team.name,
      active: team.active,
      areas: areasByTeam.get(team.id) ?? [],
      queues: queuesByTeam.get(team.id) ?? [],
      included: includedTeamIds.has(team.id),
    }));
}

export async function setManagedUserSupportTeamMembership(
  actorUserId: string,
  actorRoles: string[],
  targetUserId: string,
  teamId: string,
  included: boolean,
): Promise<void> {
  await getManagedUserDetails(actorUserId, actorRoles, targetUserId);
  if (actorUserId === targetUserId) {
    throw new Error("SELF_SUPPORT_TEAM_CHANGE_NOT_ALLOWED");
  }

  const db = getDatabase();
  const [supportTeam] = await db
    .select({ id: teams.id, active: teams.active })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!supportTeam || (included && !supportTeam.active)) {
    throw new Error("SUPPORT_TEAM_NOT_FOUND");
  }

  if (included) {
    await db
      .insert(teamMembers)
      .values({ teamId, userId: targetUserId, isManager: false })
      .onConflictDoNothing();
  } else {
    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, targetUserId),
        ),
      );
  }

  await recordAuditEvent({
    actorUserId,
    action: "user.support_team.changed",
    entityType: "user",
    entityId: targetUserId,
    metadata: { teamId, included },
  });
}
