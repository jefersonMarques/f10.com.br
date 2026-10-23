import { error, json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { tickets } from "$lib/server/db/supportSchema";
import { requireTicketAccess } from "$lib/server/support/supportAccess";

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  if (!UUID.test(params.ticketId)) throw error(404, "Ticket não encontrado.");
  const { session, permissions } = await requireAppPermission(
    cookies, "tickets.view", url.pathname,
  );
  const scope = getPermissionScope(permissions, "tickets.view");
  if (!scope) throw error(403, "Acesso negado.");
  await requireTicketAccess(session.user.id, scope, params.ticketId);
  const [row] = await getDatabase().select({ updatedAt: tickets.updatedAt })
    .from(tickets).where(eq(tickets.id, params.ticketId)).limit(1);
  if (!row) throw error(404, "Ticket não encontrado.");
  return json({ revision: row.updatedAt.getTime() }, {
    headers: { "Cache-Control": "private, no-store" },
  });
};
