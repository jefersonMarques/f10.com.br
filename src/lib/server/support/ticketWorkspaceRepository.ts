import {
  and,
  asc,
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
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import {
  customerContacts,
  customerOrganizations,
  supportQueues,
  ticketTags,
  tickets,
} from "$lib/server/db/supportSchema";
import {
  ticketWorkflowStates,
} from "$lib/server/db/ticketWorkflowSchema";
import {
  buildTicketAccessCondition,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";
import type {
  TicketPriority,
  TicketStatus,
} from "$lib/server/support/supportRepository";

export type TicketWorkspaceScope = "mine" | "unassigned" | "all";
export type TicketWorkspaceSlaFilter = "overdue" | "risk" | "first_response" | null;
export type TicketWorkspaceChannel = "manual" | "web_chat" | "portal" | "email" | "whatsapp";
export type TicketWorkspaceSort =
  | "updated_desc"
  | "updated_asc"
  | "number_desc"
  | "number_asc"
  | "priority_desc"
  | "priority_asc"
  | "subject_asc"
  | "subject_desc"
  | "customer_asc"
  | "customer_desc"
  | "assignee_asc"
  | "assignee_desc"
  | "sla_asc"
  | "sla_desc";

export type TicketWorkspaceFilters = {
  scope: TicketWorkspaceScope;
  search: string;
  status: TicketStatus | null;
  includeFinished: boolean;
  sort: TicketWorkspaceSort;
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

function ticketSortOrder(sort: TicketWorkspaceSort): SQL[] {
  const priorityRank = sql`case ${tickets.priority}
    when 'urgent' then 4 when 'high' then 3
    when 'normal' then 2 else 1 end`;
  const slaDue = sql`coalesce(
    case when ${tickets.firstResponseAt} is null then ${tickets.firstResponseDueAt}
         else coalesce(${tickets.nextResponseDueAt}, ${tickets.resolutionDueAt}) end,
    ${tickets.resolutionDueAt}
  )`;
  switch (sort) {
    case "updated_asc":
      return [asc(tickets.updatedAt), asc(tickets.ticketNumber)];
    case "number_desc":
      return [desc(tickets.ticketNumber)];
    case "number_asc":
      return [asc(tickets.ticketNumber)];
    case "priority_desc":
      return [sql`${priorityRank} DESC`, desc(tickets.updatedAt)];
    case "priority_asc":
      return [sql`${priorityRank} ASC`, desc(tickets.updatedAt)];
    case "subject_asc":
      return [asc(tickets.subject), desc(tickets.updatedAt)];
    case "subject_desc":
      return [desc(tickets.subject), desc(tickets.updatedAt)];
    case "customer_asc":
      return [asc(customerContacts.name), desc(tickets.updatedAt)];
    case "customer_desc":
      return [desc(customerContacts.name), desc(tickets.updatedAt)];
    case "assignee_asc":
      return [asc(users.name), desc(tickets.updatedAt)];
    case "assignee_desc":
      return [desc(users.name), desc(tickets.updatedAt)];
    case "sla_asc":
      return [sql`${slaDue} ASC NULLS LAST`, desc(tickets.updatedAt)];
    case "sla_desc":
      return [sql`${slaDue} DESC NULLS LAST`, desc(tickets.updatedAt)];
    default:
      return [desc(tickets.updatedAt), desc(tickets.ticketNumber)];
  }
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
  const canViewCommercialCustomer = hasPermission(permissions, "customers.view");
  const [scopedCondition, tagRows] = await Promise.all([
    buildTicketAccessCondition(actorUserId, viewScope),
    filters.tagId
      ? db
          .select({ ticketId: ticketTags.ticketId })
          .from(ticketTags)
          .where(eq(ticketTags.tagId, filters.tagId))
      : Promise.resolve([]),
  ]);

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
        ...(canViewCommercialCustomer ? [sql`EXISTS (
          SELECT 1 FROM ticket_commercial_unit_links link
          JOIN customer_units unit ON unit.id = link.customer_unit_id
          JOIN customer_groups grp ON grp.id = unit.group_id
          WHERE link.ticket_id = ${tickets.id}
            AND (
              unit.source_id ILIKE ${searchPattern}
              OR coalesce(nullif(unit.apelido, ''), unit.name) ILIKE ${searchPattern}
              OR grp.name ILIKE ${searchPattern}
            )
        )`,] : []),
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
    filters.status
      ? eq(tickets.status, filters.status)
      : filters.includeFinished
        ? undefined
        : activeTicketCondition(),
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
      descriptionPreview: sql<string | null>`(
        SELECT left(m.body, 600)
        FROM ticket_messages m
        WHERE m.ticket_id = ${tickets.id}
          AND m.visibility = 'public'
          AND m.author_type = 'customer'
          AND length(btrim(m.body)) > 0
        ORDER BY m.created_at ASC
        LIMIT 1
      )`,
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
      customerName: canViewCommercialCustomer ? sql<string | null>`coalesce(${customerContacts.name},
        (SELECT coalesce(nullif(unit.apelido, ''), unit.name)
         FROM ticket_commercial_unit_links link
         JOIN customer_units unit ON unit.id = link.customer_unit_id
         WHERE link.ticket_id = ${tickets.id} LIMIT 1))` : customerContacts.name,
      customerEmail: customerContacts.email,
      organizationName: canViewCommercialCustomer ? sql<string | null>`coalesce(${customerOrganizations.name},
        (SELECT org.name FROM ticket_commercial_unit_links link
         JOIN customer_units unit ON unit.id = link.customer_unit_id
         JOIN customer_organizations org ON org.id = unit.organization_id
         WHERE link.ticket_id = ${tickets.id} LIMIT 1))` : customerOrganizations.name,
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
      .orderBy(...ticketSortOrder(filters.sort))
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
