import {
  error,
  fail,
  redirect,
  type Actions,
} from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createManualTicket,
  listSupportQueues,
  listSupportTickets,
  updateTicketStatus,
  type TicketPriority,
  type TicketStatus,
} from "$lib/server/support/supportRepository";
import { listTicketCustomerContexts } from "$lib/server/support/ticketCustomerContextRepository";

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isTicketPriority(value: string): value is TicketPriority {
  return value === "low" || value === "normal" || value === "high" || value === "urgent";
}

function isTicketStatus(value: string): value is TicketStatus {
  return (
    value === "new" ||
    value === "open" ||
    value === "in_progress" ||
    value === "waiting_customer" ||
    value === "resolved" ||
    value === "closed"
  );
}

function createPermissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(
    permissions.map((permission) => [permission.code, permission.scope]),
  );
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissionMap = createPermissionMap(layout.permissions);

  if (!hasPermission(permissionMap, "tickets.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const canCreate = hasPermission(permissionMap, "tickets.create");
  const canReply = hasPermission(permissionMap, "tickets.reply");
  const [tickets, queues] = await Promise.all([
    listSupportTickets(layout.user.id, permissionMap),
    canCreate ? listSupportQueues() : Promise.resolve([]),
  ]);
  const contexts = await listTicketCustomerContexts(tickets.map((ticket) => ticket.id));
  const contextByTicket = new Map(contexts.map((context) => [context.ticketId, context]));

  return {
    tickets: tickets.map((ticket) => ({
      ...ticket,
      customerContext: contextByTicket.get(ticket.id) ?? null,
    })),
    queues,
    currentUserId: layout.user.id,
    canCreate,
    canReply,
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.create",
      "/app/tickets",
    );
    const formData = await request.formData();
    const subject = readFormValue(formData, "subject");
    const message = readFormValue(formData, "message");
    const priority = readFormValue(formData, "priority");
    const customerName = readFormValue(formData, "customerName");
    const customerEmail = readFormValue(formData, "customerEmail").toLowerCase();
    const customerPhone = readFormValue(formData, "customerPhone");
    const organizationName = readFormValue(formData, "organizationName");
    const queueId = readFormValue(formData, "queueId");

    if (subject.length < 3 || subject.length > 180) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Informe um assunto entre 3 e 180 caracteres.",
      });
    }

    if (message.length < 1 || message.length > 10000) {
      return fail(400, {
        success: false,
        action: "create",
        message: "A descrição do atendimento deve ter entre 1 e 10.000 caracteres.",
      });
    }

    if (customerName.length < 2 || customerName.length > 120) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Informe o nome do cliente entre 2 e 120 caracteres.",
      });
    }

    if (organizationName.length > 160) {
      return fail(400, {
        success: false,
        action: "create",
        message: "O nome da escola ou empresa deve ter no máximo 160 caracteres.",
      });
    }

    if (customerEmail.length > 254 || customerPhone.length > 40) {
      return fail(400, {
        success: false,
        action: "create",
        message: "E-mail ou telefone do cliente excede o tamanho permitido.",
      });
    }

    if (!queueId) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Selecione uma fila de atendimento.",
      });
    }

    if (!isTicketPriority(priority)) {
      return fail(400, {
        success: false,
        action: "create",
        message: "Prioridade inválida.",
      });
    }

    try {
      const ticket = await createManualTicket(session.user.id, permissions, {
        subject,
        message,
        priority,
        customerName,
        customerEmail,
        customerPhone,
        organizationName,
        queueId,
      });

      throw redirect(303, `/app/tickets/${ticket.id}`);
    } catch (cause) {
      if (cause instanceof Response && cause.status >= 300 && cause.status < 400) throw cause;
      return fail(403, {
        success: false,
        action: "create",
        message: "Não foi possível criar o ticket com os dados informados.",
      });
    }
  },

  moveStatus: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      "/app/tickets",
    );
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const status = readFormValue(formData, "status");

    if (!isUuid(ticketId) || !isTicketStatus(status)) {
      return fail(400, {
        success: false,
        action: "moveStatus",
        message: "Ticket ou status inválido.",
      });
    }

    try {
      await updateTicketStatus(session.user.id, permissions, ticketId, status);
      return { success: true, action: "moveStatus", message: "Status atualizado." };
    } catch {
      return fail(403, {
        success: false,
        action: "moveStatus",
        message: "Não foi possível mover este ticket.",
      });
    }
  },
};
