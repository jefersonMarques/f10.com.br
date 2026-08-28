import {
  and,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  customerActivityEvents,
  ticketCustomerContexts,
} from "$lib/server/db/customerPortalSchema";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";
import {
  listAuthorizedF10Contexts,
  type CustomerF10AuthorizedContext,
  type CustomerF10PortalSession,
} from "$lib/server/customerPortal/customerF10AuthRepository";
import type {
  CustomerTicketListFilters,
  CustomerTicketPeriod,
} from "$lib/server/customerPortal/customerF10TicketRepository";
import { CUSTOMER_TEAM_ACTIVITY_EVENT_TYPES } from "$lib/server/support/ticketCustomerProgressRepository";

export type CustomerF10TicketSummary = {
  total: number;
  awaiting: number;
  inProgress: number;
  resolved: number;
  unread: number;
};

type CustomerF10TicketSummaryFilters = Omit<CustomerTicketListFilters, "page" | "pageSize">;

const EMPTY_SUMMARY: CustomerF10TicketSummary = {
  total: 0,
  awaiting: 0,
  inProgress: 0,
  resolved: 0,
  unread: 0,
};

function filterAuthorizedContexts(
  contexts: CustomerF10AuthorizedContext[],
  filters: Pick<CustomerF10TicketSummaryFilters, "groupId" | "unitId">,
): CustomerF10AuthorizedContext[] {
  return contexts.filter((context) => {
    if (filters.groupId !== null && context.groupId !== filters.groupId) return false;
    if (filters.unitId !== null && context.unitId !== filters.unitId) return false;
    return true;
  });
}

function periodStart(period: CustomerTicketPeriod): Date | null {
  const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : null;
  if (days === null) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function contextAuthorizationCondition(
  session: CustomerF10PortalSession,
  contexts: CustomerF10AuthorizedContext[],
): SQL | null {
  const conditions: SQL[] = [];
  const globalCondition = and(
    eq(ticketCustomerContexts.legacyUserId, session.legacyUserId),
    eq(ticketCustomerContexts.contextScope, "global"),
  );
  if (globalCondition) conditions.push(globalCondition);

  for (const context of contexts) {
    const unitCondition = and(
      eq(ticketCustomerContexts.legacyUserId, session.legacyUserId),
      eq(ticketCustomerContexts.contextScope, "unit"),
      eq(ticketCustomerContexts.groupId, context.groupId),
      eq(ticketCustomerContexts.unitId, context.unitId),
    );
    if (unitCondition) conditions.push(unitCondition);
  }

  return conditions.length > 0 ? or(...conditions) ?? null : null;
}

function buildWhere(
  session: CustomerF10PortalSession,
  filters: CustomerF10TicketSummaryFilters,
): SQL | null {
  const authorizedContexts = listAuthorizedF10Contexts(session);
  if (authorizedContexts.length === 0) return null;

  const scopedContexts = filterAuthorizedContexts(authorizedContexts, filters);
  const hasContextFilter = filters.groupId !== null || filters.unitId !== null;
  if (hasContextFilter && scopedContexts.length === 0) return null;

  const contextsForAuthorization = hasContextFilter ? scopedContexts : authorizedContexts;
  const contextCondition = contextAuthorizationCondition(session, contextsForAuthorization);
  if (!contextCondition) return null;

  const conditions: SQL[] = [eq(tickets.customerContactId, session.contactId)];
  const allowLegacyWithoutContext = authorizedContexts.length === 1 && contextsForAuthorization.length === 1;
  const authorizedTicketCondition = allowLegacyWithoutContext
    ? or(contextCondition, isNull(ticketCustomerContexts.ticketId))
    : contextCondition;
  if (authorizedTicketCondition) conditions.push(authorizedTicketCondition);

  if (filters.status !== null) conditions.push(eq(tickets.status, filters.status));
  if (filters.priority !== null) conditions.push(eq(tickets.priority, filters.priority));

  const start = periodStart(filters.period);
  if (start) conditions.push(gte(tickets.createdAt, start));

  const search = filters.search.trim();
  if (search) {
    const ticketNumber = /^\d+$/.test(search) ? Number(search) : null;
    const searchCondition = Number.isSafeInteger(ticketNumber)
      ? or(ilike(tickets.subject, `%${search}%`), eq(tickets.ticketNumber, ticketNumber as number))
      : ilike(tickets.subject, `%${search}%`);
    if (searchCondition) conditions.push(searchCondition);
  }

  return and(...conditions) ?? null;
}

export async function getCustomerF10TicketSummary(
  session: CustomerF10PortalSession,
  filters: CustomerF10TicketSummaryFilters,
): Promise<CustomerF10TicketSummary> {
  const where = buildWhere(session, filters);
  if (!where) return EMPTY_SUMMARY;

  const db = getDatabase();
  const [summaryRow, matchingRows] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        awaiting: sql<number>`count(*) filter (where ${tickets.status} = 'new')::int`,
        inProgress: sql<number>`count(*) filter (where ${tickets.status} in ('open', 'in_progress'))::int`,
        resolved: sql<number>`count(*) filter (where ${tickets.status} in ('resolved', 'closed'))::int`,
      })
      .from(tickets)
      .leftJoin(ticketCustomerContexts, eq(ticketCustomerContexts.ticketId, tickets.id))
      .where(where),
    db
      .select({ id: tickets.id })
      .from(tickets)
      .leftJoin(ticketCustomerContexts, eq(ticketCustomerContexts.ticketId, tickets.id))
      .where(where),
  ]);

  const ticketIds = matchingRows.map((row) => row.id);
  if (ticketIds.length === 0) {
    return {
      total: summaryRow?.total ?? 0,
      awaiting: summaryRow?.awaiting ?? 0,
      inProgress: summaryRow?.inProgress ?? 0,
      resolved: summaryRow?.resolved ?? 0,
      unread: 0,
    };
  }

  const detailPaths = ticketIds.map((ticketId) => `/cliente/chamados/${ticketId}`);
  const [teamActivityRows, viewedRows] = await Promise.all([
    db
      .select({
        ticketId: ticketEvents.ticketId,
        lastTeamActivityAt: sql<Date | null>`max(${ticketEvents.createdAt})`,
      })
      .from(ticketEvents)
      .where(
        and(
          inArray(ticketEvents.ticketId, ticketIds),
          inArray(ticketEvents.eventType, [...CUSTOMER_TEAM_ACTIVITY_EVENT_TYPES]),
        ),
      )
      .groupBy(ticketEvents.ticketId),
    db
      .select({
        path: customerActivityEvents.path,
        lastViewedAt: sql<Date | null>`max(${customerActivityEvents.createdAt})`,
      })
      .from(customerActivityEvents)
      .where(
        and(
          eq(customerActivityEvents.customerContactId, session.contactId),
          eq(customerActivityEvents.eventType, "ticket.detail.view"),
          inArray(customerActivityEvents.path, detailPaths),
        ),
      )
      .groupBy(customerActivityEvents.path),
  ]);

  const lastViewedByPath = new Map(viewedRows.map((row) => [row.path, row.lastViewedAt]));
  const unread = teamActivityRows.reduce((count, row) => {
    if (!row.lastTeamActivityAt) return count;
    const lastViewedAt = lastViewedByPath.get(`/cliente/chamados/${row.ticketId}`) ?? null;
    return !lastViewedAt || new Date(row.lastTeamActivityAt).getTime() > new Date(lastViewedAt).getTime()
      ? count + 1
      : count;
  }, 0);

  return {
    total: summaryRow?.total ?? 0,
    awaiting: summaryRow?.awaiting ?? 0,
    inProgress: summaryRow?.inProgress ?? 0,
    resolved: summaryRow?.resolved ?? 0,
    unread,
  };
}
