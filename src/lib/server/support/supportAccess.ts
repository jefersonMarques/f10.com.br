import { and, eq, inArray } from "drizzle-orm";
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

export async function canAccessTicket(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
): Promise<boolean> {
  const db = getDatabase();
  const [[ticket], [state], follower, areaRestriction] = await Promise.all([
    db
      .select({
        assignedUserId: tickets.assignedUserId,
        createdByUserId: tickets.createdByUserId,
        queueId: tickets.queueId,
      })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1),
    db
      .select({ areaId: ticketWorkflowStates.areaId })
      .from(ticketWorkflowStates)
      .where(eq(ticketWorkflowStates.ticketId, ticketId))
      .limit(1),
    isTicketFollower(userId, ticketId),
    getUserTicketAreaRestriction(userId),
  ]);

  if (!ticket) return false;
  if (follower) return true;

  if (
    areaRestriction !== null &&
    (!state?.areaId || !areaRestriction.includes(state.areaId))
  ) {
    return false;
  }

  if (scope === "all") return true;
  if (ticket.assignedUserId === userId || ticket.createdByUserId === userId) {
    return true;
  }
  if (scope === "own") return false;

  const teamIds = await getUserSupportTeamIds(userId);
  if (teamIds.length === 0) return false;

  const [queue] = await db
    .select({ teamId: supportQueues.teamId })
    .from(supportQueues)
    .where(eq(supportQueues.id, ticket.queueId))
    .limit(1);
  if (queue?.teamId && teamIds.includes(queue.teamId)) return true;

  if (!state?.areaId) return false;
  const [area] = await db
    .select({ teamId: ticketAreas.teamId })
    .from(ticketAreas)
    .where(eq(ticketAreas.id, state.areaId))
    .limit(1);

  return Boolean(area?.teamId && teamIds.includes(area.teamId));
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
