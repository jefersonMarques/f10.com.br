import type { LayoutServerLoad } from "./$types";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { listActiveIframeF10Notices } from "$lib/server/iframeF10/noticeRepository";

export const load: LayoutServerLoad = async ({ cookies }) => {
  const [customer, notices] = await Promise.all([
    getOptionalCustomerF10PortalSession(cookies, { touchActivity: false }).catch(() => null),
    listActiveIframeF10Notices(),
  ]);

  return {
    notices,
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
