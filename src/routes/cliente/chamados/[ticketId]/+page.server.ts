import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { recordCustomerActivity } from "$lib/server/customerPortal/customerActivityRepository";
import {
  getCustomerF10Ticket,
  replyCustomerF10Ticket,
} from "$lib/server/customerPortal/customerF10TicketRepository";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ params, cookies, url }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Chamado não encontrado.");
  const session = await requireCustomerF10PortalSession(
    cookies,
    `${url.pathname}${url.search}`,
    false,
  );
  const details = await getCustomerF10Ticket(session, params.ticketId);
  if (!details) throw error(404, "Chamado não encontrado.");
  await recordCustomerActivity(session, {
    eventType: "ticket.detail.view",
    source: "customer_portal",
    path: url.pathname,
    metadata: { ticketId: params.ticketId, ticketNumber: details.ticket.ticketNumber },
  }).catch(() => undefined);
  return { details };
};

export const actions: Actions = {
  reply: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, message: "Chamado não encontrado." });
    }

    const session = await requireCustomerF10PortalSession(
      cookies,
      `/cliente/chamados/${params.ticketId}`,
      false,
    );
    const formData = await request.formData();
    const value = formData.get("body");
    const body = typeof value === "string" ? value.trim() : "";
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (body.length > 4000 || (body.length < 1 && files.length === 0)) {
      return fail(400, {
        success: false,
        message: "Escreva uma mensagem ou adicione um anexo. O texto pode ter até 4.000 caracteres.",
        body,
      });
    }

    try {
      await replyCustomerF10Ticket(session, params.ticketId, body, files);
      await recordCustomerActivity(session, {
        eventType: "ticket.reply",
        source: "customer_portal",
        path: `/cliente/chamados/${params.ticketId}`,
        metadata: {
          ticketId: params.ticketId,
          bodyLength: body.length,
          attachmentCount: files.length,
        },
      }).catch(() => undefined);
      return { success: true, message: "Mensagem enviada." };
    } catch (cause) {
      if (cause instanceof Error && cause.message === "CUSTOMER_TICKET_CLOSED") {
        return fail(409, { success: false, message: "Este chamado já foi fechado." });
      }
      if (cause instanceof Error && cause.message.startsWith("SUPPORT_ATTACHMENT_")) {
        return fail(400, {
          success: false,
          message: "Revise os anexos. São aceitos PNG, JPG, WEBP e PDF, com até 10 MB por arquivo.",
          body,
        });
      }
      return fail(404, {
        success: false,
        message: "Não foi possível responder este chamado.",
        body,
      });
    }
  },
};
