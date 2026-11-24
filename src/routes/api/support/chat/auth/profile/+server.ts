import { json, type RequestHandler } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { updateCustomerProfile, updateCustomerProfileName } from "$lib/server/customerPortal/customerProfileRepository";
import { MAX_CUSTOMER_AVATAR_BYTES } from "$lib/support/customerProfile";

const headers = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = MAX_CUSTOMER_AVATAR_BYTES + 64 * 1024;

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  if (request.headers.get("origin") !== url.origin) return json({ error: "INVALID_ORIGIN" }, { status: 403, headers });
  const session = await getOptionalCustomerF10PortalSession(cookies);
  if (!session) return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401, headers });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413, headers });
  }

  try {
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await request.formData();
      const avatar = form.get("avatar");
      const profile = await updateCustomerProfile(session, {
        name: form.get("name"),
        contactEmail: form.has("contactEmail") ? form.get("contactEmail") : undefined,
        contactPhone: form.has("contactPhone") ? form.get("contactPhone") : undefined,
        avatar: avatar instanceof File && avatar.size > 0 ? avatar : undefined,
        removeAvatar: form.get("removeAvatar") === "true",
      });
      return json(profile, { headers });
    }

    const raw = await request.text();
    if (raw.length > 2048) return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413, headers });
    const body = JSON.parse(raw) as { name?: unknown };
    return json(await updateCustomerProfileName(session, body?.name), { headers });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    if (["INVALID_CUSTOMER_NAME", "INVALID_CONTACT_EMAIL", "INVALID_CONTACT_PHONE", "INVALID_AVATAR"].includes(code)) {
      return json({ error: code }, { status: 400, headers });
    }
    if (cause instanceof SyntaxError) return json({ error: "INVALID_CUSTOMER_NAME" }, { status: 400, headers });
    if (code === "CUSTOMER_AUTH_REQUIRED") return json({ error: code }, { status: 401, headers });
    return json({ error: "PROFILE_UNAVAILABLE" }, { status: 503, headers });
  }
};
