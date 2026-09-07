import type { LayoutServerLoad } from "./$types";
import { isOpenAiConfigured } from "$lib/server/ai/openAiResponses";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { isHelpPublicAiSecretConfigured } from "$lib/server/help/helpPublicAiProtection";
import { getHelpPublicAiSettings } from "$lib/server/settings/operationsSettingsRepository";

export const load: LayoutServerLoad = async ({ cookies }) => {
  const [settings, customer] = await Promise.all([
    getHelpPublicAiSettings(),
    getOptionalCustomerF10PortalSession(cookies, { touchActivity: false }).catch(() => null),
  ]);

  return {
    helpPublicAi: {
      enabled: settings.enabled,
      available:
        settings.enabled &&
        isOpenAiConfigured() &&
        isHelpPublicAiSecretConfigured(),
      requiresAuthentication: !settings.anonymousAccessEnabled,
    },
    customerSupport: customer
      ? {
          authenticated: true,
          name: customer.name,
          email: customer.email,
          groupName: customer.selectedGroupName,
          unitName: customer.selectedUnitName,
          requiresUnitSelection: customer.selectedUnitId === null,
          groups: customer.groups.map((group) => ({
            id: group.grupo_id,
            name: group.grupo,
            units: group.unidades.map((unit) => ({
              id: unit.unidade_id,
              name: unit.unidade,
            })),
          })),
        }
      : {
          authenticated: false,
          name: "",
          email: "",
          groupName: null,
          unitName: null,
          requiresUnitSelection: false,
          groups: [],
        },
  };
};
