import type { LayoutServerLoad } from "./$types";
import { requireCustomerTicketPortalSession } from "$lib/server/customerPortal/customerPortalSession";

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const session = await requireCustomerTicketPortalSession(
    cookies,
    `${url.pathname}${url.search}`,
  );
  return {
    customer: {
      id: session.contactId,
      name: session.name,
      email: session.email,
      legacyUserId: session.legacyUserId,
      authProvider: session.authProvider,
      groupId: session.selectedGroupId,
      groupName: session.selectedGroupName,
      unitId: session.selectedUnitId,
      unitName: session.selectedUnitName,
      groups: session.groups,
    },
  };
};
