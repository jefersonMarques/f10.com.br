import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { recordCustomerActivity } from "$lib/server/customerPortal/customerActivityRepository";
import {
  canUseGlobalCustomerContext,
  createCustomerF10Ticket,
} from "$lib/server/customerPortal/customerF10TicketRepository";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInteger(formData: FormData, name: string): number | null {
  const value = Number(readText(formData, name));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function isIntakeConfigurationError(errorCode: string): boolean {
  return [
    "CUSTOMER_PORTAL_GLOBAL_WORKFLOW_NOT_CONFIGURED",
    "CUSTOMER_PORTAL_INITIAL_STAGE_NOT_CONFIGURED",
    "CUSTOMER_PORTAL_SUPPORT_QUEUE_NOT_CONFIGURED",
    "CUSTOMER_PORTAL_MAIN_WORKFLOW_NOT_CONFIGURED",
    "CUSTOMER_PORTAL_NEW_STAGE_NOT_CONFIGURED",
  ].includes(errorCode);
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session = await requireCustomerF10PortalSession(
    cookies,
    `${url.pathname}${url.search}`,
    false,
  );
  return {
    groups: session.groups,
    selectedGroupId: session.selectedGroupId,
    selectedUnitId: session.selectedUnitId,
    allowGlobalContext: canUseGlobalCustomerContext(session),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const session = await requireCustomerF10PortalSession(
      cookies,
      "/cliente/chamados/novo",
      false,
    );
    const formData = await request.formData();
    const scope = readText(formData, "globalContext") === "on" ? "global" as const : "unit" as const;
    const groupId = scope === "unit" ? readPositiveInteger(formData, "groupId") : null;
    const unitId = scope === "unit" ? readPositiveInteger(formData, "unitId") : null;
    const subject = readText(formData, "subject");
    const message = readText(formData, "message");
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);
    const values = { scope, groupId, unitId, subject, message };

    if (scope === "global" && !canUseGlobalCustomerContext(session)) {
      return fail(403, {
        success: false,
        message: "A opção Global não está disponível para esta conta.",
        values,
      });
    }
    if (scope === "unit" && (groupId === null || unitId === null)) {
      return fail(400, {
        success: false,
        message: "Selecione o grupo e a escola deste atendimento.",
        values,
      });
    }
    if (subject.length < 3 || subject.length > 180) {
      return fail(400, {
        success: false,
        message: "Informe um assunto entre 3 e 180 caracteres.",
        values,
      });
    }
    if (message.length < 1 || message.length > 10_000) {
      return fail(400, {
        success: false,
        message: "A descrição deve ter entre 1 e 10.000 caracteres.",
        values,
      });
    }

    try {
      const ticket = await createCustomerF10Ticket(session, {
        scope,
        groupId,
        unitId,
        subject,
        message,
        files,
      });
      await recordCustomerActivity(session, {
        eventType: "ticket.portal.created",
        source: "customer_portal",
        path: "/cliente/chamados/novo",
        metadata: {
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          contextScope: scope,
          groupId,
          unitId,
          attachmentCount: files.length,
        },
      }).catch(() => undefined);
      throw redirect(303, `/cliente/chamados/${ticket.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) {
        throw cause;
      }
      const errorCode = cause instanceof Error ? cause.message : "";
      const configurationError = isIntakeConfigurationError(errorCode);
      const messageText = errorCode === "CUSTOMER_TICKET_CONTEXT_NOT_AUTHORIZED"
        ? "A escola selecionada não está disponível para sua conta."
        : errorCode === "CUSTOMER_TICKET_GLOBAL_CONTEXT_NOT_ALLOWED"
          ? "A opção Global não está disponível para esta conta."
          : configurationError
            ? "Não foi possível iniciar o fluxo deste chamado. Tente novamente em instantes."
            : errorCode.startsWith("SUPPORT_ATTACHMENT_")
              ? "Revise os anexos. São aceitos PNG, JPG, WEBP e PDF, com até 10 MB por arquivo."
              : errorCode.startsWith("ASSET_STORAGE_")
                ? "O envio de anexos está temporariamente indisponível. Remova os arquivos e tente novamente."
                : "Não foi possível abrir o chamado. Tente novamente.";
      const status = errorCode === "CUSTOMER_TICKET_CONTEXT_NOT_AUTHORIZED" ||
          errorCode === "CUSTOMER_TICKET_GLOBAL_CONTEXT_NOT_ALLOWED"
        ? 403
        : configurationError
          ? 503
          : 409;
      return fail(status, {
        success: false,
        message: messageText,
        values,
      });
    }
  },
};
