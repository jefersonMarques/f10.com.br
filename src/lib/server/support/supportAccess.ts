import { and, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import type { PermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import {
  rolePermissions,
  roles,
  teamMembers,
  userRoles,
} from "$lib/server/db/schema";
import {
  roleTicketAreas,
  ticketAreas,
  ticketWorkflowStates,
} from "$lib/server/db/ticketWorkflowSchema";
import {
  supportQueues,
  ticketFollowers,
  tickets,
} from "$lib/server/db/supportSchema";

export type SupportPermissionMap = Map<string, PermissionScope>;

export async function getUserSupportTeamIds(userId: string): Promise<string[]> {
  const memberships = await getDatabase()
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  return memberships.map((membership) => membership.teamId);
}

export async function getUserSupportQueueIds(userId: string): Promise<string[]> {
  const teamIds = await getUserSupportTeamIds(userId);
  if (teamIds.length === 0) return [];

  const queues = await getDatabase()
    .select({ id: supportQueues.id })
    .from(supportQueues)
    .where(inArray(supportQueues.teamId, teamIds));

  return queues.map((queue) => queue.id);
}

export async function getUserTicketAreaRestriction(
  userId: string,
): Promise<string[] | null> {
  const db = getDatabase();
  const grantingRoles = await db
    .select({
      roleId: roles.id,
      code: roles.code,
      restrictTicketAreas: roles.restrictTicketAreas,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(
      rolePermissions,
      and(
        eq(rolePermissions.roleId, roles.id),
        eq(rolePermissions.permissionCode, "tickets.view"),
      ),
    )
    .where(eq(userRoles.userId, userId));

  if (grantingRoles.length === 0) return null;
  if (
    grantingRoles.some(
      (role) => role.code === "SUPER_ADMIN" || !role.restrictTicketAreas,
    )
  ) {
    return null;
  }

  const roleIds = grantingRoles.map((role) => role.roleId);
  const rows = await db
    .select({ areaId: roleTicketAreas.areaId })
    .from(roleTicketAreas)
    .where(inArray(roleTicketAreas.roleId, roleIds));

  return Array.from(new Set(rows.map((row) => row.areaId)));
}

export async function isTicketFollower(
  userId: string,
  ticketId: string,
): Promise<boolean> {
  const [row] = await getDatabase()
    .select({ userId: ticketFollowers.userId })
    .from(ticketFollowers)
    .where(
      and(
        eq(ticketFollowers.ticketId, ticketId),
        eq(ticketFollowers.userId, userId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function buildTicketAccessCondition(
  userId: string,
  scope: PermissionScope,
): Promise<SQL> {
  const db = getDatabase();
  const [areaRestriction, teamIds] = await Promise.all([
    getUserTicketAreaRestriction(userId),
    scope === "team" ? getUserSupportTeamIds(userId) : Promise.resolve([]),
  ]);

  const followerCondition = sql`exists (
    select 1
    from ${ticketFollowers}
    where ${ticketFollowers.ticketId} = ${tickets.id}
      and ${ticketFollowers.userId} = ${userId}
  )`;

  const ownCondition = or(
    eq(tickets.assignedUserId, userId),
    eq(tickets.createdByUserId, userId),
  );

  let scopeCondition: SQL = sql`true`;
  if (scope === "own") {
    scopeCondition = ownCondition ?? sql`false`;
  } else if (scope === "team") {
    const conditions: SQL[] = ownCondition ? [ownCondition] : [];

    if (teamIds.length > 0) {
      const [queues, areas] = await Promise.all([
        db
          .select({ id: supportQueues.id })
          .from(supportQueues)
          .where(inArray(supportQueues.teamId, teamIds)),
        db
          .select({ id: ticketAreas.id })
          .from(ticketAreas)
          .where(inArray(ticketAreas.teamId, teamIds)),
      ]);

      if (queues.length > 0) {
        conditions.push(inArray(tickets.queueId, queues.map((queue) => queue.id)));
      }
      if (areas.length > 0) {
        conditions.push(inArray(
          ticketWorkflowStates.areaId,
          areas.map((area) => area.id),
        ));
      }
    }

    scopeCondition = or(...conditions) ?? sql`false`;
  }

  const restrictedCondition = areaRestriction === null
    ? scopeCondition
    : and(
        scopeCondition,
        areaRestriction.length > 0
          ? inArray(ticketWorkflowStates.areaId, areaRestriction)
          : sql`false`,
      ) ?? sql`false`;

  return or(followerCondition, restrictedCondition) ?? sql`false`;
}

export async function canAccessTicket(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
): Promise<boolean> {
  const accessCondition = await buildTicketAccessCondition(userId, scope);
  const [ticket] = await getDatabase()
    .select({ id: tickets.id })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(
      ticketWorkflowStates,
      eq(ticketWorkflowStates.ticketId, tickets.id),
    )
    .where(and(eq(tickets.id, ticketId), accessCondition))
    .limit(1);

  return Boolean(ticket);
}

export async function diagnoseTicketAccessDenial(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
): Promise<string> {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      assignedUserId: tickets.assignedUserId,
      createdByUserId: tickets.createdByUserId,
      queueTeamId: supportQueues.teamId,
      areaId: ticketWorkflowStates.areaId,
      areaTeamId: ticketAreas.teamId,
    })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(ticketWorkflowStates, eq(ticketWorkflowStates.ticketId, tickets.id))
    .leftJoin(ticketAreas, eq(ticketAreas.id, ticketWorkflowStates.areaId))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) return "ticket_not_found";

  const [allowedAreas, teamIds, isFollower] = await Promise.all([
    getUserTicketAreaRestriction(userId),
    scope === "team" ? getUserSupportTeamIds(userId) : Promise.resolve([]),
    isTicketFollower(userId, ticketId),
  ]);

  if (isFollower) return "follower_access_mismatch";
  if (allowedAreas !== null && (!ticket.areaId || !allowedAreas.includes(ticket.areaId))) {
    return "process_not_permitted";
  }
  if (scope === "all") return "global_access_mismatch";
  if (ticket.assignedUserId === userId || ticket.createdByUserId === userId) {
    return "own_ticket_access_mismatch";
  }
  if (scope === "own") return "ticket_not_owned";
  if (teamIds.length === 0) return "no_team_membership";
  if (!ticket.queueTeamId && !ticket.areaTeamId) return "ticket_without_team";
  return "ticket_outside_assigned_teams";
}

export async function requireTicketAccess(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
): Promise<void> {
  if (!(await canAccessTicket(userId, scope, ticketId))) {
    throw new Error("TICKET_NOT_ACCESSIBLE");
  }
}
