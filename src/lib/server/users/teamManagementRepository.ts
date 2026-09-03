import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { teamMembers, teams, users } from "$lib/server/db/schema";
import { supportQueues } from "$lib/server/db/supportSchema";
import { ticketAreas } from "$lib/server/db/ticketWorkflowSchema";

export type TeamManagementInput = {
  name: string;
  active: boolean;
  memberUserIds: string[];
};

function normalizeMemberUserIds(memberUserIds: string[]): string[] {
  return Array.from(new Set(memberUserIds));
}

async function assertEligibleMembers(memberUserIds: string[]): Promise<string[]> {
  const normalizedIds = normalizeMemberUserIds(memberUserIds);
  if (normalizedIds.length === 0) return normalizedIds;

  const db = getDatabase();
  const memberRows = await db
    .select({ id: users.id, status: users.status })
    .from(users)
    .where(inArray(users.id, normalizedIds));

  if (
    memberRows.length !== normalizedIds.length ||
    memberRows.some((member) => member.status === "inactive")
  ) {
    throw new Error("TEAM_MEMBER_NOT_ELIGIBLE");
  }

  return normalizedIds;
}

async function assertUniqueTeamName(name: string, excludeTeamId?: string): Promise<void> {
  const db = getDatabase();
  const normalizedName = name.trim().toLowerCase();
  const duplicateCondition = sql`lower(btrim(${teams.name})) = ${normalizedName}`;
  const [duplicate] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(excludeTeamId ? and(duplicateCondition, ne(teams.id, excludeTeamId)) : duplicateCondition)
    .limit(1);

  if (duplicate) throw new Error("TEAM_NAME_ALREADY_EXISTS");
}

export async function getTeamManagementSettings() {
  const db = getDatabase();
  const [teamRows, membershipRows, userRows, queueReferences, areaReferences] =
    await Promise.all([
      db
        .select({ id: teams.id, name: teams.name, active: teams.active })
        .from(teams)
        .orderBy(asc(teams.name)),
      db
        .select({
          teamId: teamMembers.teamId,
          userId: users.id,
          name: users.name,
          email: users.email,
          status: users.status,
        })
        .from(teamMembers)
        .innerJoin(users, eq(users.id, teamMembers.userId))
        .orderBy(asc(users.name)),
      db
        .select({ id: users.id, name: users.name, email: users.email, status: users.status })
        .from(users)
        .where(ne(users.status, "inactive"))
        .orderBy(asc(users.name)),
      db
        .select({ teamId: supportQueues.teamId })
        .from(supportQueues)
        .where(eq(supportQueues.active, true)),
      db
        .select({ teamId: ticketAreas.teamId })
        .from(ticketAreas)
        .where(eq(ticketAreas.active, true)),
    ]);

  const membersByTeam = new Map<string, typeof membershipRows>();
  for (const membership of membershipRows) {
    const current = membersByTeam.get(membership.teamId) ?? [];
    current.push(membership);
    membersByTeam.set(membership.teamId, current);
  }

  const usedTeamIds = new Set(
    [...queueReferences, ...areaReferences]
      .map((reference) => reference.teamId)
      .filter((teamId): teamId is string => Boolean(teamId)),
  );

  return {
    teams: teamRows.map((team) => ({
      ...team,
      inUse: usedTeamIds.has(team.id),
      members: membersByTeam.get(team.id) ?? [],
    })),
    users: userRows,
  };
}

export async function createTeam(
  actorUserId: string,
  input: Omit<TeamManagementInput, "active">,
): Promise<string> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) throw new Error("TEAM_NAME_INVALID");

  await assertUniqueTeamName(name);
  const memberUserIds = await assertEligibleMembers(input.memberUserIds);
  const db = getDatabase();

  const teamId = await db.transaction(async (tx) => {
    const [createdTeam] = await tx
      .insert(teams)
      .values({ name, active: true })
      .returning({ id: teams.id });
    if (!createdTeam) throw new Error("TEAM_CREATE_FAILED");

    if (memberUserIds.length > 0) {
      await tx.insert(teamMembers).values(
        memberUserIds.map((userId) => ({
          teamId: createdTeam.id,
          userId,
          isManager: false,
        })),
      );
    }

    return createdTeam.id;
  });

  await recordAuditEvent({
    actorUserId,
    action: "operations.team.created",
    entityType: "team",
    entityId: teamId,
    metadata: { name, memberCount: memberUserIds.length },
  });

  return teamId;
}

export async function updateTeam(
  actorUserId: string,
  teamId: string,
  input: TeamManagementInput,
): Promise<void> {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) throw new Error("TEAM_NAME_INVALID");

  const db = getDatabase();
  const [existingTeam] = await db
    .select({ id: teams.id, active: teams.active })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!existingTeam) throw new Error("TEAM_NOT_FOUND");

  if (!input.active && existingTeam.active) {
    const [[queueReference], [areaReference]] = await Promise.all([
      db
        .select({ id: supportQueues.id })
        .from(supportQueues)
        .where(
          and(
            eq(supportQueues.teamId, teamId),
            eq(supportQueues.active, true),
          ),
        )
        .limit(1),
      db
        .select({ id: ticketAreas.id })
        .from(ticketAreas)
        .where(and(eq(ticketAreas.teamId, teamId), eq(ticketAreas.active, true)))
        .limit(1),
    ]);
    if (queueReference || areaReference) throw new Error("TEAM_IN_USE");
  }

  await assertUniqueTeamName(name, teamId);
  const memberUserIds = await assertEligibleMembers(input.memberUserIds);

  await db.transaction(async (tx) => {
    await tx
      .update(teams)
      .set({ name, active: input.active, updatedAt: new Date() })
      .where(eq(teams.id, teamId));

    await tx.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    if (memberUserIds.length > 0) {
      await tx.insert(teamMembers).values(
        memberUserIds.map((userId) => ({
          teamId,
          userId,
          isManager: false,
        })),
      );
    }
  });

  await recordAuditEvent({
    actorUserId,
    action: "operations.team.updated",
    entityType: "team",
    entityId: teamId,
    metadata: { name, active: input.active, memberCount: memberUserIds.length },
  });
}
