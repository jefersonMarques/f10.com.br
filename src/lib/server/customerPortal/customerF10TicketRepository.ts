import { randomUUID } from "node:crypto";
import {
  and,
  desc,
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
import { ticketWorkflowStates } from "$lib/server/db/ticketWorkflowSchema";
import { ticketMessageAttachments } from "$lib/server/db/supportChatEntrySchema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
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
import { resolveCustomerPortalTicketIntake } from "$lib/server/customerPortal/customerPortalTicketIntake";
import {
  CUSTOMER_TEAM_ACTIVITY_EVENT_TYPES,
} from "$lib/server/support/ticketCustomerProgressRepository";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";
import {
  deleteStoredSupportImages,
  uploadSupportMessageAttachments,
} from "$lib/server/support/supportMessageAttachmentRepository";

export const CUSTOMER_TICKET_STATUSES = [
  "new",
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
] as const;

export const CUSTOMER_TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const CUSTOMER_TICKET_PERIODS = ["all", "7d", "30d", "90d"] as const;

export type CustomerTicketStatus = (typeof CUSTOMER_TICKET_STATUSES)[number];
export type CustomerTicketPriority = (typeof CUSTOMER_TICKET_PRIORITIES)[number];
export type CustomerTicketPeriod = (typeof CUSTOMER_TICKET_PERIODS)[number];
export type CustomerTicketContextScope = "unit" | "global";

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

export type CustomerTicketDisplayContext = {
  scope: CustomerTicketContextScope;
  groupId: number | null;
  groupName: string;
  unitId: number | null;
  unitName: string;
  unitSchema: string | null;
};

export type CreateCustomerF10TicketInput = {
  scope: CustomerTicketContextScope;
  groupId: number | null;
  unitId: number | null;
  subject: string;
  message: string;
  files?: File[];
};

export function canUseGlobalCustomerContext(session: CustomerF10PortalSession): boolean {
  return session.groups.length > 1 || listAuthorizedF10Contexts(session).length > 1;
}

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

function globalDisplayContext(): CustomerTicketDisplayContext {
  return {
    scope: "global",
    groupId: null,
    groupName: "Todos os grupos",
    unitId: null,
    unitName: "Global",
    unitSchema: null,
  };
}

function unitDisplayContext(context: CustomerF10AuthorizedContext): CustomerTicketDisplayContext {
  return {
    scope: "unit",
    groupId: context.groupId,
    groupName: context.groupName,
    unitId: context.unitId,
    unitName: context.unitName,
    unitSchema: context.unitSchema,
  };
}

function ticketContextFromRow(
  row: {
    contextTicketId: string | null;
    contextScope: string | null;
    groupId: number | null;
    groupName: string | null;
    unitId: number | null;
    unitName: string | null;
    unitSchema: string | null;
  },
  fallback: CustomerF10AuthorizedContext | null,
): CustomerTicketDisplayContext | null {
  if (row.contextTicketId && row.contextScope === "global") return globalDisplayContext();
  if (
    row.contextTicketId &&
    row.groupId !== null &&
    row.groupName &&
    row.unitId !== null &&
    row.unitName &&
    row.unitSchema
  ) {
    return {
      scope: "unit",
      groupId: row.groupId,
      groupName: row.groupName,
      unitId: row.unitId,
      unitName: row.unitName,
      unitSchema: row.unitSchema,
    };
  }
  return fallback ? unitDisplayContext(fallback) : null;
}

export async function listCustomerF10Tickets(
  session: CustomerF10PortalSession,
  filters: CustomerTicketListFilters,
) {
  const authorizedContexts = listAuthorizedF10Contexts(session);
  if (authorizedContexts.length === 0) {
    return { tickets: [], total: 0, page: 1, pageSize: filters.pageSize, totalPages: 0 };
  }

  const scopedContexts = filterAuthorizedContexts(authorizedContexts, filters);
  const hasContextFilter = filters.groupId !== null || filters.unitId !== null;
  if (hasContextFilter && scopedContexts.length === 0) {
    return { tickets: [], total: 0, page: 1, pageSize: filters.pageSize, totalPages: 0 };
  }

  const contextsForAuthorization = hasContextFilter ? scopedContexts : authorizedContexts;
  const contextCondition = contextAuthorizationCondition(session, contextsForAuthorization);
  if (!contextCondition) {
    return { tickets: [], total: 0, page: 1, pageSize: filters.pageSize, totalPages: 0 };
  }

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
      contextScope: ticketCustomerContexts.contextScope,
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

  const ticketIds = rows.map((row) => row.id);
  const detailPaths = ticketIds.map((ticketId) => `/cliente/chamados/${ticketId}`);
  const [teamActivityRows, viewedRows] = ticketIds.length > 0
    ? await Promise.all([
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
      ])
    : [[], []];

  const teamActivityByTicket = new Map(
    teamActivityRows.map((row) => [row.ticketId, row.lastTeamActivityAt]),
  );
  const lastViewedByPath = new Map(
    viewedRows.map((row) => [row.path, row.lastViewedAt]),
  );
  const fallbackContext = authorizedContexts.length === 1 ? authorizedContexts[0] ?? null : null;

  return {
    tickets: rows.map((row) => {
      const lastTeamActivityAt = teamActivityByTicket.get(row.id) ?? null;
      const lastViewedAt = lastViewedByPath.get(`/cliente/chamados/${row.id}`) ?? null;
      const hasUnreadUpdate = Boolean(
        lastTeamActivityAt &&
        (!lastViewedAt || new Date(lastTeamActivityAt).getTime() > new Date(lastViewedAt).getTime()),
      );
      return {
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
        lastTeamActivityAt,
        hasUnreadUpdate,
        context: ticketContextFromRow(row, fallbackContext),
      };
    }),
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
  const [context] = await getDatabase()
    .select({
      legacyUserId: ticketCustomerContexts.legacyUserId,
      contextScope: ticketCustomerContexts.contextScope,
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
    return { ...details, context: unitDisplayContext(authorizedContexts[0]) };
  }

  if (context.legacyUserId !== session.legacyUserId) return null;
  if (context.contextScope === "global") {
    return { ...details, context: globalDisplayContext() };
  }

  if (
    context.groupId === null ||
    !context.groupName ||
    context.unitId === null ||
    !context.unitName ||
    !context.unitSchema ||
    !isAuthorizedF10Context(session, context.groupId, context.unitId)
  ) {
    return null;
  }

  return {
    ...details,
    context: {
      scope: "unit" as const,
      groupId: context.groupId,
      groupName: context.groupName,
      unitId: context.unitId,
      unitName: context.unitName,
      unitSchema: context.unitSchema,
    },
  };
}

export async function createCustomerF10Ticket(
  session: CustomerF10PortalSession,
  input: CreateCustomerF10TicketInput,
) {
  const authorizedContexts = listAuthorizedF10Contexts(session);
  const unitContext = input.scope === "unit"
    ? authorizedContexts.find(
        (item) => item.groupId === input.groupId && item.unitId === input.unitId,
      ) ?? null
    : null;

  if (input.scope === "unit" && !unitContext) {
    throw new Error("CUSTOMER_TICKET_CONTEXT_NOT_AUTHORIZED");
  }
  if (input.scope === "global" && !canUseGlobalCustomerContext(session)) {
    throw new Error("CUSTOMER_TICKET_GLOBAL_CONTEXT_NOT_ALLOWED");
  }

  const subject = input.subject.trim();
  const message = input.message.trim();
  if (subject.length < 3 || subject.length > 180) throw new Error("CUSTOMER_TICKET_SUBJECT_INVALID");
  if (message.length < 1 || message.length > 10_000) throw new Error("CUSTOMER_TICKET_MESSAGE_INVALID");

  const intake = await resolveCustomerPortalTicketIntake();
  const ticketId = randomUUID();
  const messageId = randomUUID();
  const storedAttachments = await uploadSupportMessageAttachments(
    ticketId,
    messageId,
    input.files ?? [],
  );
  const db = getDatabase();
  const now = new Date();

  let ticket: { id: string; ticketNumber: number };
  try {
    ticket = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(tickets)
        .values({
          id: ticketId,
          customerContactId: session.contactId,
          queueId: intake.queueId,
          subject,
          status: intake.lifecycleStatus,
          priority: "normal",
          channel: "portal",
          dueOn: sql`CURRENT_DATE + ${intake.defaultDueDays}::integer`,
        })
        .returning({ id: tickets.id, ticketNumber: tickets.ticketNumber });
      if (!created) throw new Error("CUSTOMER_TICKET_NOT_CREATED");

      await tx.insert(ticketMessages).values({
        id: messageId,
        ticketId,
        authorType: "customer",
        customerContactId: session.contactId,
        visibility: "public",
        channel: "portal",
        body: message,
      });

      if (storedAttachments.length > 0) {
        await tx.insert(ticketMessageAttachments).values(
          storedAttachments.map((attachment) => ({
            messageId,
            ticketId,
            storageKey: attachment.storageKey,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            checksumSha256: attachment.checksumSha256,
          })),
        );
      }

      await tx.insert(ticketCustomerContexts).values({
        ticketId,
        customerContactId: session.contactId,
        legacyUserId: session.legacyUserId,
        contextScope: input.scope,
        groupId: unitContext?.groupId ?? null,
        groupName: unitContext?.groupName ?? null,
        unitId: unitContext?.unitId ?? null,
        unitName: unitContext?.unitName ?? null,
        unitSchema: unitContext?.unitSchema ?? null,
        updatedAt: now,
      });

      await tx.insert(ticketWorkflowStates).values({
        ticketId,
        globalWorkflowId: intake.workflowId,
        globalStageId: intake.stageId,
        enteredAt: now,
        updatedAt: now,
      });

      await tx.insert(ticketEvents).values({
        ticketId,
        eventType: "portal.ticket.created",
        metadata: {
          contextScope: input.scope,
          groupId: unitContext?.groupId ?? null,
          unitId: unitContext?.unitId ?? null,
          attachmentCount: storedAttachments.length,
        },
      });

      return created;
    });
  } catch (cause) {
    await deleteStoredSupportImages(storedAttachments);
    throw cause;
  }

  await notifySupportTicketNeedsAttention(
    ticket.id,
    "Novo chamado aberto pelo Portal do Cliente.",
  ).catch((cause) => {
    console.error("[customer.portal.ticket.notification]", {
      ticketId: ticket.id,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
  });

  return ticket;
}

export async function replyCustomerF10Ticket(
  session: CustomerF10PortalSession,
  ticketId: string,
  body: string,
  files: File[] = [],
): Promise<void> {
  const ticket = await getCustomerF10Ticket(session, ticketId);
  if (!ticket) throw new Error("CUSTOMER_TICKET_NOT_FOUND");
  await replyCustomerPortalTicket(session.contactId, ticketId, body, files);
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
      .set({ customerContactId: session.contactId, updatedAt: now })
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
        contextScope: "unit",
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
          contextScope: "unit",
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
