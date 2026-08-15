import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  createKnownDeviceRemoteSession,
  createRemoteDeviceEnrollment,
  listKnownRemoteDevicesForTicket,
  syncRemoteDevicesForTicket,
} from "$lib/server/remote/remoteDeviceEnrollmentRepository";
import { getMeshCentralControlStatus } from "$lib/server/remote/meshCentralControl";
import { getRemoteProviderStatus } from "$lib/server/remote/remoteSupportProvider";
import { getSupportTicket } from "$lib/server/support/supportRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireTicketAccess(cookies: Parameters<typeof requireAppPermission>[0], ticketId: string) {
  const auth = await requireAppPermission(cookies, "remote.request", `/app/tickets/${ticketId}/remote`);
  try {
    const details = await getSupportTicket(auth.session.user.id, auth.permissions, ticketId);
    return { ...auth, details };
  } catch {
    throw error(404, "Ticket não encontrado ou fora do seu escopo.");
  }
}

export const load: PageServerLoad = async ({ params, cookies }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Ticket não encontrado.");
  const { details } = await requireTicketAccess(cookies, params.ticketId);
  const provider = getRemoteProviderStatus();
  const control = getMeshCentralControlStatus();
  let syncError = "";

  if (provider.configured && control.configured) {
    try {
      await syncRemoteDevicesForTicket(params.ticketId);
    } catch {
      syncError = "Não foi possível sincronizar os computadores com o MeshCentral agora.";
    }
  }

  return {
    ticket: details.ticket,
    devices: await listKnownRemoteDevicesForTicket(params.ticketId),
    provider,
    control,
    syncError,
  };
};

export const actions: Actions = {
  enroll: async ({ params, cookies, url }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, message: "Ticket não encontrado." });
    }
    const provider = getRemoteProviderStatus();
    const control = getMeshCentralControlStatus();
    if (!provider.configured || !control.configured) {
      return fail(503, {
        success: false,
        action: "enroll",
        message: "O MeshCentral ainda não está pronto para gerar o instalador de suporte.",
      });
    }
    const { session } = await requireTicketAccess(cookies, params.ticketId);

    try {
      await createRemoteDeviceEnrollment(session.user.id, params.ticketId, url.origin);
      return {
        success: true,
        action: "enroll",
        message: "O link para instalar o Suporte Remoto F10 foi enviado na conversa deste ticket.",
      };
    } catch {
      return fail(409, {
        success: false,
        action: "enroll",
        message: "Não foi possível gerar o instalador remoto para este cliente.",
      });
    }
  },

  sync: async ({ params, cookies }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, message: "Ticket não encontrado." });
    }
    await requireTicketAccess(cookies, params.ticketId);
    try {
      const devices = await syncRemoteDevicesForTicket(params.ticketId);
      return {
        success: true,
        action: "sync",
        message: devices.length > 0
          ? `${devices.length} computador(es) sincronizado(s).`
          : "O instalador ainda não apareceu conectado no MeshCentral.",
      };
    } catch {
      return fail(503, {
        success: false,
        action: "sync",
        message: "Não foi possível consultar o MeshCentral agora.",
      });
    }
  },

  start: async ({ params, cookies, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, message: "Ticket não encontrado." });
    }
    const { session } = await requireTicketAccess(cookies, params.ticketId);
    const formData = await request.formData();
    const deviceId = readString(formData, "deviceId");
    if (!isUuid(deviceId)) {
      return fail(400, { success: false, action: "start", message: "Selecione um computador válido." });
    }

    try {
      await syncRemoteDevicesForTicket(params.ticketId);
      const remoteSessionId = await createKnownDeviceRemoteSession(
        session.user.id,
        params.ticketId,
        deviceId,
      );
      throw redirect(303, `/app/remote/${remoteSessionId}/launch`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      const message = cause instanceof Error && cause.message === "REMOTE_DEVICE_OFFLINE"
        ? "Este computador está offline. Peça ao cliente para ligá-lo e tente novamente."
        : "Não foi possível iniciar o acesso remoto neste computador.";
      return fail(409, { success: false, action: "start", message });
    }
  },
};
