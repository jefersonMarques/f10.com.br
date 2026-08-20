import { fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppAnyPermission } from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import {
  disconnectGoogleCalendar,
  getGoogleCalendarConnection,
  getGoogleCalendarEvent,
  listGoogleCalendarAcl,
  revokeGoogleCalendarShare,
  shareGoogleCalendar,
} from "$lib/server/calendar/googleCalendarRepository";
import {
  DEFAULT_GOOGLE_CALENDAR_PREFERENCES,
  getGoogleCalendarSyncPreferences,
  getGoogleCalendarSyncState,
  listGoogleCalendarSources,
  refreshAndListGoogleCalendarSources,
  saveGoogleCalendarSource,
  saveGoogleCalendarSyncPreferences,
  type GoogleCalendarSyncPreferences,
} from "$lib/server/calendar/googleCalendarPreferenceRepository";
import { synchronizeGoogleCalendar } from "$lib/server/calendar/googleCalendarSyncService";
import { clearAutoManagedTicketGoogleCalendarLinks } from "$lib/server/calendar/ticketGoogleCalendarLifecycle";
import {
  applyGoogleEventToTicketDueDate,
  listUserTicketGoogleCalendarLinks,
  resolveTicketGoogleSyncWithF10,
} from "$lib/server/calendar/ticketGoogleCalendarRepository";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import { getSupportTicket } from "$lib/server/support/supportRepository";
import { ensureTaskAccess } from "$lib/server/tasks/taskAccess";
import { getTaskDetails } from "$lib/server/tasks/taskDetailRepository";
import {
  applyGoogleEventToTask,
  getTaskGoogleCalendarLink,
  listUserTaskGoogleCalendarLinks,
  removeTaskGoogleCalendarLink,
  resolveTaskGoogleSyncWithF10,
} from "$lib/server/tasks/taskGoogleCalendarRepository";
import {
  listProjectMembers,
  listTaskProjects,
} from "$lib/server/tasks/taskRepository";

const RETURN_TO = "/app/minha-conta/google";
const GOOGLE_ACCESS_PERMISSIONS = [
  "tasks.view",
  "tickets.view",
  "scheduling.view",
  "scheduling.create",
  "integrations.view",
] as const;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string): boolean {
  return readString(formData, key) === "true";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function googleEventDueOn(event: Awaited<ReturnType<typeof getGoogleCalendarEvent>>): string | null {
  if (!event) return null;
  return event.startDate ?? event.startDateTime?.slice(0, 10) ?? null;
}

function syncRange(): { timeMin: Date; timeMax: Date } {
  const now = new Date();
  return {
    timeMin: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
    timeMax: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
  };
}

async function requireGoogleContext(cookies: Parameters<typeof requireAppAnyPermission>[0]) {
  return requireAppAnyPermission(cookies, [...GOOGLE_ACCESS_PERMISSIONS], RETURN_TO);
}

async function runSync(
  userId: string,
  permissions: Awaited<ReturnType<typeof requireGoogleContext>>["permissions"],
): Promise<void> {
  const range = syncRange();
  await synchronizeGoogleCalendar({ userId, permissions, ...range });
}

async function requireTaskUpdateAccess(
  userId: string,
  permissions: Awaited<ReturnType<typeof requireGoogleContext>>["permissions"],
  taskId: string,
): Promise<void> {
  const scope = getPermissionScope(permissions, "tasks.update");
  if (!scope) throw new Error("TASK_UPDATE_NOT_ALLOWED");
  await ensureTaskAccess(userId, scope, taskId);
}

async function requireTicketReplyAccess(
  userId: string,
  permissions: Awaited<ReturnType<typeof requireGoogleContext>>["permissions"],
  ticketId: string,
): Promise<void> {
  const scope = getPermissionScope(permissions, "tickets.reply");
  if (!scope) throw new Error("TICKET_REPLY_NOT_ALLOWED");
  await requireTicketAccess(userId, scope, ticketId);
}

export const load: PageServerLoad = async ({ cookies }) => {
  const { session, permissions } = await requireGoogleContext(cookies);
  const connection = await getGoogleCalendarConnection(session.user.id);
  const canManageTaskImport = hasPermission(permissions, "tasks.create");
  const canAssignTasks = hasPermission(permissions, "tasks.assign");
  const projects = canManageTaskImport
    ? await listTaskProjects(session.user.id, permissions)
    : [];

  let sources: Awaited<ReturnType<typeof listGoogleCalendarSources>> = [];
  let preferences: GoogleCalendarSyncPreferences = DEFAULT_GOOGLE_CALENDAR_PREFERENCES;
  let shares: Awaited<ReturnType<typeof listGoogleCalendarAcl>> = [];
  let sourceError = "";

  if (connection.connected && connection.scopesReady) {
    try {
      sources = await refreshAndListGoogleCalendarSources(session.user.id);
      preferences = await getGoogleCalendarSyncPreferences(session.user.id);
      const target = sources.find((source) => source.calendarId === preferences.targetCalendarId)
        ?? sources.find((source) => source.isPrimary)
        ?? null;
      if (target?.accessRole === "owner") {
        shares = (await listGoogleCalendarAcl(session.user.id, target.calendarId))
          .filter((entry) => entry.scopeType === "user" && entry.scopeValue && entry.scopeValue !== connection.googleEmail);
      }
    } catch {
      sourceError = "Não foi possível carregar todos os calendários desta conta agora.";
    }
  }

  const membersByProject = canAssignTasks
    ? Object.fromEntries(
        await Promise.all(
          projects.map(async (project) => [project.id, await listProjectMembers(project.id)] as const),
        ),
      )
    : {};

  const writableSources = sources.filter((source) => ["writer", "owner"].includes(source.accessRole));
  const [taskLinks, ticketLinks, syncState] = connection.connected
    ? await Promise.all([
        listUserTaskGoogleCalendarLinks(session.user.id).catch(() => []),
        listUserTicketGoogleCalendarLinks(session.user.id).catch(() => []),
        getGoogleCalendarSyncState(session.user.id).catch(() => ({
          lastSyncStartedAt: null,
          lastSyncCompletedAt: null,
          lastSyncError: null,
        })),
      ])
    : [[], [], { lastSyncStartedAt: null, lastSyncCompletedAt: null, lastSyncError: null }];

  const taskConflictLinks = taskLinks.filter((link) => link.lastSyncError === "SYNC_CONFLICT");
  const ticketConflictLinks = ticketLinks.filter((link) => link.lastSyncError === "SYNC_CONFLICT");
  const taskIssues = await Promise.all(
    taskConflictLinks.map(async (link) => {
      try {
        const [details, event] = await Promise.all([
          getTaskDetails(session.user.id, permissions, link.taskId),
          getGoogleCalendarEvent(session.user.id, link.googleCalendarId, link.googleEventId),
        ]);
        return {
          kind: "task" as const,
          id: link.taskId,
          title: details.task.title,
          calendarId: link.googleCalendarId,
          googleEventId: link.googleEventId,
          local: {
            title: details.task.title,
            description: details.task.description,
            dueOn: details.task.dueOn,
          },
          google: event
            ? {
                title: event.summary,
                description: event.description,
                dueOn: googleEventDueOn(event),
              }
            : null,
        };
      } catch {
        return null;
      }
    }),
  );
  const ticketIssues = await Promise.all(
    ticketConflictLinks.map(async (link) => {
      try {
        const [details, event] = await Promise.all([
          getSupportTicket(session.user.id, permissions, link.ticketId),
          getGoogleCalendarEvent(session.user.id, link.googleCalendarId, link.googleEventId),
        ]);
        return {
          kind: "ticket" as const,
          id: link.ticketId,
          title: `#${details.ticket.ticketNumber} · ${details.ticket.subject}`,
          calendarId: link.googleCalendarId,
          googleEventId: link.googleEventId,
          local: {
            dueOn: details.ticket.dueOn,
          },
          google: event
            ? {
                dueOn: googleEventDueOn(event),
              }
            : null,
        };
      } catch {
        return null;
      }
    }),
  );

  return {
    connection,
    preferences,
    sources,
    writableSources,
    shares,
    projects,
    membersByProject,
    canManageTaskImport,
    canAssignTasks,
    sourceError,
    syncState,
    syncErrors: [...taskLinks, ...ticketLinks].filter((link) => Boolean(link.lastSyncError)).length,
    syncIssues: [...taskIssues, ...ticketIssues].filter((issue) => issue !== null),
  };
};

export const actions: Actions = {
  preferences: async ({ cookies, request }) => {
    const { session, permissions } = await requireGoogleContext(cookies);
    const connection = await getGoogleCalendarConnection(session.user.id);
    if (!connection.connected || !connection.scopesReady) {
      return fail(409, { success: false, action: "preferences", message: "Reconecte o Google Calendar antes de alterar a sincronização." });
    }

    const formData = await request.formData();
    const previous = await getGoogleCalendarSyncPreferences(session.user.id);
    const next: GoogleCalendarSyncPreferences = {
      targetCalendarId: readString(formData, "targetCalendarId"),
      syncTasksToGoogle: readBoolean(formData, "syncTasksToGoogle"),
      syncTicketsToGoogle: readBoolean(formData, "syncTicketsToGoogle"),
      syncSchedulingToGoogle: readBoolean(formData, "syncSchedulingToGoogle"),
      syncGoogleChangesToF10: readBoolean(formData, "syncGoogleChangesToF10"),
    };

    if (!next.targetCalendarId) {
      return fail(400, { success: false, action: "preferences", message: "Selecione um calendário de destino." });
    }

    try {
      await saveGoogleCalendarSyncPreferences(session.user.id, next);

      if (previous.syncTasksToGoogle && !next.syncTasksToGoogle) {
        const links = await listUserTaskGoogleCalendarLinks(session.user.id);
        await Promise.allSettled(
          links
            .filter((link) => link.autoManaged && !link.importedFromGoogle)
            .map((link) => removeTaskGoogleCalendarLink(session.user.id, link.taskId, true)),
        );
      }
      if (previous.syncTicketsToGoogle && !next.syncTicketsToGoogle) {
        await clearAutoManagedTicketGoogleCalendarLinks(session.user.id);
      }

      await runSync(session.user.id, permissions);
      return { success: true, action: "preferences", message: "Preferências de sincronização atualizadas." };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      const message = code === "GOOGLE_CALENDAR_TARGET_NOT_WRITABLE"
        ? "O calendário selecionado não permite gravação."
        : "Não foi possível salvar as preferências do Google Calendar.";
      return fail(400, { success: false, action: "preferences", message });
    }
  },

  source: async ({ cookies, request }) => {
    const { session, permissions } = await requireGoogleContext(cookies);
    const formData = await request.formData();
    const calendarId = readString(formData, "calendarId");
    const importMode = readString(formData, "importMode");
    const importProjectId = readString(formData, "importProjectId");
    const importAssigneeId = readString(formData, "importAssigneeId");

    if (!calendarId || !["hidden", "view_only", "task"].includes(importMode)) {
      return fail(400, { success: false, action: "source", message: "Configuração de calendário inválida." });
    }
    if (importMode === "task" && !hasPermission(permissions, "tasks.create")) {
      return fail(403, { success: false, action: "source", message: "Você não possui permissão para importar eventos como tarefas." });
    }
    if (importMode === "task" && (!isUuid(importProjectId) || (importAssigneeId && !isUuid(importAssigneeId)))) {
      return fail(400, { success: false, action: "source", message: "Selecione um projeto e responsável válidos." });
    }

    if (importMode === "task") {
      const projects = await listTaskProjects(session.user.id, permissions);
      if (!projects.some((project) => project.id === importProjectId)) {
        return fail(403, { success: false, action: "source", message: "Projeto de importação não autorizado." });
      }
      if (importAssigneeId) {
        const members = await listProjectMembers(importProjectId);
        if (!members.some((member) => member.id === importAssigneeId)) {
          return fail(400, { success: false, action: "source", message: "O responsável precisa participar do projeto selecionado." });
        }
      }
    }

    try {
      await saveGoogleCalendarSource(session.user.id, {
        calendarId,
        visibleInF10: readBoolean(formData, "visibleInF10"),
        importMode: importMode as "hidden" | "view_only" | "task",
        importProjectId: importMode === "task" ? importProjectId : null,
        importAssigneeId: importMode === "task" && importAssigneeId ? importAssigneeId : null,
      });
      await runSync(session.user.id, permissions);
      return { success: true, action: "source", message: "Regra deste calendário atualizada." };
    } catch {
      return fail(400, { success: false, action: "source", message: "Não foi possível atualizar este calendário." });
    }
  },

  resolveTaskConflictF10: async ({ cookies, request }) => {
    const { session, permissions } = await requireGoogleContext(cookies);
    const taskId = readString(await request.formData(), "entityId");
    if (!isUuid(taskId)) return fail(400, { success: false, action: "resolveTaskConflictF10", message: "Tarefa inválida." });

    try {
      await requireTaskUpdateAccess(session.user.id, permissions, taskId);
      await resolveTaskGoogleSyncWithF10(session.user.id, taskId);
      return { success: true, action: "resolveTaskConflictF10", message: "Conflito resolvido mantendo a versão do F10." };
    } catch {
      return fail(403, { success: false, action: "resolveTaskConflictF10", message: "Não foi possível resolver este conflito." });
    }
  },

  resolveTaskConflictGoogle: async ({ cookies, request }) => {
    const { session, permissions } = await requireGoogleContext(cookies);
    const taskId = readString(await request.formData(), "entityId");
    if (!isUuid(taskId)) return fail(400, { success: false, action: "resolveTaskConflictGoogle", message: "Tarefa inválida." });

    try {
      await requireTaskUpdateAccess(session.user.id, permissions, taskId);
      const link = await getTaskGoogleCalendarLink(session.user.id, taskId);
      if (!link) throw new Error("TASK_GOOGLE_LINK_NOT_FOUND");
      const event = await getGoogleCalendarEvent(session.user.id, link.googleCalendarId, link.googleEventId);
      if (!event) throw new Error("GOOGLE_EVENT_NOT_FOUND");
      await applyGoogleEventToTask(session.user.id, taskId, event);
      return { success: true, action: "resolveTaskConflictGoogle", message: "Conflito resolvido usando a versão do Google." };
    } catch {
      return fail(403, { success: false, action: "resolveTaskConflictGoogle", message: "Não foi possível resolver este conflito." });
    }
  },

  resolveTicketConflictF10: async ({ cookies, request }) => {
    const { session, permissions } = await requireGoogleContext(cookies);
    const ticketId = readString(await request.formData(), "entityId");
    if (!isUuid(ticketId)) return fail(400, { success: false, action: "resolveTicketConflictF10", message: "Ticket inválido." });

    try {
      await requireTicketReplyAccess(session.user.id, permissions, ticketId);
      await resolveTicketGoogleSyncWithF10(session.user.id, ticketId);
      return { success: true, action: "resolveTicketConflictF10", message: "Conflito resolvido mantendo a versão do F10." };
    } catch {
      return fail(403, { success: false, action: "resolveTicketConflictF10", message: "Não foi possível resolver este conflito." });
    }
  },

  resolveTicketConflictGoogle: async ({ cookies, request }) => {
    const { session, permissions } = await requireGoogleContext(cookies);
    const ticketId = readString(await request.formData(), "entityId");
    if (!isUuid(ticketId)) return fail(400, { success: false, action: "resolveTicketConflictGoogle", message: "Ticket inválido." });

    try {
      await requireTicketReplyAccess(session.user.id, permissions, ticketId);
      const links = await listUserTicketGoogleCalendarLinks(session.user.id);
      const link = links.find((item) => item.ticketId === ticketId);
      if (!link) throw new Error("TICKET_GOOGLE_LINK_NOT_FOUND");
      const event = await getGoogleCalendarEvent(session.user.id, link.googleCalendarId, link.googleEventId);
      if (!event) throw new Error("GOOGLE_EVENT_NOT_FOUND");
      await applyGoogleEventToTicketDueDate(session.user.id, ticketId, event);
      return { success: true, action: "resolveTicketConflictGoogle", message: "Conflito resolvido usando a data do Google." };
    } catch {
      return fail(403, { success: false, action: "resolveTicketConflictGoogle", message: "Não foi possível resolver este conflito." });
    }
  },

  refresh: async ({ cookies }) => {
    const { session } = await requireGoogleContext(cookies);
    try {
      await refreshAndListGoogleCalendarSources(session.user.id);
      return { success: true, action: "refresh", message: "Calendários atualizados a partir do Google." };
    } catch {
      return fail(409, { success: false, action: "refresh", message: "Não foi possível atualizar a lista de calendários." });
    }
  },

  share: async ({ cookies, request }) => {
    const { session } = await requireGoogleContext(cookies);
    const formData = await request.formData();
    const calendarId = readString(formData, "calendarId");
    const email = readString(formData, "email").toLowerCase();
    const role = readString(formData, "role");

    if (!calendarId || !["reader", "writer"].includes(role)) {
      return fail(400, { success: false, action: "share", message: "Revise o calendário e a permissão de compartilhamento." });
    }

    const sources = await listGoogleCalendarSources(session.user.id);
    if (!sources.some((source) => source.calendarId === calendarId && source.accessRole === "owner")) {
      return fail(403, { success: false, action: "share", message: "Somente o proprietário pode compartilhar este calendário." });
    }

    try {
      await shareGoogleCalendar(session.user.id, calendarId, email, role as "reader" | "writer");
      return { success: true, action: "share", message: "Calendário compartilhado pelo Google." };
    } catch {
      return fail(400, { success: false, action: "share", message: "Não foi possível compartilhar este calendário." });
    }
  },

  revokeShare: async ({ cookies, request }) => {
    const { session } = await requireGoogleContext(cookies);
    const formData = await request.formData();
    const calendarId = readString(formData, "calendarId");
    const aclEntryId = readString(formData, "aclEntryId");
    if (!calendarId || !aclEntryId) {
      return fail(400, { success: false, action: "revokeShare", message: "Compartilhamento inválido." });
    }

    try {
      await revokeGoogleCalendarShare(session.user.id, calendarId, aclEntryId);
      return { success: true, action: "revokeShare", message: "Compartilhamento removido." };
    } catch {
      return fail(400, { success: false, action: "revokeShare", message: "Não foi possível remover o compartilhamento." });
    }
  },

  disconnect: async ({ cookies }) => {
    const { session } = await requireGoogleContext(cookies);
    try {
      await disconnectGoogleCalendar(session.user.id);
      return { success: true, action: "disconnect", message: "Google Calendar desconectado." };
    } catch {
      return fail(409, { success: false, action: "disconnect", message: "Não foi possível desconectar o Google Calendar." });
    }
  },
};