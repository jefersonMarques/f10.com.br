import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { getContactContractAccess } from "$lib/server/support/customerContractAccessRepository";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  const { permissions } = await requireAppPermission(
    cookies, "customers.view", url.pathname,
  );
  if (!hasPermission(permissions, "customers.view", "all") ||
      !hasPermission(permissions, "tickets.create")) {
    throw error(403, "Acesso não autorizado.");
  }
  if (!UUID.test(params.customerId ?? "")) throw error(400, "Pessoa inválida.");
  return json(
    { contracts: await getContactContractAccess(params.customerId) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
};