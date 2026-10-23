import { error } from "@sveltejs/kit";
import { canViewHelpInsights } from "$lib/auth/accessPolicies";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { getHelpSearchInsights } from "$lib/server/help/helpSearchInsightsRepository";

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!canViewHelpInsights(layout.roles) || !hasPermission(permissions, "help.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  return getHelpSearchInsights();
};
