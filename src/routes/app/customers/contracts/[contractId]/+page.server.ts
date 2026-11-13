import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import { refreshF10ContractHolder } from "$lib/server/support/f10CustomerHolderRepository";
import { getF10CustomerContractDetails } from "$lib/server/support/f10CustomerContractDetailsRepository";
import {
  getContractTicketCounts,
  listContractTickets,
} from "$lib/server/support/customerContractAccessRepository";

function contractIdOf(raw: string | undefined): number {
  if (!raw || !/^[1-9][0-9]*$/.test(raw) ||
      !Number.isSafeInteger(Number(raw))) {
    throw error(404, "Contrato inválido.");
  }
  return Number(raw);
}

export const load: PageServerLoad = async ({ parent, params, setHeaders }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((item) => [item.code, item.scope]));
  if (!hasPermission(permissions, "customers.view", "all")) {
    throw error(403, "Acesso não autorizado.");
  }
  setHeaders({ "Cache-Control": "private, no-store" });
  const unitId = getConfiguredF10UnitId();
  const contractId = contractIdOf(params.contractId);
  const details = await getF10CustomerContractDetails(unitId, contractId);
  if (!details) throw error(404, "Contrato não encontrado.");

  const showTicketHistory = hasPermission(permissions, "tickets.view", "all");
  const [ticketCounts, recentTickets] = showTicketHistory
    ? await Promise.all([
        getContractTicketCounts(unitId, contractId),
        listContractTickets(unitId, contractId),
      ])
    : [{ total: 0, open: 0 }, []];

  return {
    details,
    ticketCounts,
    recentTickets,
    showTicketHistory,
    canManage: hasPermission(permissions, "customers.manage", "all"),
  };
};

export const actions: Actions = {
  refreshHolder: async ({ cookies, params }) => {
    const { permissions } = await requireAppPermission(
      cookies, "customers.manage", "/app/customers",
    );
    if (!hasPermission(permissions, "customers.manage", "all")) {
      throw error(403, "Acesso não autorizado.");
    }
    try {
      await refreshF10ContractHolder(getConfiguredF10UnitId(), contractIdOf(params.contractId));
      return { success: true, message: "Titular atualizado." };
    } catch {
      return fail(502, { success: false, message: "Não foi possível atualizar o titular." });
    }
  },
};
