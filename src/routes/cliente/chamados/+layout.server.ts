import type { LayoutServerLoad } from "./$types";
import { requireCustomerPortalSession } from "$lib/server/customerPortal/customerPortalSession";

export const load: LayoutServerLoad = async ({ cookies }) => {
  const session = await requireCustomerPortalSession(cookies);
  return {
    customer: {
      id: session.contactId,
      name: session.name,
      email: session.email,
    },
  };
};
