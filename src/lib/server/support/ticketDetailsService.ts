import {
  getPermissionScope,
  hasPermission,
  resolveUserPermissions,
} from "$lib/server/auth/permissions";
import { getSupportServiceRequestForTicket } from "$lib/server/serviceRequests/serviceRequestOperations";
import { requireTicketAccess, type SupportPermissionMap } from "$lib/server/support/supportAccess";
import { getTicketCard } from "$lib/server/support/ticketCardRepository";
import { getTicketCustomerContext } from "$lib/server/support/ticketCustomerContextRepository";
import {
  listTicketFollowerCandidates,
  listTicketFollowers,
} from "$lib/server/support/ticketFollowerRepository";
import { getTicketSatisfaction } from "$lib/server/support/ticketSatisfactionService";
import { listTicketTasks } from "$lib/server/support/ticketTaskBridge";
import { getTicketWorkflowBoardWithAppearance } from "$lib/server/support/ticketWorkflowService";
import { listSupportAgents } from "$lib/server/support/supportRepository";
import { listTaskProjects } from "$lib/server/tasks/taskRepository";
import type { TicketDetailsData } from "$lib/components/operations/tickets/types";

type MentionUser = { id: string; name: string; email: string };

async function filterMentionUsersForTicket(
  users: MentionUser[],
  ticketId: string,
): Promise<MentionUser[]> {
  const resolved = await Promise.all(
    users.map(async (user) => {
      const permissions = await resolveUserPermissions(user.id);
      const scope = getPermissionScope(permissions, "tickets.view");
      if (!scope) return null;

      try {
        await requireTicketAccess(user.id, scope, ticketId);
        return user;
      } catch {
        return null;
      }
    }),
  );

  return resolved.filter((user): user is MentionUser => Boolean(user));
}

export async function getTicketDetailsData(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
): Promise<TicketDetailsData> {
  const viewScope = getPermissionScope(permissions, "tickets.view");
  if (!viewScope) throw new Error("TICKET_PERMISSION_NOT_ALLOWED");

  const canReply = hasPermission(permissions, "tickets.reply");
  const canCommentInternal =
    canReply || hasPermission(permissions, "tickets.comment_internal");
  const canAssign = hasPermission(permissions, "tickets.assign");
  const canManageFollowers = canReply || canAssign;
  const canViewTasks = hasPermission(permissions, "tasks.view");
  const canCreateTask = canReply && hasPermission(permissions, "tasks.create");
  const canLinkCustomer = canReply && hasPermission(permissions, "customers.view");

  const [
    card,
    users,
    linkedTasks,
    taskProjects,
    serviceRequest,
    followers,
    followerCandidates,
    customerContext,
    satisfaction,
    workflowBoard,
  ] = await Promise.all([
    getTicketCard(actorUserId, permissions, ticketId),
    canReply || canCommentInternal || canAssign
      ? listSupportAgents()
      : Promise.resolve([]),
    canViewTasks
      ? listTicketTasks(actorUserId, permissions, ticketId)
      : Promise.resolve([]),
    canCreateTask
      ? listTaskProjects(actorUserId, permissions).catch(() => [])
      : Promise.resolve([]),
    getSupportServiceRequestForTicket(actorUserId, viewScope, ticketId),
    listTicketFollowers(ticketId),
    canManageFollowers
      ? listTicketFollowerCandidates()
      : Promise.resolve([]),
    getTicketCustomerContext(ticketId),
    getTicketSatisfaction(ticketId).catch(() => null),
    getTicketWorkflowBoardWithAppearance(actorUserId, permissions, [ticketId]),
  ]);

  const mentionUsers = canCommentInternal
    ? await filterMentionUsersForTicket(users, ticketId)
    : [];

  return {
    ...card,
    workflowBoard: {
      globalWorkflow: workflowBoard.globalWorkflow,
      areaWorkflows: workflowBoard.areaWorkflows,
    },
    customerContext,
    serviceRequest,
    satisfaction,
    linkedTasks,
    taskProjects,
    agents: canAssign ? users : [],
    mentionUsers,
    followers,
    followerCandidates,
    canReply,
    canCommentInternal,
    canManageFollowers,
    canAssign,
    canLinkCustomer,
    canViewTasks,
    canCreateTask,
  };
}
