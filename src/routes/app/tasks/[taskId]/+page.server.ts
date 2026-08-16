import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { markEntityNotificationsRead } from "$lib/server/notifications/notificationRepository";
import { listTaskTicketOrigins } from "$lib/server/support/ticketTaskBridge";
import {
  addTaskComment,
  assignTask,
  getTaskDetails,
  updateTaskDetails,
  type TaskPriority,
} from "$lib/server/tasks/taskRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
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
      new Set(parsed.filter((value): value is string => typeof value === "string" && isUuid(value))),
    ).slice(0, 20);
  } catch {
    return [];
  }
}

function isTaskPriority(value: string): value is TaskPriority {
  return value === "low" || value === "normal" || value === "high" || value === "urgent";
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.taskId)) {
    throw error(404, "Tarefa não encontrada.");
  }

  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "tasks.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  try {
    const [details, ticketOrigins] = await Promise.all([
      getTaskDetails(layout.user.id, permissions, params.taskId),
      hasPermission(permissions, "tickets.view")
        ? listTaskTicketOrigins(params.taskId)
        : Promise.resolve([]),
    ]);
    await markEntityNotificationsRead(layout.user.id, "task", params.taskId);

    return {
      details,
      ticketOrigins,
      canUpdate: hasPermission(permissions, "tasks.update"),
      canAssign: hasPermission(permissions, "tasks.assign"),
    };
  } catch {
    throw error(404, "Tarefa não encontrada ou fora do seu escopo de acesso.");
  }
};

export const actions: Actions = {
  update: async ({ cookies, params, request }) => {
    if (!isUuid(params.taskId)) {
      return fail(404, { success: false, message: "Tarefa não encontrada." });
    }

    const { session, permissions } = await requireAppPermission(
      cookies,
      "tasks.update",
      `/app/tasks/${params.taskId}`,
    );
    const formData = await request.formData();
    const title = readFormValue(formData, "title");
    const description = readFormValue(formData, "description");
    const priority = readFormValue(formData, "priority");
    const dueOn = readFormValue(formData, "dueOn");

    if (title.length < 3 || title.length > 180) {
      return fail(400, {
        success: false,
        action: "update",
        message: "Informe um título entre 3 e 180 caracteres.",
      });
    }

    if (description.length > 5000) {
      return fail(400, {
        success: false,
        action: "update",
        message: "A descrição deve ter no máximo 5.000 caracteres.",
      });
    }

    if (!isTaskPriority(priority) || (dueOn && !isValidDate(dueOn))) {
      return fail(400, {
        success: false,
        action: "update",
        message: "Prioridade ou prazo inválido.",
      });
    }

    try {
      await updateTaskDetails(session.user.id, permissions, params.taskId, {
        title,
        description,
        priority,
        dueOn: dueOn || null,
      });

      return { success: true, action: "update", message: "Tarefa atualizada." };
    } catch {
      return fail(403, { success: false, action: "update", message: "Você não pode alterar esta tarefa." });
    }
  },

  assign: async ({ cookies, params, request }) => {
    if (!isUuid(params.taskId)) return fail(404, { success: false, message: "Tarefa não encontrada." });
    const { session, permissions } = await requireAppPermission(cookies, "tasks.assign", `/app/tasks/${params.taskId}`);
    const assigneeId = readFormValue(await request.formData(), "assigneeId");
    if (!isUuid(assigneeId)) return fail(400, { success: false, action: "assign", message: "Responsável inválido." });
    try {
      await assignTask(session.user.id, permissions, params.taskId, assigneeId);
      return { success: true, action: "assign", message: "Responsável atualizado." };
    } catch {
      return fail(403, { success: false, action: "assign", message: "Você não pode atribuir esta tarefa a esse integrante." });
    }
  },

  comment: async ({ cookies, params, request }) => {
    if (!isUuid(params.taskId)) return fail(404, { success: false, message: "Tarefa não encontrada." });
    const { session, permissions } = await requireAppPermission(cookies, "tasks.update", `/app/tasks/${params.taskId}`);
    const formData = await request.formData();
    const body = readFormValue(formData, "body");
    const mentionedUserIds = readMentionedUserIds(formData);
    if (body.length < 1 || body.length > 5000) return fail(400, { success: false, action: "comment", message: "O comentário deve ter entre 1 e 5.000 caracteres." });
    try {
      await addTaskComment(session.user.id, permissions, params.taskId, body, mentionedUserIds);
      return { success: true, action: "comment", message: mentionedUserIds.length > 0 ? "Comentário adicionado e menções notificadas." : "Comentário adicionado." };
    } catch {
      return fail(403, { success: false, action: "comment", message: "Você não pode comentar nesta tarefa." });
    }
  },
};
