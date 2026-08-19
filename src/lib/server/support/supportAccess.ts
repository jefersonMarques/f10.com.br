import { eq, inArray } from "drizzle-orm";
import type { PermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { teamMembers } from "$lib/server/db/schema";
import { ticketAreas, ticketWorkflowStates } from "$lib/server/db/ticketWorkflowSchema";
import { supportQueues, tickets } from "$lib/server/db/supportSchema";

export type SupportPermissionMap = Map<string, PermissionScope>;

export async function getUserSupportTeamIds(userId: string): Promise<string[]> {
  const db = getDatabase();
  const memberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  return memberships.map((membership) => membership.teamId);
}

export async function getUserSupportQueueIds(userId: string): Promise<string[]> {
  const teamIds = await getUserSupportTeamIds(userId);
  if (teamIds.length === 0) return [];

  const db = getDatabase();
  const queues = await db
    .select({ id: supportQueues.id })
    .from(supportQueues)
    .where(inArray(supportQueues.teamId, teamIds));

  return queues.map((queue) => queue.id);
}

export async function canAccessTicket(
  userId: string,
  scope: PermissionScope,
  ticketId: string,
): Promise<boolean> {
  if (scope === "all") return true;

  const db = getDatabase();
  const [ticket] = await db
    .select({
      assignedUserId: tickets.assignedUserId,
      createdByUserId: tickets.createdByUserId,
      queueId: tickets.queueId,
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) return false;
  if (ticket.assignedUserId === userId || ticket.createdByUserId === userId) return true;
  if (scope === "own") return false;

  const teamIds = await getUserSupportTeamIds(userId);
  if (teamIds.length === 0) return false;

  const queueRows = await db
    .select({ id: supportQueues.id })
    .from(supportQueues)
    .where(inArray(supportQueues.teamId, teamIds));
  if (queueRows.some((queue) => queue.id === ticket.queueId)) return true;

  const [state] = await db
    .select({ areaId: ticketWorkflowStates.areaId })
    .from(ticketWorkflowStates)
    .where(eq(ticketWorkflowStates.ticketId, ticketId))
    .limit(1);
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
