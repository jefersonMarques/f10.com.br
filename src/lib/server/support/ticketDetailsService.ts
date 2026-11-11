import {
  getPermissionScope,
  hasPermission,
  resolveUserPermissions,
} from "$lib/server/auth/permissions";
import { getSupportServiceRequestForTicket } from "$lib/server/serviceRequests/serviceRequestOperations";
import { requireTicketAccess, type SupportPermissionMap } from "$lib/server/support/supportAccess";
import { getTicketCard } from "$lib/server/support/ticketCardRepository";
import { getTicketCustomerContext } from "$lib/server/support/ticketCustomerContextRepository";
import { getTicketCommercialUnit } from "$lib/server/support/ticketCommercialUnitRepository";
import { getTicketMergeContext } from "$lib/server/support/ticketMergeRepository";
import { getTicketCustomerOverview } from "$lib/server/support/ticketCustomerOverviewService";
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
    linkedTasks: allTasks,
    taskProjects,
    serviceRequest,
    followers,
    followerCandidates,
    customerContext,
    satisfaction,
    workflowBoard,
    commercialUnit,
    mergeContext,
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
    hasPermission(permissions, "customers.view")
      ? getTicketCommercialUnit(ticketId)
      : Promise.resolve(null),
    getTicketMergeContext(actorUserId, permissions, ticketId),
  ]);

  const customerOverview = await getTicketCustomerOverview(
    card.details.ticket, commercialUnit, customerContext,
    hasPermission(permissions, "customers.view"),
  );

  const otherMemberIds = mergeContext.rootId === ticketId
    ? mergeContext.members
      .filter((member) => member.id !== ticketId)
      .map((member) => member.id)
    : [];
  const relatedCards = await Promise.all(otherMemberIds.map(async (memberId) =>
    getTicketCard(actorUserId, permissions, memberId)
  ));
  const allCards = [card, ...relatedCards];
  const mergedAttachments = allCards.flatMap((entry) => entry.attachments);
  const allMessages = allCards.flatMap((entry) => entry.details.messages.map((message) => ({
    ...message,
    sourceTicketId: entry.details.ticket.id,
    sourceTicketNumber: entry.details.ticket.ticketNumber,
    attachments: entry.attachments.filter((attachment) => attachment.messageId === message.id),
  }))).sort((left, right) =>
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
    || left.id.localeCompare(right.id)
  );
  const allEvents = allCards.flatMap((entry) => entry.details.events.map((event) => ({
    ...event,
    sourceTicketId: entry.details.ticket.id,
    sourceTicketNumber: entry.details.ticket.ticketNumber,
  }))).sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  const relatedTaskCollections = canViewTasks
    ? await Promise.all(otherMemberIds.map((memberId) =>
      listTicketTasks(actorUserId, permissions, memberId)
    ))
    : [];
  const allTasks = Array.from(new Map(
    [linkedTasks, ...relatedTaskCollections]
      .flat().map((task) => [task.id, task] as const),
  ).values());

  const mentionUsers = canCommentInternal
    ? await filterMentionUsersForTicket(users, ticketId)
    : [];

  return {
    ...card,
    details: {
      ...card.details,
      ticket: {
        ...card.details.ticket,
        customerName: card.details.ticket.customerName,
        organizationName: card.details.ticket.organizationName,
      },
      messages: allMessages,
      events: allEvents,
    },
    workflowBoard: {
      globalWorkflow: workflowBoard.globalWorkflow,
      areaWorkflows: workflowBoard.areaWorkflows,
    },
    customerContext,
    commercialUnit,
    customerOverview,
    mergeContext,
    attachments: mergedAttachments,
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
    canViewCustomerProfiles: hasPermission(permissions, "customers.view"),
    canViewCommercialProfiles: hasPermission(permissions, "customers.view", "all"),
    canViewTasks,
    canCreateTask,
    canRequestRemote: hasPermission(permissions, "remote.request"),
    canUseRemote: hasPermission(permissions, "remote.use"),
  };
}
