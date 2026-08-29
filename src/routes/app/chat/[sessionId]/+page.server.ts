import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getPermissionScope,
  hasPermission,
  resolveUserPermissions,
} from "$lib/server/auth/permissions";
import { markEntityNotificationsRead } from "$lib/server/notifications/notificationRepository";
import {
  createKnownDeviceRemoteSession,
  createRemoteDeviceEnrollment,
  listKnownRemoteDevicesForTicket,
  syncRemoteDevicesForTicket,
} from "$lib/server/remote/remoteDeviceEnrollmentRepository";
import { getMeshCentralControlStatus } from "$lib/server/remote/meshCentralControl";
import { getRemoteProviderStatus } from "$lib/server/remote/remoteSupportProvider";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import { finishInternalChat } from "$lib/server/support/chatLifecycleRepository";
import {
  listInternalChatConversationMessages,
  listInternalChatRelatedTickets,
} from "$lib/server/support/internalChatConversationRepository";
import { createTicketFromChat } from "$lib/server/support/chatTicketBridge";
import {
  assignInternalChat,
  claimInternalChat,
  listChatAssignees,
  listInternalChatMessages,
} from "$lib/server/support/internalChatRepository";
import {
  addInternalChatNote,
  listInternalChatMentionUsers,
} from "$lib/server/support/internalChatNoteRepository";
import {
  addTicketMessage,
  listSupportAgents,
  updateTicketPriority,
  updateTicketStatus,
  type TicketPriority,
  type TicketStatus,
} from "$lib/server/support/supportRepository";
import { createTaskFromTicket, listTicketTasks } from "$lib/server/support/ticketTaskBridge";
import { listTaskProjects, type TaskPriority } from "$lib/server/tasks/taskRepository";

type MentionUser = { id: string; name: string; email: string };

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readMentionedUserIds(formData: FormData): string[] {
  const raw = readString(formData, "mentionedUserIds");
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

function requireLinkedTicket(ticketId: string | null): string {
  if (!ticketId) throw new Error("CHAT_TICKET_REQUIRED");
  return ticketId;
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.sessionId)) throw error(404, "Conversa não encontrada.");

  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );

  if (!hasPermission(permissions, "chat.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  try {
    const [initial, relatedTickets] = await Promise.all([
      listInternalChatConversationMessages(
        layout.user.id,
        permissions,
        params.sessionId,
        { limit: 40 },
      ),
      listInternalChatRelatedTickets(layout.user.id, permissions, params.sessionId),
    ]);
    const ticketId = initial.chat.ticketId;
    const hasTicket = Boolean(ticketId);
    const canRespond = hasPermission(permissions, "chat.respond");
    const canCreateTicket = !hasTicket && hasPermission(permissions, "tickets.create");
    const canManageTicket = hasTicket && hasPermission(permissions, "tickets.reply");
    const canInternalNote = hasTicket ? canManageTicket : canRespond;
    const canAssign = hasPermission(permissions, "chat.manage") || hasPermission(permissions, "tickets.assign");
    const canViewTasks = hasTicket && hasPermission(permissions, "tasks.view");
    const canCreateTask = canManageTicket && hasPermission(permissions, "tasks.create");
    const canRequestRemote = hasTicket && hasPermission(permissions, "remote.request");
    const canUseRemote = hasTicket && hasPermission(permissions, "remote.use");
    const provider = getRemoteProviderStatus();
    const control = getMeshCentralControlStatus();
    const remoteVisible = canRequestRemote || canUseRemote;

    const [assignees, supportAgents, linkedTasks, taskProjects] = await Promise.all([
      canAssign ? listChatAssignees() : Promise.resolve([]),
      canManageTicket ? listSupportAgents() : Promise.resolve([]),
      canViewTasks && ticketId
        ? listTicketTasks(layout.user.id, permissions, ticketId)
        : Promise.resolve([]),
      canCreateTask
        ? listTaskProjects(layout.user.id, permissions).catch(() => [])
        : Promise.resolve([]),
    ]);
    const mentionUsers = !canInternalNote
      ? []
      : ticketId
        ? await filterMentionUsersForTicket(supportAgents, ticketId)
        : await listInternalChatMentionUsers(layout.user.id, permissions, params.sessionId);

    if (remoteVisible && provider.configured && control.configured && ticketId) {
      try {
        await syncRemoteDevicesForTicket(ticketId);
      } catch {
        // O chat continua funcional mesmo se a infraestrutura remota estiver indisponível.
      }
    }

    await markEntityNotificationsRead(
      layout.user.id,
      ticketId ? "ticket" : "chat",
      ticketId ?? params.sessionId,
    ).catch(() => undefined);

    return {
      initial,
      relatedTickets,
      currentUserId: layout.user.id,
      canRespond,
      canCreateTicket,
      canManageTicket,
      canInternalNote,
      canAssign,
      assignees,
      mentionUsers,
      canViewTasks,
      canCreateTask,
      linkedTasks,
      taskProjects,
      canRequestRemote,
      canUseRemote,
      remoteDevices: remoteVisible && ticketId
        ? await listKnownRemoteDevicesForTicket(ticketId)
        : [],
      remoteReady: hasTicket && provider.configured && control.configured,
    };
  } catch {
    throw error(404, "Conversa não encontrada ou fora do seu escopo.");
  }
};

export const actions: Actions = {
  claim: async ({ params, cookies }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "claim", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "chat.respond",
      `/app/chat/${params.sessionId}`,
    );
    try {
      await claimInternalChat(session.user.id, permissions, params.sessionId);
      return { success: true, action: "claim", message: "Atendimento assumido por você." };
    } catch (cause) {
      return fail(409, {
        success: false,
        action: "claim",
        message:
          cause instanceof Error && cause.message === "CHAT_ALREADY_ASSIGNED"
            ? "Este atendimento já foi assumido por outra pessoa."
            : "Não foi possível assumir este atendimento.",
      });
    }
  },

  finish: async ({ params, cookies }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "finish", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "chat.respond",
      `/app/chat/${params.sessionId}`,
    );
    try {
      await finishInternalChat(session.user.id, permissions, params.sessionId);
      return { success: true, action: "finish", message: "Atendimento finalizado." };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      if (message === "CHAT_ASSIGNED_TO_OTHER_USER") {
        return fail(409, {
          success: false,
          action: "finish",
          message: "Este atendimento está atribuído a outro usuário.",
        });
      }
      if (message === "CHAT_NOT_FOUND") {
        return fail(404, {
          success: false,
          action: "finish",
          message: "Conversa não encontrada ou já finalizada.",
        });
      }
      return fail(403, {
        success: false,
        action: "finish",
        message: "Não foi possível finalizar este atendimento.",
      });
    }
  },

  assign: async ({ params, cookies, request }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "assign", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "chat.view",
      `/app/chat/${params.sessionId}`,
    );
    const targetUserId = readString(await request.formData(), "assignedUserId");
    if (!isUuid(targetUserId)) {
      return fail(400, { success: false, action: "assign", message: "Selecione um atendente válido." });
    }
    try {
      await assignInternalChat(session.user.id, permissions, params.sessionId, targetUserId);
      return { success: true, action: "assign", message: "Atendimento atribuído." };
    } catch {
      return fail(409, {
        success: false,
        action: "assign",
        message: "Não foi possível atribuir este atendimento ao usuário selecionado.",
      });
    }
  },

  createTicket: async ({ params, cookies }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "createTicket", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.create",
      `/app/chat/${params.sessionId}`,
    );
    try {
      const result = await createTicketFromChat(session.user.id, permissions, params.sessionId);
      return {
        success: true,
        action: "createTicket",
        message: result.created
          ? `Chamado #${result.ticketNumber} criado a partir desta conversa.`
          : `Esta conversa já está vinculada ao chamado #${result.ticketNumber}.`,
      };
    } catch {
      return fail(409, {
        success: false,
        action: "createTicket",
        message: "Não foi possível criar o chamado a partir desta conversa.",
      });
    }
  },

  note: async ({ params, cookies, request }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "note", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "chat.view",
      `/app/chat/${params.sessionId}`,
    );
    const formData = await request.formData();
    const body = readString(formData, "body");
    const requestedMentionIds = readMentionedUserIds(formData);
    if (body.length < 1 || body.length > 10_000) {
      return fail(400, { success: false, action: "note", message: "A nota deve ter entre 1 e 10.000 caracteres." });
    }

    try {
      const initial = await listInternalChatMessages(session.user.id, permissions, params.sessionId);
      if (initial.chat.ticketId) {
        if (!hasPermission(permissions, "tickets.reply")) {
          return fail(403, {
            success: false,
            action: "note",
            message: "Você não tem permissão para adicionar notas internas neste chamado.",
          });
        }
        const mentionedUserIds = await validateMentionedUserIds(
          initial.chat.ticketId,
          requestedMentionIds,
        );
        await addTicketMessage(
          session.user.id,
          permissions,
          initial.chat.ticketId,
          body,
          "internal",
          mentionedUserIds,
        );
        return {
          success: true,
          action: "note",
          message: mentionedUserIds.length > 0
            ? "Nota interna adicionada e menções notificadas."
            : "Nota interna adicionada.",
        };
      }

      if (!hasPermission(permissions, "chat.respond")) {
        return fail(403, {
          success: false,
          action: "note",
          message: "Você não tem permissão para adicionar notas internas nesta conversa.",
        });
      }
      const result = await addInternalChatNote(
        session.user.id,
        permissions,
        params.sessionId,
        body,
        requestedMentionIds,
      );
      return {
        success: true,
        action: "note",
        message: result.mentionedUserIds.length > 0
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

  status: async ({ params, cookies, request }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "status", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/chat/${params.sessionId}`,
    );
    const status = readString(await request.formData(), "status");
    if (!isTicketStatus(status) || status === "closed") {
      return fail(400, {
        success: false,
        action: "status",
        message: status === "closed" ? "Use Finalizar atendimento para encerrar o chat." : "Status inválido.",
      });
    }
    try {
      const initial = await listInternalChatMessages(session.user.id, permissions, params.sessionId);
      const ticketId = requireLinkedTicket(initial.chat.ticketId);
      await updateTicketStatus(session.user.id, permissions, ticketId, status);
      return { success: true, action: "status", message: "Status atualizado." };
    } catch (cause) {
      return fail(cause instanceof Error && cause.message === "CHAT_TICKET_REQUIRED" ? 409 : 403, {
        success: false,
        action: "status",
        message: cause instanceof Error && cause.message === "CHAT_TICKET_REQUIRED"
          ? "Crie um chamado antes de alterar o status."
          : "Não foi possível alterar o status.",
      });
    }
  },

  priority: async ({ params, cookies, request }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "priority", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      `/app/chat/${params.sessionId}`,
    );
    const priority = readString(await request.formData(), "priority");
    if (!isTicketPriority(priority)) {
      return fail(400, { success: false, action: "priority", message: "Prioridade inválida." });
    }
    try {
      const initial = await listInternalChatMessages(session.user.id, permissions, params.sessionId);
      const ticketId = requireLinkedTicket(initial.chat.ticketId);
      await updateTicketPriority(session.user.id, permissions, ticketId, priority);
      return { success: true, action: "priority", message: "Prioridade atualizada." };
    } catch (cause) {
      return fail(cause instanceof Error && cause.message === "CHAT_TICKET_REQUIRED" ? 409 : 403, {
        success: false,
        action: "priority",
        message: cause instanceof Error && cause.message === "CHAT_TICKET_REQUIRED"
          ? "Crie um chamado antes de alterar a prioridade."
          : "Não foi possível alterar a prioridade.",
      });
    }
  },

  createTask: async ({ params, cookies, request }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "createTask", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tasks.create",
      `/app/chat/${params.sessionId}`,
    );
    const formData = await request.formData();
    const projectId = readString(formData, "projectId");
    const title = readString(formData, "title");
    const description = readString(formData, "description");
    const priority = readString(formData, "priority");
    const dueOn = readString(formData, "dueOn") || null;

    if (!isUuid(projectId) || title.length < 2 || title.length > 180 || !isTaskPriority(priority)) {
      return fail(400, { success: false, action: "createTask", message: "Revise projeto, título e prioridade da tarefa." });
    }
    if (description.length > 5_000 || (dueOn && !/^\d{4}-\d{2}-\d{2}$/.test(dueOn))) {
      return fail(400, { success: false, action: "createTask", message: "Descrição ou prazo da tarefa inválido." });
    }

    try {
      const initial = await listInternalChatMessages(session.user.id, permissions, params.sessionId);
      const ticketId = requireLinkedTicket(initial.chat.ticketId);
      const task = await createTaskFromTicket(
        session.user.id,
        permissions,
        ticketId,
        { projectId, title, description, priority, dueOn, assigneeId: null },
      );
      return { success: true, action: "createTask", message: `Tarefa “${task.title}” criada e vinculada ao ticket.` };
    } catch (cause) {
      return fail(cause instanceof Error && cause.message === "CHAT_TICKET_REQUIRED" ? 409 : 403, {
        success: false,
        action: "createTask",
        message: cause instanceof Error && cause.message === "CHAT_TICKET_REQUIRED"
          ? "Crie um chamado antes de criar uma tarefa vinculada."
          : "Não foi possível criar a tarefa.",
      });
    }
  },

  enrollRemote: async ({ params, cookies, url }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "enrollRemote", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "remote.request",
      `/app/chat/${params.sessionId}`,
    );

    try {
      const initial = await listInternalChatMessages(session.user.id, permissions, params.sessionId);
      const ticketId = requireLinkedTicket(initial.chat.ticketId);
      await createRemoteDeviceEnrollment(session.user.id, ticketId, url.origin);
      return {
        success: true,
        action: "enrollRemote",
        message: "O link do Suporte Remoto F10 foi enviado nesta conversa.",
      };
    } catch (cause) {
      return fail(409, {
        success: false,
        action: "enrollRemote",
        message: cause instanceof Error && cause.message === "CHAT_TICKET_REQUIRED"
          ? "Crie um chamado antes de iniciar o suporte remoto."
          : "Não foi possível gerar o instalador remoto para esta conversa.",
      });
    }
  },

  startRemote: async ({ params, cookies, request }) => {
    if (!isUuid(params.sessionId)) {
      return fail(404, { success: false, action: "startRemote", message: "Conversa não encontrada." });
    }
    const { session, permissions } = await requireAppPermission(
      cookies,
      "remote.use",
      `/app/chat/${params.sessionId}`,
    );
    const formData = await request.formData();
    const deviceId = readString(formData, "deviceId");
    if (!isUuid(deviceId)) {
      return fail(400, { success: false, action: "startRemote", message: "Computador inválido." });
    }

    try {
      const initial = await listInternalChatMessages(session.user.id, permissions, params.sessionId);
      const ticketId = requireLinkedTicket(initial.chat.ticketId);
      await syncRemoteDevicesForTicket(ticketId);
      const remoteSessionId = await createKnownDeviceRemoteSession(session.user.id, ticketId, deviceId);
      throw redirect(303, `/app/remote/${remoteSessionId}/launch`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) {
        throw cause;
      }
      return fail(409, {
        success: false,
        action: "startRemote",
        message:
          cause instanceof Error && cause.message === "CHAT_TICKET_REQUIRED"
            ? "Crie um chamado antes de iniciar o suporte remoto."
            : cause instanceof Error && cause.message === "REMOTE_DEVICE_OFFLINE"
              ? "Este computador está offline."
              : "Não foi possível iniciar o acesso remoto.",
      });
    }
  },
};