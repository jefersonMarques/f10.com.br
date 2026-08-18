import type { PageServerLoad } from "./$types";
import { recordCustomerActivity } from "$lib/server/customerPortal/customerActivityRepository";
import { listCustomerF10Tickets } from "$lib/server/customerPortal/customerF10TicketRepository";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session = await requireCustomerF10PortalSession(cookies, `${url.pathname}${url.search}`);
  const tickets = await listCustomerF10Tickets(session);
  await recordCustomerActivity(session, {
    eventType: "ticket.list.view",
    source: "customer_portal",
    path: url.pathname,
    metadata: { ticketCount: tickets.length },
  }).catch(() => undefined);
  return { tickets };
};
