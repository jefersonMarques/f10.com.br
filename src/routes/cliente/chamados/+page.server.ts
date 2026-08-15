import type { PageServerLoad } from "./$types";
import { listCustomerPortalTickets } from "$lib/server/customerPortal/customerPortalRepository";

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  return {
    tickets: await listCustomerPortalTickets(layout.customer.id),
  };
};
