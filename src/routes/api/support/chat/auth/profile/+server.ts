import { json, type RequestHandler } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { updateCustomerProfileName } from "$lib/server/customerPortal/customerProfileRepository";

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  if (request.headers.get("origin") !== url.origin) return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const session = await getOptionalCustomerF10PortalSession(cookies);
  if (!session) return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401 });
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
    const body = JSON.parse(raw) as { name?: unknown };
    const profile = await updateCustomerProfileName(session, body?.name);
    return json(profile, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    if (code === "INVALID_CUSTOMER_NAME" || cause instanceof SyntaxError) return json({ error: "INVALID_CUSTOMER_NAME" }, { status: 400 });
    if (code === "CUSTOMER_AUTH_REQUIRED") return json({ error: code }, { status: 401 });
    return json({ error: "PROFILE_UNAVAILABLE" }, { status: 503 });
  }
};
