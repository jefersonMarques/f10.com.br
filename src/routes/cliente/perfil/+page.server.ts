import { requireCustomerF10PortalSession, normalizeCustomerPortalReturnTo } from "$lib/server/customerPortal/customerPortalSession";
import { getCustomerProfile } from "$lib/server/customerPortal/customerProfileRepository";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session = await requireCustomerF10PortalSession(cookies, "/cliente/perfil", false);
  const profile = await getCustomerProfile(session);
  const requested = normalizeCustomerPortalReturnTo(url.searchParams.get("returnTo") ?? "/cliente/chamados");
  const returnTo = requested.startsWith("/cliente/perfil") ? "/cliente/chamados" : requested;
  return {
    customer: { name: session.name, email: session.email, groupName: session.selectedGroupName, authProvider: "f10" as const },
    profile: { contactEmail: profile.contactEmail, contactPhone: profile.contactPhone, hasAvatar: Boolean(profile.avatarKey) },
    requiresNameConfirmation: session.requiresNameConfirmation ?? false,
    returnTo,
  };
};
