import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { recordCustomerActivity } from "$lib/server/customerPortal/customerActivityRepository";
import { createCustomerF10Ticket } from "$lib/server/customerPortal/customerF10TicketRepository";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { listPublicSupportChatEntryOptions } from "$lib/server/support/supportChatEntryRepository";

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readPositiveInteger(formData: FormData, name: string): number | null {
  const value = Number(readText(formData, name));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const session = await requireCustomerF10PortalSession(
    cookies,
    `${url.pathname}${url.search}`,
    false,
  );
  const entryOptions = await listPublicSupportChatEntryOptions();
  return {
    groups: session.groups,
    selectedGroupId: session.selectedGroupId,
    selectedUnitId: session.selectedUnitId,
    entryOptions,
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
    const groupId = readPositiveInteger(formData, "groupId");
    const unitId = readPositiveInteger(formData, "unitId");
    const entryOptionValue = readText(formData, "entryOptionId");
    const entryOptionId = entryOptionValue && isUuid(entryOptionValue) ? entryOptionValue : null;
    const subject = readText(formData, "subject");
    const message = readText(formData, "message");
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (groupId === null || unitId === null) {
      return fail(400, {
        success: false,
        message: "Selecione o grupo e a escola deste atendimento.",
        values: { groupId, unitId, entryOptionId: entryOptionValue, subject, message },
      });
    }
    if (subject.length < 3 || subject.length > 180) {
      return fail(400, {
        success: false,
        message: "Informe um assunto entre 3 e 180 caracteres.",
        values: { groupId, unitId, entryOptionId: entryOptionValue, subject, message },
      });
    }
    if (message.length < 1 || message.length > 10_000) {
      return fail(400, {
        success: false,
        message: "A descrição deve ter entre 1 e 10.000 caracteres.",
        values: { groupId, unitId, entryOptionId: entryOptionValue, subject, message },
      });
    }

    try {
      const ticket = await createCustomerF10Ticket(session, {
        groupId,
        unitId,
        entryOptionId,
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
      const messageText = errorCode === "CUSTOMER_TICKET_CONTEXT_NOT_AUTHORIZED"
        ? "A escola selecionada não está disponível para sua conta."
        : errorCode.startsWith("SUPPORT_ATTACHMENT_")
          ? "Revise os anexos. São aceitos PNG, JPG, WEBP e PDF, com até 10 MB por arquivo."
          : "Não foi possível abrir o chamado. Tente novamente.";
      return fail(errorCode === "CUSTOMER_TICKET_CONTEXT_NOT_AUTHORIZED" ? 403 : 409, {
        success: false,
        message: messageText,
        values: { groupId, unitId, entryOptionId: entryOptionValue, subject, message },
      });
    }
  },
};
