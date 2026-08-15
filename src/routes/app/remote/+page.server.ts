import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { listRemoteDeviceDashboard } from "$lib/server/remote/remoteDeviceDashboardRepository";
import { getMeshCentralControlStatus } from "$lib/server/remote/meshCentralControl";
import { listRemoteSessions } from "$lib/server/remote/remoteSupportRepository";
import { getRemoteProviderStatus } from "$lib/server/remote/remoteSupportProvider";
import { getRemoteSupportSlaSnapshot } from "$lib/server/remote/remoteSupportSlaRepository";

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "remote.use")) throw error(403, "Acesso não autorizado.");

  const scope = getPermissionScope(permissions, "remote.use") ?? "own";
  const canManage = hasPermission(permissions, "remote.manage");

  const [sessions, devices, sla] = await Promise.all([
    listRemoteSessions(layout.user.id, scope),
    canManage ? listRemoteDeviceDashboard() : Promise.resolve([]),
    canManage ? getRemoteSupportSlaSnapshot(30) : Promise.resolve(null),
  ]);

  return {
    sessions,
    devices,
    sla,
    provider: getRemoteProviderStatus(),
    control: getMeshCentralControlStatus(),
    canManage,
  };
};
