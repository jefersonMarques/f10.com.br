import { and, eq, inArray } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { teamMembers, teams } from "$lib/server/db/schema";
import { listProjectMembers } from "$lib/server/tasks/taskProjectRepository";
import type { TaskPermissionMap } from "$lib/server/tasks/taskAccess";
import { canAssignTaskUser } from "$lib/tasks/taskAssignmentPolicy";

export async function listAssignableTaskMembers(
  actorUserId: string,
  permissions: TaskPermissionMap,
  projectId: string,
) {
  const members = (await listProjectMembers(projectId))
    .filter((member) => member.status === "active");
  const scope = getPermissionScope(permissions, "tasks.assign");

  if (scope === "all") return members;
  if (scope !== "team") {
    return members.filter((member) => canAssignTaskUser(scope, actorUserId, member.id, new Set()));
  }

  const db = getDatabase();
  const actorTeams = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .innerJoin(teams, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teamMembers.userId, actorUserId),
      eq(teams.active, true),
    ));

  const teamIds = actorTeams.map((team) => team.teamId);
  if (teamIds.length === 0) {
    return members.filter((member) => member.id === actorUserId);
  }

  const colleagues = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(inArray(teamMembers.teamId, teamIds));

  const colleagueIds = new Set(colleagues.map((colleague) => colleague.userId));
  return members.filter((member) => canAssignTaskUser(scope, actorUserId, member.id, colleagueIds));
}
