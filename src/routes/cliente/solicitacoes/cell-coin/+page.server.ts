import type { PageServerLoad } from "./$types";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session = await requireCustomerF10PortalSession(cookies, url.pathname, true);
  return {
    customer: { email: session.email },
    context: {
      groupId: session.selectedGroupId,
      groupName: session.selectedGroupName,
      unitId: session.selectedUnitId,
      unitName: session.selectedUnitName,
    },
  };
};
