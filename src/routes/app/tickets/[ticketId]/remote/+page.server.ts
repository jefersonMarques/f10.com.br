import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getRemoteDevicesForTicket,
  requestRemoteSupport,
} from "$lib/server/remote/remoteSupportRepository";
import { getRemoteProviderStatus } from "$lib/server/remote/remoteSupportProvider";
import { getSupportTicket } from "$lib/server/support/supportRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ params, cookies }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Ticket não encontrado.");
  const { session, permissions } = await requireAppPermission(cookies, "remote.request", `/app/tickets/${params.ticketId}/remote`);
  let details;
  try { details = await getSupportTicket(session.user.id, permissions, params.ticketId); }
  catch { throw error(404, "Ticket não encontrado ou fora do seu escopo."); }
  return {
    ticket: details.ticket,
    devices: await getRemoteDevicesForTicket(params.ticketId),
    provider: getRemoteProviderStatus(),
  };
};

export const actions: Actions = {
  request: async ({ params, cookies, request, url }) => {
    if (!isUuid(params.ticketId)) return fail(404, { success: false, message: "Ticket não encontrado." });
    const provider = getRemoteProviderStatus();
    if (!provider.configured) {
      return fail(503, { success: false, message: "O MeshCentral ainda não está configurado para este ambiente." });
    }
    const { session, permissions } = await requireAppPermission(cookies, "remote.request", `/app/tickets/${params.ticketId}/remote`);
    try { await getSupportTicket(session.user.id, permissions, params.ticketId); }
    catch { return fail(404, { success: false, message: "Ticket fora do seu escopo." }); }
    const formData = await request.formData();
    const deviceId = readString(formData, "deviceId");
    if (!isUuid(deviceId)) return fail(400, { success: false, message: "Selecione um dispositivo válido." });
    try {
      const result = await requestRemoteSupport(session.user.id, params.ticketId, deviceId, url.origin);
      return { success: true, message: "Solicitação enviada ao cliente. A sessão ficará disponível após a autorização.", remoteSessionId: result.id };
    } catch {
      return fail(409, { success: false, message: "Não foi possível solicitar acesso. Verifique o vínculo do dispositivo com este cliente." });
    }
  },
};
