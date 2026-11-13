import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import { getF10CustomerContractDetails } from "$lib/server/support/f10CustomerContractDetailsRepository";

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  const { permissions } = await requireAppPermission(
    cookies, "customers.view", url.pathname,
  );
  if (!hasPermission(permissions, "customers.view", "all")) {
    throw error(403, "Acesso não autorizado.");
  }

  const contractId = Number(params.contractId);
  if (!/^[1-9][0-9]*$/.test(params.contractId ?? "") ||
      !Number.isSafeInteger(contractId)) {
    throw error(400, "Contrato inválido.");
  }

  let unitId: number;
  try {
    unitId = getConfiguredF10UnitId();
  } catch {
    throw error(503, "Integração F10 indisponível.");
  }

  const contract = await getF10CustomerContractDetails(unitId, contractId);
  if (!contract) throw error(404, "Contrato não encontrado.");
  return json(
    { contract },
    { headers: { "Cache-Control": "private, no-store" } },
  );
};
