import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import {
  getRemoteSupportSession,
  listRemoteSessions,
} from "$lib/server/remote/remoteSupportRepository";
import {
  endRemoteSupportSessionAtomic,
  startRemoteSupportSessionAtomic,
} from "$lib/server/remote/remoteSupportTransitions";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function requireVisibleSession(
  cookies: Parameters<typeof requireAppPermission>[0],
  sessionId: string,
) {
  const { session: actor, permissions } = await requireAppPermission(
    cookies,
    "remote.use",
    `/app/remote/${sessionId}`,
  );
  const scope = getPermissionScope(permissions, "remote.use") ?? "own";
  const visible = await listRemoteSessions(actor.user.id, scope, 500);
  if (!visible.some((item) => item.id === sessionId)) {
    throw error(404, "Sessão fora do seu escopo.");
  }
  return actor;
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.sessionId)) throw error(404, "Sessão não encontrada.");
  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "remote.use")) {
    throw error(403, "Acesso não autorizado.");
  }
  const scope = getPermissionScope(permissions, "remote.use") ?? "own";
  const visible = await listRemoteSessions(layout.user.id, scope, 500);
  if (!visible.some((item) => item.id === params.sessionId)) {
    throw error(404, "Sessão não encontrada ou fora do seu escopo.");
  }
  const session = await getRemoteSupportSession(params.sessionId);
  if (!session) throw error(404, "Sessão não encontrada.");
  return { session };
};

export const actions = {
  start: async ({ cookies, params }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, message: "Sessão não encontrada." });
    }
    const actor = await requireVisibleSession(cookies, params.sessionId);
    try {
      const desktop = await startRemoteSupportSessionAtomic(
        actor.user.id,
        params.sessionId,
      );
      return {
        success: true,
        action: "start",
        message: "Desktop remoto iniciado dentro do F10 Operations.",
        desktopUrl: desktop.desktopUrl,
        desktopExpiresAt: desktop.expiresAt.toISOString(),
      };
    } catch {
      return fail(409, {
        success: false,
        action: "start",
        message: "Não foi possível iniciar o desktop remoto. Confirme autorização, dispositivo online e integração MeshCentral.",
      });
    }
  },

  end: async ({ cookies, params }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, message: "Sessão não encontrada." });
    }
    const actor = await requireVisibleSession(cookies, params.sessionId);
    try {
      await endRemoteSupportSessionAtomic(actor.user.id, params.sessionId);
      return {
        success: true,
        action: "end",
        message: "Sessão remota encerrada e compartilhamento revogado.",
      };
    } catch {
      return fail(409, {
        success: false,
        action: "end",
        message: "Não foi possível revogar ou encerrar a sessão remota.",
      });
    }
  },
} satisfies Actions;
