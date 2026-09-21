import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { recordCustomerActivity } from "$lib/server/customerPortal/customerActivityRepository";
import {
  getCustomerF10Ticket,
  replyCustomerF10Ticket,
} from "$lib/server/customerPortal/customerF10TicketRepository";
import type { CustomerF10PortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";
import { requireCustomerTicketPortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { parseServiceRequestUpdateForm } from "$lib/server/serviceRequests/serviceRequestForm";
import {
  getTicketSatisfaction,
  submitTicketSatisfactionForCustomer,
} from "$lib/server/support/ticketSatisfactionService";
import {
  getCustomerServiceRequestForTicket,
  updateCustomerServiceRequest,
} from "$lib/server/serviceRequests/serviceRequestOperations";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ params, cookies, url }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Chamado não encontrado.");
  const session = await requireCustomerTicketPortalSession(
    cookies,
    `${url.pathname}${url.search}`,
  );
  const details = await getCustomerF10Ticket(session, params.ticketId);
  if (!details) throw error(404, "Chamado não encontrado.");
  const [serviceRequest, satisfaction] = await Promise.all([
    session.authProvider === "f10"
      ? getCustomerServiceRequestForTicket(session as CustomerF10PortalSession, params.ticketId)
      : Promise.resolve(null),
    getTicketSatisfaction(params.ticketId),
  ]);
  await recordCustomerActivity(session, {
    eventType: "ticket.detail.view",
    source: "customer_portal",
    path: url.pathname,
    metadata: { ticketId: params.ticketId, ticketNumber: details.ticket.ticketNumber },
  }).catch(() => undefined);
  return { details, serviceRequest, satisfaction };
};

export const actions: Actions = {
  reply: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, message: "Chamado não encontrado." });
    }

    const session = await requireCustomerTicketPortalSession(
      cookies,
      `/cliente/chamados/${params.ticketId}`,
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
      if (cause instanceof Error && cause.message.startsWith("ASSET_STORAGE_")) {
        return fail(503, {
          success: false,
          message: "O envio de anexos está temporariamente indisponível. Remova os arquivos e tente novamente.",
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

  satisfaction: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, action: "satisfaction", message: "Chamado não encontrado." });
    }

    const session = await requireCustomerTicketPortalSession(
      cookies,
      `/cliente/chamados/${params.ticketId}`,
    );
    const ticket = await getCustomerF10Ticket(session, params.ticketId);
    if (!ticket) {
      return fail(404, { success: false, action: "satisfaction", message: "Chamado não encontrado." });
    }

    const formData = await request.formData();
    const score = Number(formData.get("score"));
    const commentValue = formData.get("comment");
    const comment = typeof commentValue === "string" ? commentValue : "";

    try {
      const submitted = await submitTicketSatisfactionForCustomer({
        ticketId: params.ticketId,
        customerContactId: session.contactId,
        score,
        comment,
      });
      if (!submitted) {
        return fail(409, {
          success: false,
          action: "satisfaction",
          message: "Esta avaliação já foi respondida ou não está mais disponível.",
        });
      }
      return {
        success: true,
        action: "satisfaction",
        message: "Obrigado pela sua avaliação.",
      };
    } catch {
      return fail(400, {
        success: false,
        action: "satisfaction",
        message: "Escolha uma nota de 1 a 5 e tente novamente.",
      });
    }
  },

  updateServiceRequest: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, {
        success: false,
        action: "updateServiceRequest",
        message: "Solicitação não encontrada.",
      });
    }

    const session = await requireCustomerTicketPortalSession(
      cookies,
      `/cliente/chamados/${params.ticketId}`,
      false,
    );
    if (session.authProvider !== "f10") {
      return fail(403, {
        success: false,
        action: "updateServiceRequest",
        message: "Entre com o acesso do sistema F10 para alterar os dados estruturados desta solicitação.",
      });
    }

    const ticket = await getCustomerF10Ticket(session, params.ticketId);
    if (!ticket) {
      return fail(404, {
        success: false,
        action: "updateServiceRequest",
        message: "Solicitação não encontrada.",
      });
    }

    try {
      const input = parseServiceRequestUpdateForm(await request.formData());
      await updateCustomerServiceRequest(session as CustomerF10PortalSession, params.ticketId, input);
      await recordCustomerActivity(session, {
        eventType: "service_request.updated",
        source: "customer_portal",
        path: `/cliente/chamados/${params.ticketId}`,
        metadata: { ticketId: params.ticketId },
      }).catch(() => undefined);
      return {
        success: true,
        action: "updateServiceRequest",
        message: "Dados da solicitação atualizados. A equipe F10 foi avisada.",
      };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "SERVICE_REQUEST_UPDATE_FAILED";
      if (code === "SERVICE_REQUEST_NO_CHANGES") {
        return {
          success: true,
          action: "updateServiceRequest",
          message: "Nenhuma alteração foi identificada.",
        };
      }
      if (code === "SERVICE_REQUEST_VERSION_CONFLICT") {
        return fail(409, {
          success: false,
          action: "updateServiceRequest",
          message: "Os dados foram alterados em outra sessão. Atualize a página e revise antes de salvar novamente.",
        });
      }
      if (code === "SERVICE_REQUEST_DELAY_ACK_REQUIRED") {
        return fail(400, {
          success: false,
          action: "updateServiceRequest",
          message: "Confirme o aviso de prazo antes de salvar as alterações.",
        });
      }
      if (code === "SERVICE_REQUEST_TICKET_CLOSED") {
        return fail(409, {
          success: false,
          action: "updateServiceRequest",
          message: "Este chamado está fechado e não aceita alterações.",
        });
      }
      if (code === "SERVICE_REQUEST_SECRET_KEY_NOT_CONFIGURED") {
        return fail(503, {
          success: false,
          action: "updateServiceRequest",
          message: "A alteração de credenciais está temporariamente indisponível.",
        });
      }
      return fail(code.startsWith("SERVICE_REQUEST_") ? 400 : 500, {
        success: false,
        action: "updateServiceRequest",
        message: "Revise os dados informados e tente novamente.",
      });
    }
  },
};
