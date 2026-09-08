import type { LayoutServerLoad } from "./$types";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const session = await requireCustomerF10PortalSession(
    cookies,
    `${url.pathname}${url.search}`,
    false,
  );
  return {
    customer: {
      id: session.contactId,
      name: session.name,
      email: session.email,
      legacyUserId: session.legacyUserId,
      groupId: session.selectedGroupId,
      groupName: session.selectedGroupName,
      unitId: session.selectedUnitId,
      unitName: session.selectedUnitName,
      groups: session.groups,
    },
  };
};
