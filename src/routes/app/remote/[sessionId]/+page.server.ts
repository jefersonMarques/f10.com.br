import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import {
  getRemoteSupportSession,
  listRemoteSessions,
} from "$lib/server/remote/remoteSupportRepository";
import { endRemoteSupportSessionAtomic } from "$lib/server/remote/remoteSupportTransitions";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.sessionId)) throw error(404, "Sessão não encontrada.");
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "remote.use")) throw error(403, "Acesso não autorizado.");
  const scope = getPermissionScope(permissions, "remote.use") ?? "own";
  const visible = await listRemoteSessions(layout.user.id, scope, 500);
  if (!visible.some((item) => item.id === params.sessionId)) throw error(404, "Sessão não encontrada ou fora do seu escopo.");
  const session = await getRemoteSupportSession(params.sessionId);
  if (!session) throw error(404, "Sessão não encontrada.");
  return { session };
};

export const actions: Actions = {
  end: async ({ cookies, params }) => {
    if (!isUuid(params.sessionId)) return fail(404, { success: false, message: "Sessão não encontrada." });
    const { session: actor, permissions } = await requireAppPermission(cookies, "remote.use", `/app/remote/${params.sessionId}`);
    const scope = getPermissionScope(permissions, "remote.use") ?? "own";
    const visible = await listRemoteSessions(actor.user.id, scope, 500);
    if (!visible.some((item) => item.id === params.sessionId)) return fail(404, { success: false, message: "Sessão fora do seu escopo." });
    try {
      await endRemoteSupportSessionAtomic(actor.user.id, params.sessionId);
      return { success: true, message: "Sessão remota encerrada no F10." };
    } catch {
      return fail(409, { success: false, message: "A sessão não está ativa ou autorizada." });
    }
  },
};
