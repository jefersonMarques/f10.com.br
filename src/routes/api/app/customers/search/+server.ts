import { json, type RequestHandler } from "@sveltejs/kit";
import { hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { listCustomerDirectory } from "$lib/server/support/customerDirectoryRepository";

export const GET: RequestHandler = async ({ cookies, url }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const session = await getSessionUser(token);
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const permissions = await resolveUserPermissions(session.user.id);
  if (!hasPermission(permissions, "customers.view")) {
    return json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (query.length < 2) {
    return json({ customers: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const result = await listCustomerDirectory(session.user.id, permissions, {
    query,
    page: 1,
    pageSize: 20,
  });

  return json(
    {
      customers: result.rows.map((customer) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        whatsapp: customer.whatsapp,
        organizationName: customer.organizationName,
        latestUnitName: customer.latestUnitName,
        latestGroupName: customer.latestGroupName,
        openTicketCount: customer.openTicketCount,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
};
