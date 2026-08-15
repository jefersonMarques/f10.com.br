import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { markTicketChatHumanTakeover } from "$lib/server/support/supportAiHandoff";
import {
  addTicketMessage,
  assignTicket,
  getSupportTicket,
  listSupportAgents,
  updateTicketPriority,
  updateTicketStatus,
  type TicketPriority,
  type TicketStatus,
} from "$lib/server/support/supportRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
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

function isTicketPriority(value: string): value is TicketPriority {
  return (
    value === "low" ||
    value === "normal" ||
    value === "high" ||
    value === "urgent"
  );
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.ticketId)) {
    throw error(404, "Ticket não encontrado.");
  }

  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "tickets.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  try {
    const canAssign = hasPermission(permissions, "tickets.assign");

    return {
      details: await getSupportTicket(
        layout.user.id,
        permissions,
        params.ticketId,
      ),
      agents: canAssign ? await listSupportAgents() : [],
      canReply: hasPermission(permissions, "tickets.reply"),
      canAssign,
    };
  } catch {
    throw error(
      404,
      "Ticket não encontrado ou fora do seu escopo de acesso.",
    );
  }
};

export const actions: Actions = {
  reply: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, {
        success: false,
        message: "Ticket não encontrado.",
      });
    }

    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/tickets/${params.ticketId}`,
    );
    const formData = await request.formData();
    const body = readFormValue(formData, "body");

    if (body.length < 1 || body.length > 10000) {
      return fail(400, {
        success: false,
        action: "reply",
        message: "A resposta deve ter entre 1 e 10.000 caracteres.",
      });
    }

    try {
      await addTicketMessage(
        session.user.id,
        permissions,
        params.ticketId,
        body,
        "public",
      );
      await markTicketChatHumanTakeover(
        params.ticketId,
        session.user.id,
        "Atendente respondeu pelo ticket.",
      );
      return {
        success: true,
        action: "reply",
        message: "Resposta registrada.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "reply",
        message: "Não foi possível responder este ticket.",
      });
    }
  },

  note: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, {
        success: false,
        message: "Ticket não encontrado.",
      });
    }

    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/tickets/${params.ticketId}`,
    );
    const formData = await request.formData();
    const body = readFormValue(formData, "body");

    if (body.length < 1 || body.length > 10000) {
      return fail(400, {
        success: false,
        action: "note",
        message: "A nota deve ter entre 1 e 10.000 caracteres.",
      });
    }

    try {
      await addTicketMessage(
        session.user.id,
        permissions,
        params.ticketId,
        body,
        "internal",
      );
      return {
        success: true,
        action: "note",
        message: "Nota interna adicionada.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "note",
        message: "Não foi possível adicionar a nota interna.",
      });
    }
  },

  status: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, {
        success: false,
        message: "Ticket não encontrado.",
      });
    }

    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/tickets/${params.ticketId}`,
    );
    const formData = await request.formData();
    const status = readFormValue(formData, "status");

    if (!isTicketStatus(status)) {
      return fail(400, { success: false, message: "Status inválido." });
    }

    try {
      await updateTicketStatus(
        session.user.id,
        permissions,
        params.ticketId,
        status,
      );
      return {
        success: true,
        action: "status",
        message: "Status atualizado.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "status",
        message: "Não foi possível alterar o status deste ticket.",
      });
    }
  },

  priority: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, {
        success: false,
        message: "Ticket não encontrado.",
      });
    }

    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/tickets/${params.ticketId}`,
    );
    const formData = await request.formData();
    const priority = readFormValue(formData, "priority");

    if (!isTicketPriority(priority)) {
      return fail(400, {
        success: false,
        message: "Prioridade inválida.",
      });
    }

    try {
      await updateTicketPriority(
        session.user.id,
        permissions,
        params.ticketId,
        priority,
      );
      return {
        success: true,
        action: "priority",
        message: "Prioridade atualizada.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "priority",
        message: "Não foi possível alterar a prioridade deste ticket.",
      });
    }
  },

  assign: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, {
        success: false,
        message: "Ticket não encontrado.",
      });
    }

    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.assign",
      `/app/tickets/${params.ticketId}`,
    );
    const formData = await request.formData();
    const assignedUserId = readFormValue(formData, "assignedUserId");

    if (!isUuid(assignedUserId)) {
      return fail(400, {
        success: false,
        message: "Responsável inválido.",
      });
    }

    try {
      await assignTicket(
        session.user.id,
        permissions,
        params.ticketId,
        assignedUserId,
      );
      await markTicketChatHumanTakeover(
        params.ticketId,
        session.user.id,
        "Ticket atribuído a um atendente humano.",
      );
      return {
        success: true,
        action: "assign",
        message: "Responsável atualizado.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "assign",
        message: "Não foi possível atribuir este ticket.",
      });
    }
  },
};
