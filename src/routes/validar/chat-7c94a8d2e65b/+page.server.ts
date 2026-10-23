import type { PageServerLoad } from "./$types";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

export const load: PageServerLoad = async ({ cookies, setHeaders }) => {
  setHeaders({
    "X-Robots-Tag": "noindex, nofollow, noarchive",
    "Cache-Control": "private, no-store",
  });

  const customer = await getOptionalCustomerF10PortalSession(cookies, {
    touchActivity: false,
  }).catch(() => null);

  return {
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
