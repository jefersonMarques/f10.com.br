import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { getCommercialUnitProfile } from "$lib/server/support/ticketCommercialUnitRepository";

export const load: PageServerLoad = async ({ parent, params }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((item) => [item.code, item.scope]),
  );
  if (!hasPermission(permissions, "customers.view", "all")) {
    throw error(403, "Acesso não autorizado.");
  }

  const unit = await getCommercialUnitProfile(params.unitId);
  if (!unit) throw error(404, "Unidade comercial não encontrada.");
  return { unit };
};
