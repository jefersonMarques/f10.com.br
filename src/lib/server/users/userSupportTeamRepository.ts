import { and, asc, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { teamMembers, teams } from "$lib/server/db/schema";
import { ticketAreas } from "$lib/server/db/ticketWorkflowSchema";
import { getManagedUserDetails } from "$lib/server/users/userManagementRepository";

export type ManagedUserSupportTeam = {
  teamId: string;
  teamName: string;
  areas: string[];
  included: boolean;
};

export async function listUserSupportTeams(
  userId: string,
): Promise<ManagedUserSupportTeam[]> {
  const db = getDatabase();
  const [areaRows, membershipRows] = await Promise.all([
    db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        areaName: ticketAreas.name,
      })
      .from(ticketAreas)
      .innerJoin(teams, eq(teams.id, ticketAreas.teamId))
      .where(and(eq(ticketAreas.active, true), eq(teams.active, true)))
      .orderBy(asc(teams.name), asc(ticketAreas.name)),
    db
      .select({ teamId: teamMembers.teamId })
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId)),
  ]);

  const includedTeamIds = new Set(membershipRows.map((row) => row.teamId));
  const supportTeams = new Map<string, ManagedUserSupportTeam>();

  for (const row of areaRows) {
    const current = supportTeams.get(row.teamId);
    if (current) {
      if (!current.areas.includes(row.areaName)) current.areas.push(row.areaName);
      continue;
    }
    supportTeams.set(row.teamId, {
      teamId: row.teamId,
      teamName: row.teamName,
      areas: [row.areaName],
      included: includedTeamIds.has(row.teamId),
    });
  }

  return Array.from(supportTeams.values());
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
    .select({ id: teams.id })
    .from(ticketAreas)
    .innerJoin(teams, eq(teams.id, ticketAreas.teamId))
    .where(
      and(
        eq(teams.id, teamId),
        eq(teams.active, true),
        eq(ticketAreas.active, true),
      ),
    )
    .limit(1);
  if (!supportTeam) throw new Error("SUPPORT_TEAM_NOT_FOUND");

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
