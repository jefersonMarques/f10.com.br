import { error, redirect, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { listRemoteSessions } from "$lib/server/remote/remoteSupportRepository";
import { startRemoteSupportSessionAtomic } from "$lib/server/remote/remoteSupportTransitions";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const sessionId = params.sessionId ?? "";
  if (!isUuid(sessionId)) throw error(404, "Sessão não encontrada.");
  const { session, permissions } = await requireAppPermission(cookies, "remote.use", `/app/remote/${sessionId}`);
  const scope = getPermissionScope(permissions, "remote.use") ?? "own";
  const visible = await listRemoteSessions(session.user.id, scope, 500);
  if (!visible.some((item) => item.id === sessionId)) throw error(404, "Sessão fora do seu escopo.");
  try {
    const url = await startRemoteSupportSessionAtomic(session.user.id, sessionId);
    throw redirect(303, url);
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
    throw error(409, "A sessão precisa estar autorizada e o MeshCentral configurado.");
  }
};
