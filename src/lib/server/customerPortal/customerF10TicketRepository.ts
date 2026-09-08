import {
  and,
  desc,
  eq,
  gte,
  ilike,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";
import { ticketMessages, tickets } from "$lib/server/db/supportSchema";
import {
  getCustomerPortalTicket,
  replyCustomerPortalTicket,
} from "$lib/server/customerPortal/customerPortalRepository";
import {
  isAuthorizedF10Context,
  listAuthorizedF10Contexts,
  type CustomerF10AuthorizedContext,
  type CustomerF10PortalSession,
} from "$lib/server/customerPortal/customerF10AuthRepository";

export const CUSTOMER_TICKET_STATUSES = [
  "new",
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
] as const;

export const CUSTOMER_TICKET_PRIORITIES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const;

export const CUSTOMER_TICKET_PERIODS = ["all", "7d", "30d", "90d"] as const;

export type CustomerTicketStatus = (typeof CUSTOMER_TICKET_STATUSES)[number];
export type CustomerTicketPriority = (typeof CUSTOMER_TICKET_PRIORITIES)[number];
export type CustomerTicketPeriod = (typeof CUSTOMER_TICKET_PERIODS)[number];

export type CustomerTicketListFilters = {
  groupId: number | null;
  unitId: number | null;
  status: CustomerTicketStatus | null;
  priority: CustomerTicketPriority | null;
  period: CustomerTicketPeriod;
  search: string;
  page: number;
  pageSize: number;
};

function hasSelectedUnitContext(session: CustomerF10PortalSession): boolean {
  return session.selectedGroupId !== null &&
    session.selectedUnitId !== null &&
    Boolean(session.selectedGroupName) &&
    Boolean(session.selectedUnitName) &&
    Boolean(session.selectedUnitSchema);
}

function filterAuthorizedContexts(
  contexts: CustomerF10AuthorizedContext[],
  filters: Pick<CustomerTicketListFilters, "groupId" | "unitId">,
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
  if (contexts.length === 0) return null;
  const condition = or(
    ...contexts.map((context) =>
      and(
        eq(ticketCustomerContexts.legacyUserId, session.legacyUserId),
        eq(ticketCustomerContexts.groupId, context.groupId),
        eq(ticketCustomerContexts.unitId, context.unitId),
      ),
    ),
  );
  return condition ?? null;
}

function ticketContextFromRow(
  row: {
    contextTicketId: string | null;
    groupId: number | null;
    groupName: string | null;
    unitId: number | null;
    unitName: string | null;
    unitSchema: string | null;
  },
  fallback: CustomerF10AuthorizedContext | null,
): CustomerF10AuthorizedContext | null {
  if (
    row.contextTicketId &&
    row.groupId !== null &&
    row.groupName &&
    row.unitId !== null &&
    row.unitName &&
    row.unitSchema
  ) {
    return {
      groupId: row.groupId,
      groupName: row.groupName,
      unitId: row.unitId,
      unitName: row.unitName,
      unitSchema: row.unitSchema,
    };
  }
  return fallback;
}

export async function listCustomerF10Tickets(
  session: CustomerF10PortalSession,
  filters: CustomerTicketListFilters,
) {
  const authorizedContexts = listAuthorizedF10Contexts(session);
  const scopedContexts = filterAuthorizedContexts(authorizedContexts, filters);
  const contextCondition = contextAuthorizationCondition(session, scopedContexts);
  if (!contextCondition) {
    return { tickets: [], total: 0, page: 1, pageSize: filters.pageSize, totalPages: 0 };
  }

  const conditions: SQL[] = [eq(tickets.customerContactId, session.contactId)];
  const allowLegacyWithoutContext = authorizedContexts.length === 1 && scopedContexts.length === 1;
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

  const where = and(...conditions);
  const db = getDatabase();
  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(tickets)
    .leftJoin(ticketCustomerContexts, eq(ticketCustomerContexts.ticketId, tickets.id))
    .where(where);

  const total = countRow?.total ?? 0;
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  const page = totalPages === 0 ? 1 : Math.min(filters.page, totalPages);

  const rows = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      channel: tickets.channel,
      firstResponseDueAt: tickets.firstResponseDueAt,
      resolutionDueAt: tickets.resolutionDueAt,
      firstResponseAt: tickets.firstResponseAt,
      resolvedAt: tickets.resolvedAt,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      contextTicketId: ticketCustomerContexts.ticketId,
      groupId: ticketCustomerContexts.groupId,
      groupName: ticketCustomerContexts.groupName,
      unitId: ticketCustomerContexts.unitId,
      unitName: ticketCustomerContexts.unitName,
      unitSchema: ticketCustomerContexts.unitSchema,
    })
    .from(tickets)
    .leftJoin(ticketCustomerContexts, eq(ticketCustomerContexts.ticketId, tickets.id))
    .where(where)
    .orderBy(desc(tickets.updatedAt), desc(tickets.ticketNumber))
    .limit(filters.pageSize)
    .offset((page - 1) * filters.pageSize);

  const fallbackContext = authorizedContexts.length === 1 ? authorizedContexts[0] ?? null : null;
  return {
    tickets: rows.map((row) => ({
      id: row.id,
      ticketNumber: row.ticketNumber,
      subject: row.subject,
      status: row.status,
      priority: row.priority,
      channel: row.channel,
      firstResponseDueAt: row.firstResponseDueAt,
      resolutionDueAt: row.resolutionDueAt,
      firstResponseAt: row.firstResponseAt,
      resolvedAt: row.resolvedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      context: ticketContextFromRow(row, fallbackContext),
    })),
    total,
    page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

export async function getCustomerF10Ticket(
  session: CustomerF10PortalSession,
  ticketId: string,
) {
  const details = await getCustomerPortalTicket(session.contactId, ticketId);
  if (!details) return null;

  const authorizedContexts = listAuthorizedF10Contexts(session);
  if (authorizedContexts.length === 0) return null;

  const db = getDatabase();
  const [context] = await db
    .select({
      legacyUserId: ticketCustomerContexts.legacyUserId,
      groupId: ticketCustomerContexts.groupId,
      groupName: ticketCustomerContexts.groupName,
      unitId: ticketCustomerContexts.unitId,
      unitName: ticketCustomerContexts.unitName,
      unitSchema: ticketCustomerContexts.unitSchema,
    })
    .from(ticketCustomerContexts)
    .where(eq(ticketCustomerContexts.ticketId, ticketId))
    .limit(1);

  if (!context) {
    if (authorizedContexts.length !== 1) return null;
    return { ...details, context: authorizedContexts[0] };
  }

  if (
    context.legacyUserId !== session.legacyUserId ||
    !isAuthorizedF10Context(session, context.groupId, context.unitId)
  ) {
    return null;
  }

  return {
    ...details,
    context: {
      groupId: context.groupId,
      groupName: context.groupName,
      unitId: context.unitId,
      unitName: context.unitName,
      unitSchema: context.unitSchema,
    },
  };
}

export async function replyCustomerF10Ticket(
  session: CustomerF10PortalSession,
  ticketId: string,
  body: string,
): Promise<void> {
  const ticket = await getCustomerF10Ticket(session, ticketId);
  if (!ticket) throw new Error("CUSTOMER_TICKET_NOT_FOUND");
  await replyCustomerPortalTicket(session.contactId, ticketId, body);
}

export async function bindTicketF10Context(
  ticketId: string,
  session: CustomerF10PortalSession,
): Promise<void> {
  if (!hasSelectedUnitContext(session)) throw new Error("F10_CUSTOMER_UNIT_REQUIRED");
  if (!isAuthorizedF10Context(session, session.selectedGroupId as number, session.selectedUnitId as number)) {
    throw new Error("F10_CUSTOMER_UNIT_NOT_AUTHORIZED");
  }

  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({
        customerContactId: session.contactId,
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId));

    await tx
      .update(ticketMessages)
      .set({ customerContactId: session.contactId })
      .where(
        and(
          eq(ticketMessages.ticketId, ticketId),
          eq(ticketMessages.authorType, "customer"),
        ),
      );

    await tx
      .insert(ticketCustomerContexts)
      .values({
        ticketId,
        customerContactId: session.contactId,
        legacyUserId: session.legacyUserId,
        groupId: session.selectedGroupId as number,
        groupName: session.selectedGroupName ?? "",
        unitId: session.selectedUnitId as number,
        unitName: session.selectedUnitName ?? "",
        unitSchema: session.selectedUnitSchema ?? "",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: ticketCustomerContexts.ticketId,
        set: {
          customerContactId: session.contactId,
          legacyUserId: session.legacyUserId,
          groupId: session.selectedGroupId as number,
          groupName: session.selectedGroupName ?? "",
          unitId: session.selectedUnitId as number,
          unitName: session.selectedUnitName ?? "",
          unitSchema: session.selectedUnitSchema ?? "",
          updatedAt: now,
        },
      });
  });
}
