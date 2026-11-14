import type { Cookies } from "@sveltejs/kit";
import { isAuthorizedF10Context } from "$lib/server/customerPortal/customerF10AuthRepository";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { getTicketCustomerContext } from "$lib/server/support/ticketCustomerContextRepository";
import { authorizePublicChatSessionForRead } from "$lib/server/support/publicChatRepository";

type AuthorizedChatSession = Awaited<ReturnType<typeof authorizePublicChatSessionForRead>>;

export async function getAuthenticatedPublicChatCustomer(
  cookies: Cookies,
  session: AuthorizedChatSession,
  touchActivity: boolean,
) {
  const customer = await getOptionalCustomerF10PortalSession(cookies, { touchActivity });
  if (!customer) return null;

  if (session.legacyUserId && session.groupId !== null && session.unitId !== null) {
    if (session.legacyUserId !== customer.legacyUserId) return null;
    return isAuthorizedF10Context(customer, session.groupId, session.unitId)
      ? customer : null;
  }

  if (!session.ticketId) return null;
  const context = await getTicketCustomerContext(session.ticketId);
  if (!context || context.scope !== "unit" ||
    context.legacyUserId !== customer.legacyUserId ||
    context.groupId === null || context.unitId === null) return null;

  return isAuthorizedF10Context(customer, context.groupId, context.unitId)
    ? customer : null;
}
