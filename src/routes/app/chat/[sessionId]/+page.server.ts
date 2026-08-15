import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createKnownDeviceRemoteSession,
  createRemoteDeviceEnrollment,
  listKnownRemoteDevicesForTicket,
  syncRemoteDevicesForTicket,
} from "$lib/server/remote/remoteDeviceEnrollmentRepository";
import { getMeshCentralControlStatus } from "$lib/server/remote/meshCentralControl";
import { getRemoteProviderStatus } from "$lib/server/remote/remoteSupportProvider";
import { listInternalChatMessages } from "$lib/server/support/internalChatRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.sessionId)) throw error(404, "Conversa não encontrada.");

  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "chat.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  try {
    const initial = await listInternalChatMessages(
      layout.user.id,
      permissions,
      params.sessionId,
    );
    const canRemote = hasPermission(permissions, "remote.request");
    const provider = getRemoteProviderStatus();
    const control = getMeshCentralControlStatus();

    if (canRemote && provider.configured && control.configured) {
      try {
        await syncRemoteDevicesForTicket(initial.chat.ticketId);
      } catch {
        // O chat continua funcional mesmo se a infraestrutura remota estiver indisponível.
      }
    }

    return {
      initial,
      canRespond: hasPermission(permissions, "chat.respond"),
      canRemote,
      remoteDevices: canRemote
        ? await listKnownRemoteDevicesForTicket(initial.chat.ticketId)
        : [],
      remoteReady: provider.configured && control.configured,
    };
  } catch {
    throw error(404, "Conversa não encontrada ou fora do seu escopo.");
  }
};

export const actions: Actions = {
  enrollRemote: async ({ params, cookies, url }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "enrollRemote", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "remote.request",
      `/app/chat/${params.sessionId}`,
    );

    try {
      const initial = await listInternalChatMessages(session.user.id, permissions, params.sessionId);
      await createRemoteDeviceEnrollment(session.user.id, initial.chat.ticketId, url.origin);
      return {
        success: true,
        action: "enrollRemote",
        message: "O link do Suporte Remoto F10 foi enviado nesta conversa.",
      };
    } catch {
      return fail(409, {
        success: false,
        action: "enrollRemote",
        message: "Não foi possível gerar o instalador remoto para esta conversa.",
      });
    }
  },

  startRemote: async ({ params, cookies, request }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "startRemote", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "remote.request",
      `/app/chat/${params.sessionId}`,
    );
    const formData = await request.formData();
    const deviceId = readString(formData, "deviceId");
    if (!isUuid(deviceId)) {
      return fail(400, { success: false, action: "startRemote", message: "Computador inválido." });
    }

    try {
      const initial = await listInternalChatMessages(session.user.id, permissions, params.sessionId);
      await syncRemoteDevicesForTicket(initial.chat.ticketId);
      const remoteSessionId = await createKnownDeviceRemoteSession(
        session.user.id,
        initial.chat.ticketId,
        deviceId,
      );
      throw redirect(303, `/app/remote/${remoteSessionId}/launch`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, {
        success: false,
        action: "startRemote",
        message: cause instanceof Error && cause.message === "REMOTE_DEVICE_OFFLINE"
          ? "Este computador está offline."
          : "Não foi possível iniciar o acesso remoto.",
      });
    }
  },
};
