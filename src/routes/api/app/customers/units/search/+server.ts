import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { searchCommercialTicketUnits } from "$lib/server/support/ticketCommercialUnitRepository";

export const GET: RequestHandler = async ({ cookies, url }) => {
  const { permissions } = await requireAppPermission(cookies, "tickets.reply", url.pathname);
  if (!hasPermission(permissions, "customers.view")) {
    return json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (query.length < 2) {
    return json({ units: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }
  const units = await searchCommercialTicketUnits(query);
  return json({ units }, { headers: { "Cache-Control": "private, no-store" } });
};
