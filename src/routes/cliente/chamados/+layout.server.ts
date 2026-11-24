import type { LayoutServerLoad } from "./$types";
import { findActiveCustomerChat } from "$lib/server/support/customerChatSessionRepository";
import { requireCustomerTicketPortalSession } from "$lib/server/customerPortal/customerPortalSession";

export const load: LayoutServerLoad = async ({ cookies, url }) => {
  const session = await requireCustomerTicketPortalSession(
    cookies,
    `${url.pathname}${url.search}`,
  );
  const hasActiveChat = session.legacyUserId && session.selectedGroupId !== null && session.selectedUnitId !== null
    ? await findActiveCustomerChat({
      legacyUserId: session.legacyUserId, groupId: session.selectedGroupId, unitId: session.selectedUnitId,
    }).catch(() => false) : false;
  return {
    hasActiveChat,
    customer: {
      id: session.contactId,
      name: session.name,
      requiresNameConfirmation: session.requiresNameConfirmation ?? false,
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
