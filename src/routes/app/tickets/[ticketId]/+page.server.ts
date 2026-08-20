import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getPermissionScope,
  hasPermission,
  resolveUserPermissions,
} from "$lib/server/auth/permissions";
import { markEntityNotificationsRead } from "$lib/server/notifications/notificationRepository";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import { markTicketChatHumanTakeover } from "$lib/server/support/supportAiHandoff";
import { createTaskFromTicket, listTicketTasks } from "$lib/server/support/ticketTaskBridge";
import { getTicketCustomerContext } from "$lib/server/support/ticketCustomerContextRepository";
import { isTicketDueDate } from "$lib/server/support/ticketDueDate";
import {
  addTicketMessage,
  assignTicket,
  getSupportTicket,
  listSupportAgents,
  updateTicketDueOn,
  updateTicketPriority,
  updateTicketStatus,
  type TicketPriority,
  type TicketStatus,
} from "$lib/server/support/supportRepository";
import { listTaskProjects, type TaskPriority } from "$lib/server/tasks/taskRepository";

type MentionUser = { id: string; name: string; email: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readMentionedUserIds(formData: FormData): string[] {
  const raw = readFormValue(formData, "mentionedUserIds");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed.filter(
          (value): value is string => typeof value === "string" && isUuid(value),
        ),
      ),
    ).slice(0, 20);
  } catch {
    return [];
  }
}

async function filterMentionUsersForTicket(
  users: MentionUser[],
  ticketId: string,
): Promise<MentionUser[]> {
  const resolved = await Promise.all(
    users.map(async (user) => {
      const permissions = await resolveUserPermissions(user.id);
      const scope = getPermissionScope(permissions, "tickets.view");
      if (!scope) return null;
      try {
        await requireTicketAccess(user.id, scope, ticketId);
        return user;
      } catch {
        return null;
      }
    }),
  );
  return resolved.filter((user): user is MentionUser => Boolean(user));
}

async function validateMentionedUserIds(
  ticketId: string,
  requestedIds: string[],
): Promise<string[]> {
  if (requestedIds.length === 0) return [];
  const candidates = await listSupportAgents();
  const allowed = await filterMentionUsersForTicket(candidates, ticketId);
  const allowedIds = new Set(allowed.map((user) => user.id));
  return requestedIds.filter((id) => allowedIds.has(id));
}

function isTicketStatus(value: string): value is TicketStatus {
  return ["new", "open", "in_progress", "waiting_customer", "resolved", "closed"].includes(value);
}

function isTicketPriority(value: string): value is TicketPriority {
  return ["low", "normal", "high", "urgent"].includes(value);
}

function isTaskPriority(value: string): value is TaskPriority {
  return ["low", "normal", "high", "urgent"].includes(value);
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.ticketId)) throw error(404, "Ticket não encontrado.");

  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "tickets.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  try {
    const canReply = hasPermission(permissions, "tickets.reply");
    const canAssign = hasPermission(permissions, "tickets.assign");
    const canViewTasks = hasPermission(permissions, "tasks.view");
    const canCreateTask = canReply && hasPermission(permissions, "tasks.create");
    const [details, users, linkedTasks, taskProjects] = await Promise.all([
      getSupportTicket(layout.user.id, permissions, params.ticketId),
      canReply || canAssign ? listSupportAgents() : Promise.resolve([]),
      canViewTasks
        ? listTicketTasks(layout.user.id, permissions, params.ticketId)
        : Promise.resolve([]),
      canCreateTask
        ? listTaskProjects(layout.user.id, permissions).catch(() => [])
        : Promise.resolve([]),
    ]);
    const [mentionUsers, customerContext] = await Promise.all([
      canReply
        ? filterMentionUsersForTicket(users, params.ticketId)
        : Promise.resolve([]),
      getTicketCustomerContext(params.ticketId),
    ]);
    await markEntityNotificationsRead(layout.user.id, "ticket", params.ticketId);

    return {
      details,
      customerContext,
      agents: canAssign ? users : [],
      mentionUsers,
      linkedTasks,
      taskProjects,
      canReply,
      canAssign,
      canViewTasks,
      canCreateTask,
    };
  } catch {
    throw error(404, "Ticket não encontrado ou fora do seu escopo de acesso.");
  }
};

export const actions: Actions = {
  reply: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, message: "Ticket não encontrado." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/tickets/${params.ticketId}`,
    );
    const body = readFormValue(await request.formData(), "body");
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
      return { success: true, action: "reply", message: "Resposta registrada." };
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
      return fail(404, { success: false, message: "Ticket não encontrado." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/tickets/${params.ticketId}`,
    );
    const formData = await request.formData();
    const body = readFormValue(formData, "body");
    const requestedMentionIds = readMentionedUserIds(formData);
    if (body.length < 1 || body.length > 10000) {
      return fail(400, {
        success: false,
        action: "note",
        message: "A nota deve ter entre 1 e 10.000 caracteres.",
      });
    }
    try {
      const mentionedUserIds = await validateMentionedUserIds(
        params.ticketId,
        requestedMentionIds,
      );
      await addTicketMessage(
        session.user.id,
        permissions,
        params.ticketId,
        body,
        "internal",
        mentionedUserIds,
      );
      return {
        success: true,
        action: "note",
        message:
          mentionedUserIds.length > 0
            ? "Nota interna adicionada e menções notificadas."
            : "Nota interna adicionada.",
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
      return fail(404, { success: false, action: "status", message: "Ticket não encontrado." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/tickets/${params.ticketId}`,
    );
    const status = readFormValue(await request.formData(), "status");
    if (!isTicketStatus(status)) {
      return fail(400, { success: false, action: "status", message: "Status inválido." });
    }

    try {
      const details = await getSupportTicket(session.user.id, permissions, params.ticketId);
      if (details.ticket.channel === "web_chat" && status === "closed") {
        return fail(409, {
          success: false,
          action: "status",
          message: "Finalize o atendimento pela tela do Chat para encerrar sessão e automação juntas.",
        });
      }
      await updateTicketStatus(session.user.id, permissions, params.ticketId, status);
      return { success: true, action: "status", message: "Status atualizado." };
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
      return fail(404, { success: false, message: "Ticket não encontrado." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/tickets/${params.ticketId}`,
    );
    const priority = readFormValue(await request.formData(), "priority");
    if (!isTicketPriority(priority)) {
      return fail(400, { success: false, message: "Prioridade inválida." });
    }
    try {
      await updateTicketPriority(
        session.user.id,
        permissions,
        params.ticketId,
        priority,
      );
      return { success: true, action: "priority", message: "Prioridade atualizada." };
    } catch {
      return fail(403, {
        success: false,
        action: "priority",
        message: "Não foi possível alterar a prioridade deste ticket.",
      });
    }
  },

  dueOn: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, message: "Ticket não encontrado." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/tickets/${params.ticketId}`,
    );
    const dueOn = readFormValue(await request.formData(), "dueOn");
    if (!isTicketDueDate(dueOn)) {
      return fail(400, {
        success: false,
        action: "dueOn",
        message: "Informe uma data de conclusão planejada válida.",
      });
    }
    try {
      await updateTicketDueOn(
        session.user.id,
        permissions,
        params.ticketId,
        dueOn,
      );
      return {
        success: true,
        action: "dueOn",
        message: "Conclusão planejada atualizada.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "dueOn",
        message: "Não foi possível alterar a conclusão planejada deste ticket.",
      });
    }
  },

  assign: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, { success: false, message: "Ticket não encontrado." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.assign",
      `/app/tickets/${params.ticketId}`,
    );
    const assignedUserId = readFormValue(await request.formData(), "assignedUserId");
    if (!isUuid(assignedUserId)) {
      return fail(400, { success: false, message: "Responsável inválido." });
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
      return { success: true, action: "assign", message: "Responsável atualizado." };
    } catch {
      return fail(403, {
        success: false,
        action: "assign",
        message: "Não foi possível atribuir este ticket.",
      });
    }
  },

  createTask: async ({ cookies, params, request }) => {
    if (!isUuid(params.ticketId)) {
      return fail(404, {
        success: false,
        action: "createTask",
        message: "Ticket não encontrado.",
      });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tasks.create",
      `/app/tickets/${params.ticketId}`,
    );
    const formData = await request.formData();
    const projectId = readFormValue(formData, "projectId");
    const title = readFormValue(formData, "title");
    const description = readFormValue(formData, "description");
    const priority = readFormValue(formData, "priority");
    const dueOn = readFormValue(formData, "dueOn") || null;

    if (
      !isUuid(projectId) ||
      title.length < 2 ||
      title.length > 180 ||
      !isTaskPriority(priority)
    ) {
      return fail(400, {
        success: false,
        action: "createTask",
        message: "Revise projeto, título e prioridade da tarefa.",
      });
    }
    if (
      description.length > 5000 ||
      (dueOn && !/^\d{4}-\d{2}-\d{2}$/.test(dueOn))
    ) {
      return fail(400, {
        success: false,
        action: "createTask",
        message: "Descrição ou prazo da tarefa inválido.",
      });
    }

    try {
      const task = await createTaskFromTicket(
        session.user.id,
        permissions,
        params.ticketId,
        {
          projectId,
          title,
          description,
          priority,
          dueOn,
          assigneeId: null,
        },
      );
      return {
        success: true,
        action: "createTask",
        message: `Tarefa “${task.title}” criada e vinculada ao ticket.`,
      };
    } catch {
      return fail(403, {
        success: false,
        action: "createTask",
        message: "Não foi possível criar a tarefa neste projeto.",
      });
    }
  },
};
