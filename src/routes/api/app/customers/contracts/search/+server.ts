import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import { searchF10TicketContracts } from "$lib/server/support/f10TicketContractRepository";

export const GET: RequestHandler = async ({ cookies, url }) => {
  const { permissions } = await requireAppPermission(
    cookies, "customers.view", url.pathname,
  );
  if (!hasPermission(permissions, "customers.view", "all") ||
      !hasPermission(permissions, "tickets.create")) {
    throw error(403, "Pesquisa de contratos não autorizada.");
  }

  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (query.length < 2) {
    return json({ contracts: [] }, { headers: { "Cache-Control": "private, no-store" } });
  }

  let unitId: number;
  try {
    unitId = getConfiguredF10UnitId();
  } catch {
    throw error(503, "API F10 não configurada.");
  }

  const contracts = await searchF10TicketContracts(unitId, query);
  return json(
    { contracts },
    { headers: { "Cache-Control": "private, no-store" } },
  );
};
