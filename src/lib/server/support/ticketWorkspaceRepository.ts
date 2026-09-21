import {
  and,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import {
  customerContacts,
  customerOrganizations,
  supportQueues,
  ticketFollowers,
  ticketTags,
  tickets,
} from "$lib/server/db/supportSchema";
import {
  ticketAreas,
  ticketWorkflowStates,
} from "$lib/server/db/ticketWorkflowSchema";
import {
  getUserSupportQueueIds,
  getUserSupportTeamIds,
  getUserTicketAreaRestriction,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";
import type {
  TicketPriority,
  TicketStatus,
} from "$lib/server/support/supportRepository";

export type TicketWorkspaceScope = "mine" | "unassigned" | "all";
export type TicketWorkspaceSlaFilter = "overdue" | "risk" | "first_response" | null;
export type TicketWorkspaceChannel = "manual" | "web_chat" | "portal" | "email" | "whatsapp";

export type TicketWorkspaceFilters = {
  scope: TicketWorkspaceScope;
  search: string;
  status: TicketStatus | null;
  priority: TicketPriority | null;
  queueId: string | null;
  assigneeId: string | null;
  areaId: string | null;
  stageId: string | null;
  channel: TicketWorkspaceChannel | null;
  sla: TicketWorkspaceSlaFilter;
  tagId: string | null;
  page: number;
  pageSize: number;
};

function combine(conditions: Array<SQL | undefined>): SQL | undefined {
  const values = conditions.filter((value): value is SQL => Boolean(value));
  if (values.length === 0) return undefined;
  if (values.length === 1) return values[0];
  return and(...values);
}

function activeTicketCondition(): SQL {
  return notInArray(tickets.status, ["resolved", "closed"]);
}

function slaCondition(
  filter: TicketWorkspaceSlaFilter,
  now: Date,
): SQL | undefined {
  if (!filter) return undefined;

  if (filter === "first_response") {
    return and(
      activeTicketCondition(),
      isNull(tickets.firstResponseAt),
      isNotNull(tickets.firstResponseDueAt),
    );
  }

  const firstResponseDue = and(
    isNull(tickets.firstResponseAt),
    isNotNull(tickets.firstResponseDueAt),
    filter === "overdue"
      ? lte(tickets.firstResponseDueAt, now)
      : and(
          gte(tickets.firstResponseDueAt, now),
          lte(tickets.firstResponseDueAt, new Date(now.getTime() + 60 * 60_000)),
        ),
  );
  const nextResponseDue = and(
    isNotNull(tickets.firstResponseAt),
    isNotNull(tickets.nextResponseDueAt),
    filter === "overdue"
      ? lte(tickets.nextResponseDueAt, now)
      : and(
          gte(tickets.nextResponseDueAt, now),
          lte(tickets.nextResponseDueAt, new Date(now.getTime() + 60 * 60_000)),
        ),
  );
  const resolutionDue = and(
    isNotNull(tickets.resolutionDueAt),
    filter === "overdue"
      ? lte(tickets.resolutionDueAt, now)
      : and(
          gte(tickets.resolutionDueAt, now),
          lte(tickets.resolutionDueAt, new Date(now.getTime() + 60 * 60_000)),
        ),
  );

  return and(activeTicketCondition(), or(firstResponseDue, nextResponseDue, resolutionDue));
}

export async function listTicketWorkspaceTickets(
  actorUserId: string,
  permissions: SupportPermissionMap,
  filters: TicketWorkspaceFilters,
) {
  const viewScope = getPermissionScope(permissions, "tickets.view");
  if (!viewScope) throw new Error("SUPPORT_PERMISSION_NOT_ALLOWED");

  const db = getDatabase();
  const [teamIds, queueIds, areaRestriction, followerRows, tagRows] = await Promise.all([
    viewScope === "team" ? getUserSupportTeamIds(actorUserId) : Promise.resolve([]),
    viewScope === "team" ? getUserSupportQueueIds(actorUserId) : Promise.resolve([]),
    getUserTicketAreaRestriction(actorUserId),
    db
      .select({ ticketId: ticketFollowers.ticketId })
      .from(ticketFollowers)
      .where(eq(ticketFollowers.userId, actorUserId)),
    filters.tagId
      ? db
          .select({ ticketId: ticketTags.ticketId })
          .from(ticketTags)
          .where(eq(ticketTags.tagId, filters.tagId))
      : Promise.resolve([]),
  ]);

  const followerTicketIds = followerRows.map((row) => row.ticketId);
  const teamAreaRows =
    viewScope === "team" && teamIds.length > 0
      ? await db
          .select({ id: ticketAreas.id })
          .from(ticketAreas)
          .where(inArray(ticketAreas.teamId, teamIds))
      : [];
  const teamAreaIds = teamAreaRows.map((row) => row.id);

  const ownCondition = or(
    eq(tickets.assignedUserId, actorUserId),
    eq(tickets.createdByUserId, actorUserId),
  );

  let scopeCondition: SQL | undefined;
  if (viewScope === "own") {
    scopeCondition = ownCondition;
  } else if (viewScope === "team") {
    const teamConditions: SQL[] = [ownCondition];
    if (queueIds.length > 0) teamConditions.push(inArray(tickets.queueId, queueIds));
    if (teamAreaIds.length > 0) {
      teamConditions.push(inArray(ticketWorkflowStates.areaId, teamAreaIds));
    }
    scopeCondition = or(...teamConditions);
  }

  const processCondition =
    areaRestriction === null
      ? undefined
      : areaRestriction.length > 0
        ? inArray(ticketWorkflowStates.areaId, areaRestriction)
        : sql`false`;

  const scopedCondition =
    followerTicketIds.length > 0
      ? or(
          inArray(tickets.id, followerTicketIds),
          combine([scopeCondition, processCondition]) ?? sql`true`,
        )
      : combine([scopeCondition, processCondition]);

  const requestedScope =
    filters.scope === "mine"
      ? eq(tickets.assignedUserId, actorUserId)
      : filters.scope === "unassigned"
        ? isNull(tickets.assignedUserId)
        : undefined;

  const searchPattern = `%${filters.search.trim()}%`;
  const searchCondition = filters.search.trim()
    ? or(
        ilike(tickets.subject, searchPattern),
        ilike(customerContacts.name, searchPattern),
        ilike(customerOrganizations.name, searchPattern),
        ilike(supportQueues.name, searchPattern),
        sql`cast(${tickets.ticketNumber} as text) ilike ${searchPattern}`,
      )
    : undefined;

  const tagTicketIds = tagRows.map((row) => row.ticketId);
  const tagCondition = filters.tagId
    ? tagTicketIds.length > 0
      ? inArray(tickets.id, tagTicketIds)
      : sql`false`
    : undefined;

  const where = combine([
    scopedCondition,
    requestedScope,
    searchCondition,
    filters.status ? eq(tickets.status, filters.status) : undefined,
    filters.priority ? eq(tickets.priority, filters.priority) : undefined,
    filters.queueId ? eq(tickets.queueId, filters.queueId) : undefined,
    filters.assigneeId === "unassigned"
      ? isNull(tickets.assignedUserId)
      : filters.assigneeId
        ? eq(tickets.assignedUserId, filters.assigneeId)
        : undefined,
    filters.areaId ? eq(ticketWorkflowStates.areaId, filters.areaId) : undefined,
    filters.stageId
      ? or(
          eq(ticketWorkflowStates.globalStageId, filters.stageId),
          eq(ticketWorkflowStates.areaStageId, filters.stageId),
        )
      : undefined,
    filters.channel ? eq(tickets.channel, filters.channel) : undefined,
    slaCondition(filters.sla, new Date()),
    tagCondition,
  ]);

  const baseSelect = db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      channel: tickets.channel,
      dueOn: tickets.dueOn,
      firstResponseDueAt: tickets.firstResponseDueAt,
      nextResponseDueAt: tickets.nextResponseDueAt,
      resolutionDueAt: tickets.resolutionDueAt,
      firstResponseAt: tickets.firstResponseAt,
      resolvedAt: tickets.resolvedAt,
      updatedAt: tickets.updatedAt,
      assignedUserId: tickets.assignedUserId,
      assignedUserName: users.name,
      queueId: tickets.queueId,
      queueName: supportQueues.name,
      customerContactId: tickets.customerContactId,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      organizationName: customerOrganizations.name,
      globalWorkflowId: ticketWorkflowStates.globalWorkflowId,
      globalStageId: ticketWorkflowStates.globalStageId,
      areaId: ticketWorkflowStates.areaId,
      areaWorkflowId: ticketWorkflowStates.areaWorkflowId,
      areaStageId: ticketWorkflowStates.areaStageId,
    })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(users, eq(tickets.assignedUserId, users.id))
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    )
    .leftJoin(ticketWorkflowStates, eq(ticketWorkflowStates.ticketId, tickets.id));

  const countQuery = db
    .select({ value: count() })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    )
    .leftJoin(ticketWorkflowStates, eq(ticketWorkflowStates.ticketId, tickets.id));

  const [rows, countRows] = await Promise.all([
    (where ? baseSelect.where(where) : baseSelect)
      .orderBy(desc(tickets.updatedAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    where ? countQuery.where(where) : countQuery,
  ]);

  const total = Number(countRows[0]?.value ?? 0);
  return {
    tickets: rows.map((ticket) => ({
      ...ticket,
      workflowState: ticket.globalWorkflowId
        ? {
            globalStageId: ticket.globalStageId,
            areaWorkflowId: ticket.areaWorkflowId,
            areaStageId: ticket.areaStageId,
          }
        : null,
    })),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / filters.pageSize),
  };
}
