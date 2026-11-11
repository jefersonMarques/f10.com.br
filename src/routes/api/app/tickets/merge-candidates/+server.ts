import { json, type RequestHandler } from "@sveltejs/kit";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { listTicketMergeCandidates } from "$lib/server/support/ticketMergeRepository";

export const GET: RequestHandler = async ({ cookies, url }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const session = await getSessionUser(token);
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const permissions = await resolveUserPermissions(session.user.id);
  if (!hasPermission(permissions, "tickets.merge") || !hasPermission(permissions, "tickets.view")) {
    return json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const query = url.searchParams.get("q") ?? "";
  try {
    const tickets = await listTicketMergeCandidates(session.user.id, permissions, query);
    return json({ tickets }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return json({ error: "TICKET_MERGE_SEARCH_FAILED" }, { status: 400 });
  }
};
