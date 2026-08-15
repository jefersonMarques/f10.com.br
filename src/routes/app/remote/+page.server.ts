import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import {
  listRemoteDevices,
  listRemoteSessions,
  registerRemoteDevice,
} from "$lib/server/remote/remoteSupportRepository";
import { getRemoteProviderStatus } from "$lib/server/remote/remoteSupportProvider";

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "remote.use")) throw error(403, "Acesso não autorizado.");
  const scope = getPermissionScope(permissions, "remote.use") ?? "own";
  return {
    sessions: await listRemoteSessions(layout.user.id, scope),
    devices: await listRemoteDevices(),
    provider: getRemoteProviderStatus(),
    canManage: hasPermission(permissions, "remote.manage"),
  };
};

export const actions: Actions = {
  registerDevice: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "remote.manage", "/app/remote");
    const formData = await request.formData();
    const name = readString(formData, "name");
    const providerDeviceId = readString(formData, "providerDeviceId");
    const customerEmail = readString(formData, "customerEmail");
    if (name.length < 2 || name.length > 160 || providerDeviceId.length < 2 || providerDeviceId.length > 500 || customerEmail.length > 254) {
      return fail(400, { success: false, action: "registerDevice", message: "Revise nome, ID do dispositivo e cliente." });
    }
    try {
      await registerRemoteDevice(session.user.id, { name, providerDeviceId, customerEmail });
      return { success: true, action: "registerDevice", message: "Dispositivo remoto registrado." };
    } catch (cause) {
      return fail(409, {
        success: false,
        action: "registerDevice",
        message: cause instanceof Error && cause.message === "REMOTE_CUSTOMER_NOT_FOUND"
          ? "Nenhum cliente ativo foi encontrado com esse e-mail."
          : "Não foi possível registrar o dispositivo.",
      });
    }
  },
};
