import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getTicketCard } from "$lib/server/support/ticketCardRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Ticket não encontrado.");
  const { session, permissions } = await requireAppPermission(
    cookies,
    "tickets.view",
    url.pathname,
  );

  try {
    const card = await getTicketCard(session.user.id, permissions, params.ticketId);
    return json(card, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch {
    throw error(404, "Ticket não encontrado ou fora do seu escopo de acesso.");
  }
};
