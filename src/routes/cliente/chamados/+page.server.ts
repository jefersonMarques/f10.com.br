import type { PageServerLoad } from "./$types";
import { recordCustomerActivity } from "$lib/server/customerPortal/customerActivityRepository";
import {
  CUSTOMER_TICKET_PERIODS,
  CUSTOMER_TICKET_PRIORITIES,
  CUSTOMER_TICKET_STATUSES,
  listCustomerF10Tickets,
  type CustomerTicketPeriod,
  type CustomerTicketPriority,
  type CustomerTicketStatus,
} from "$lib/server/customerPortal/customerF10TicketRepository";
import { getCustomerF10TicketSummary } from "$lib/server/customerPortal/customerF10TicketSummaryRepository";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

const PAGE_SIZE = 20;
const MAX_PAGE = 100;
const ACTIVE_STATUSES = ["new", "open", "in_progress", "waiting_customer"] as const;
type CustomerStatusFilter = CustomerTicketStatus | "active" | "all";

function parseId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePage(value: string | null): number {
  const parsed = parseId(value);
  return parsed && parsed > 0 ? Math.min(parsed, MAX_PAGE) : 1;
}

function parseStatusFilter(value: string | null): CustomerStatusFilter {
  if (!value || value === "active") return "active";
  if (value === "all") return "all";
  return CUSTOMER_TICKET_STATUSES.includes(value as CustomerTicketStatus)
    ? (value as CustomerTicketStatus)
    : "active";
}

function parsePriority(value: string | null): CustomerTicketPriority | null {
  return CUSTOMER_TICKET_PRIORITIES.includes(value as CustomerTicketPriority)
    ? (value as CustomerTicketPriority)
    : null;
}

function parsePeriod(value: string | null): CustomerTicketPeriod {
  return CUSTOMER_TICKET_PERIODS.includes(value as CustomerTicketPeriod)
    ? (value as CustomerTicketPeriod)
    : "all";
}

async function listActiveTickets(
  session: Parameters<typeof listCustomerF10Tickets>[0],
  filters: Omit<Parameters<typeof listCustomerF10Tickets>[1], "status">,
) {
  const fetchSize = filters.page * filters.pageSize;
  const results = await Promise.all(
    ACTIVE_STATUSES.map((status) =>
      listCustomerF10Tickets(session, {
        ...filters,
        status,
        page: 1,
        pageSize: fetchSize,
      }),
    ),
  );

  const total = results.reduce((sum, result) => sum + result.total, 0);
  const totalPages = total === 0 ? 0 : Math.ceil(total / filters.pageSize);
  const page = totalPages === 0 ? 1 : Math.min(filters.page, totalPages);
  const start = (page - 1) * filters.pageSize;
  const tickets = results
    .flatMap((result) => result.tickets)
    .sort((left, right) => {
      const updatedDiff = new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      return updatedDiff !== 0 ? updatedDiff : right.ticketNumber - left.ticketNumber;
    })
    .slice(start, start + filters.pageSize);

  return {
    tickets,
    total,
    page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session = await requireCustomerF10PortalSession(
    cookies,
    `${url.pathname}${url.search}`,
    false,
  );

  const groupParam = url.searchParams.get("groupId");
  const groupId = groupParam === null || groupParam === "all"
    ? null
    : parseId(groupParam);
  const unitId = groupId === null ? null : parseId(url.searchParams.get("unitId"));
  const statusFilter = parseStatusFilter(url.searchParams.get("status"));
  const status = statusFilter === "active" || statusFilter === "all" ? null : statusFilter;
  const priority = parsePriority(url.searchParams.get("priority"));
  const period = parsePeriod(url.searchParams.get("period"));
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const page = parsePage(url.searchParams.get("page"));
  const view = url.searchParams.get("view") === "table" ? "table" : "cards";

  const summaryFilters = {
    groupId,
    unitId,
    status: statusFilter === "active" ? null : status,
    priority,
    period,
    search,
  };
  const listFilters = {
    groupId,
    unitId,
    priority,
    period,
    search,
    page,
    pageSize: PAGE_SIZE,
  };

  const [result, summary] = await Promise.all([
    statusFilter === "active"
      ? listActiveTickets(session, listFilters)
      : listCustomerF10Tickets(session, { ...listFilters, status }),
    getCustomerF10TicketSummary(session, summaryFilters),
  ]);

  await recordCustomerActivity(session, {
    eventType: "ticket.list.view",
    source: "customer_portal",
    path: url.pathname,
    metadata: {
      ticketCount: result.tickets.length,
      total: result.total,
      page: result.page,
      groupId,
      unitId,
      status: statusFilter,
      priority,
      period,
      hasSearch: Boolean(search),
      view,
    },
  }).catch(() => undefined);

  return {
    ...result,
    summary,
    groups: session.groups,
    filters: {
      groupId,
      unitId,
      status: statusFilter,
      priority,
      period,
      search,
      view,
    },
  };
};
