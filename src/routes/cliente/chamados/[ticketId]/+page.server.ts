import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  getCustomerPortalTicket,
  replyCustomerPortalTicket,
} from "$lib/server/customerPortal/customerPortalRepository";
import { requireCustomerPortalSession } from "$lib/server/customerPortal/customerPortalSession";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Chamado não encontrado.");
  const layout = await parent();
  const details = await getCustomerPortalTicket(layout.customer.id, params.ticketId);
  if (!details) throw error(404, "Chamado não encontrado.");
  return { details };
};

export const actions: Actions = {
  reply: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, message: "Chamado não encontrado." });
    }

    const session = await requireCustomerPortalSession(cookies);
    const formData = await request.formData();
    const value = formData.get("body");
    const body = typeof value === "string" ? value.trim() : "";

    if (body.length < 1 || body.length > 4000) {
      return fail(400, {
        success: false,
        message: "A mensagem deve ter entre 1 e 4.000 caracteres.",
        body,
      });
    }

    try {
      await replyCustomerPortalTicket(session.contactId, params.ticketId, body);
      return { success: true, message: "Mensagem enviada." };
    } catch (cause) {
      if (cause instanceof Error && cause.message === "CUSTOMER_TICKET_CLOSED") {
        return fail(409, { success: false, message: "Este chamado já foi fechado." });
      }
      return fail(404, { success: false, message: "Não foi possível responder este chamado." });
    }
  },
};
