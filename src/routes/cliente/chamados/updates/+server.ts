import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { tickets } from "$lib/server/db/supportSchema";
import { getCustomerF10Ticket } from "$lib/server/customerPortal/customerF10TicketRepository";
import { requireCustomerTicketPortalSession } from "$lib/server/customerPortal/customerPortalSession";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export const GET: RequestHandler = async ({ cookies, url }) => {
  const session = await requireCustomerTicketPortalSession(cookies, url.pathname);
  const ticketId = url.searchParams.get("ticketId");

  if (ticketId !== null) {
    if (!UUID.test(ticketId)) throw error(404, "Chamado não encontrado.");
    const details = await getCustomerF10Ticket(session, ticketId);
    if (!details) throw error(404, "Chamado não encontrado.");
    return json({ revision: new Date(details.ticket.updatedAt).getTime() }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  // Lightweight contact-scoped revision. Any change triggers a secured page reload,
  // where the usual group/unit and filter checks remain authoritative.
  const [state] = await getDatabase()
    .select({
      total: sql<number>`count(*)::int`,
      latest: sql<Date | null>`max(${tickets.updatedAt})`,
    })
    .from(tickets)
    .where(eq(tickets.customerContactId, session.contactId));

  return json({
    revision: `${state?.total ?? 0}:${state?.latest ? new Date(state.latest).getTime() : 0}`,
  }, { headers: { "Cache-Control": "private, no-store" } });
};
