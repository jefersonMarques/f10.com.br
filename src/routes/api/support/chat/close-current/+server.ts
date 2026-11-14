import { json, type RequestHandler } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { closeCurrentCustomerChat } from "$lib/server/support/customerChatLifecycleRepository";

export const POST: RequestHandler = async ({ cookies, request, url }) => {
  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }

  const customer = await getOptionalCustomerF10PortalSession(cookies, { touchActivity: true });
  if (!customer) {
    return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401 });
  }

  if (customer.selectedGroupId === null || customer.selectedUnitId === null) {
    return json({ error: "CHAT_UNIT_REQUIRED" }, { status: 409 });
  }

  try {
    const result = await closeCurrentCustomerChat(customer);
    return json({ ok: true, ...result }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return json({ error: "CHAT_CLOSE_UNAVAILABLE" }, { status: 503 });
  }
};
