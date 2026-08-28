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
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

const PAGE_SIZE = 20;

function parseId(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parsePage(value: string | null): number {
  const parsed = parseId(value);
  return parsed && parsed > 0 ? parsed : 1;
}

function parseStatus(value: string | null): CustomerTicketStatus | null {
  return CUSTOMER_TICKET_STATUSES.includes(value as CustomerTicketStatus)
    ? (value as CustomerTicketStatus)
    : null;
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
  const status = parseStatus(url.searchParams.get("status"));
  const priority = parsePriority(url.searchParams.get("priority"));
  const period = parsePeriod(url.searchParams.get("period"));
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const page = parsePage(url.searchParams.get("page"));
  const view = url.searchParams.get("view") === "table" ? "table" : "cards";

  const result = await listCustomerF10Tickets(session, {
    groupId,
    unitId,
    status,
    priority,
    period,
    search,
    page,
    pageSize: PAGE_SIZE,
  });

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
      status,
      priority,
      period,
      hasSearch: Boolean(search),
      view,
    },
  }).catch(() => undefined);

  return {
    ...result,
    groups: session.groups,
    filters: {
      groupId,
      unitId,
      status,
      priority,
      period,
      search,
      view,
    },
  };
};
