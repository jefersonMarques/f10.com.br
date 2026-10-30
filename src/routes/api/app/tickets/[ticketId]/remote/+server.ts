import { error, json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  listKnownRemoteDevicesForTicket,
  syncRemoteDevicesForTicket,
} from "$lib/server/remote/remoteDeviceEnrollmentRepository";
import { getMeshCentralControlStatus } from "$lib/server/remote/meshCentralControl";
import { getRemoteProviderStatus } from "$lib/server/remote/remoteSupportProvider";
import { getSupportTicket } from "$lib/server/support/supportRepository";

const TICKET_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const GET: RequestHandler = async ({ cookies, params }) => {
  const ticketId = params.ticketId ?? "";
  if (!TICKET_ID_PATTERN.test(ticketId)) throw error(404, "Ticket não encontrado.");

  const { session, permissions } = await requireAppPermission(
    cookies,
    "remote.request",
    `/app/tickets/${ticketId}/remote`,
  );

  let ticket;
  try {
    ticket = await getSupportTicket(session.user.id, permissions, ticketId);
  } catch {
    throw error(404, "Ticket não encontrado ou fora do seu escopo.");
  }

  const requiresCustomerLink = !ticket.ticket.customerContactId;
  const provider = getRemoteProviderStatus();
  const control = getMeshCentralControlStatus();
  let syncError = "";

  if (!requiresCustomerLink && provider.configured && control.configured) {
    try {
      await syncRemoteDevicesForTicket(ticketId);
    } catch {
      syncError = "Não foi possível atualizar os computadores agora.";
    }
  }

  const devices = requiresCustomerLink
    ? []
    : await listKnownRemoteDevicesForTicket(ticketId);

  return json({
    devices,
    requiresCustomerLink,
    providerConfigured: provider.configured,
    controlConfigured: control.configured,
    canUseRemote: hasPermission(permissions, "remote.use"),
    syncError,
  }, { headers: { "cache-control": "no-store" } });
};
