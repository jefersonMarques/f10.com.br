import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import {
  requireAppAnyPermission,
  requireAppPermission,
} from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { readGoogleEventDetailsFromForm } from "$lib/server/calendar/googleEventFormInput";
import {
  createGoogleCalendarEvent,
  disconnectGoogleCalendar,
  getGoogleCalendarConnection,
  listGoogleCalendarEvents,
} from "$lib/server/calendar/googleCalendarRepository";
import { getGoogleCalendarSyncPreferences } from "$lib/server/calendar/googleCalendarPreferenceRepository";
import {
  synchronizeGoogleCalendar,
  type GoogleAgendaEvent,
} from "$lib/server/calendar/googleCalendarSyncService";
import {
  createAgendaSchedulingEvent,
  listAgendaSchedulingEvents,
} from "$lib/server/calendar/schedulingEventService";
import { syncAllTicketGoogleCalendarLinks } from "$lib/server/calendar/ticketGoogleCalendarLifecycle";
import {
  DEFAULT_SCHEDULING_AVAILABILITY,
  listSchedulingCustomers,
  listSchedulingHosts,
  listSchedulingInvitations,
  listSchedulingTeamUserIds,
} from "$lib/server/calendar/schedulingRepository";
import { generateSchedulingInvitation } from "$lib/server/calendar/schedulingService";
import { listTicketAgendaItems } from "$lib/server/support/ticketAgendaRepository";
import { isTicketDueDate } from "$lib/server/support/ticketDueDate";
import {
  listSupportQueues,
  updateTicketDueOn,
} from "$lib/server/support/supportRepository";
import {
  createTask,
  getTaskBoard,
  listActiveTaskUsers,
  listMyTasks,
  listProjectMembers,
  listTaskProjects,
  type TaskPriority,
} from "$lib/server/tasks/taskRepository";
import {
  configureTaskGoogleCalendar,
  listUserTaskGoogleCalendarLinks,
} from "$lib/server/tasks/taskGoogleCalendarRepository";

const GOOGLE_ACCESS_PERMISSIONS = [
  "tasks.view",
  "tickets.view",
  "scheduling.view",
  "scheduling.create",
  "integrations.view",
] as const;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readInteger(formData: FormData, name: string): number {
  return Number.parseInt(readFormValue(formData, name), 10);
}

function isTaskPriority(value: string): value is TaskPriority {
  return value === "low" || value === "normal" || value === "high" || value === "urgent";
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function createPermissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function agendaRange(anchor: string): { timeMin: Date; timeMax: Date; startOn: string; endOn: string } {
  const base = new Date(`${anchor}T00:00:00.000Z`);
  const timeMin = addUtcDays(base, -45);
  const timeMax = addUtcDays(base, 80);
  return {
    timeMin,
    timeMax,
    startOn: timeMin.toISOString().slice(0, 10),
    endOn: timeMax.toISOString().slice(0, 10),
  };
}

function schedulingMessage(errorValue: unknown): string {
  const code = errorValue instanceof Error ? errorValue.message : "";
  const messages: Record<string, string> = {
    SCHEDULING_HOST_NOT_ALLOWED: "Você não pode criar agendamentos para este responsável.",
    SCHEDULING_HOST_NOT_FOUND: "Responsável inválido ou inativo.",
    SCHEDULING_GOOGLE_MEET_CONNECTION_REQUIRED: "Conecte o Google Calendar do responsável somente se quiser gerar um Google Meet.",
    SCHEDULING_CUSTOMER_EMAIL_REQUIRED: "Selecione um cliente ativo com e-mail cadastrado.",
    SCHEDULING_INVALID_TITLE: "Informe um título entre 3 e 180 caracteres.",
    SCHEDULING_INVALID_DURATION: "A duração deve ficar entre 15 e 240 minutos.",
    SCHEDULING_INVALID_DATE_RANGE: "Revise a janela de datas do agendamento.",
    SCHEDULING_DATE_RANGE_IN_PAST: "A janela de agendamento não pode começar no passado.",
    SCHEDULING_DATE_RANGE_TOO_LONG: "A janela escolhida ultrapassa o horizonte configurado para o responsável.",
  };
  return messages[code] ?? "Não foi possível criar o link de agendamento.";
}

function schedulingEventMessage(errorValue: unknown): string {
  const code = errorValue instanceof Error ? errorValue.message : "";
  const messages: Record<string, string> = {
    SCHEDULING_HOST_NOT_ALLOWED: "Você não pode criar compromissos para este responsável.",
    SCHEDULING_INVALID_TITLE: "Informe um título entre 3 e 180 caracteres.",
    SCHEDULING_EVENT_INVALID_DESCRIPTION: "A descrição deve ter no máximo 5.000 caracteres.",
    SCHEDULING_EVENT_INVALID_RANGE: "Informe uma data e horários válidos para o compromisso.",
    SCHEDULING_INVALID_TIME_ZONE: "Fuso horário inválido.",
    SCHEDULING_EVENT_INVALID_PARTICIPANT: "Revise os participantes do compromisso.",
    SCHEDULING_EVENT_CONFLICT: "Já existe um compromisso ou reserva nesse horário para um dos participantes internos.",
  };
  return messages[code] ?? "Não foi possível criar o compromisso na Agenda F10.";
}

async function googleWriteConfiguration(userId: string) {
  const preferences = await getGoogleCalendarSyncPreferences(userId);
  return {
    calendarId: preferences.targetCalendarId || "primary",
    syncDirection: preferences.syncGoogleChangesToF10 ? "bidirectional" as const : "f10_to_google" as const,
  };
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissions = createPermissionMap(layout.permissions);
  const canViewTasks = hasPermission(permissions, "tasks.view");
  const canViewTickets = hasPermission(permissions, "tickets.view");
  const schedulingViewScope = getPermissionScope(permissions, "scheduling.view");
  const schedulingCreateScope = getPermissionScope(permissions, "scheduling.create");
  const canViewScheduling = Boolean(schedulingViewScope);

  if (!canViewTasks && !canViewTickets && !canViewScheduling) {
    throw error(403, "Acesso não autorizado.");
  }

  const requestedDate = url.searchParams.get("date") ?? "";
  const calendarAnchor = isValidDate(requestedDate) ? requestedDate : todayKey();
  const range = agendaRange(calendarAnchor);
  const googleCalendar = await getGoogleCalendarConnection(layout.user.id);
  let googleEvents: GoogleAgendaEvent[] = [];
  let googleCalendarError = "";
  let googleSyncedAt: Date | null = null;

  if (googleCalendar.connected) {
    if (googleCalendar.scopesReady) {
      const sync = await synchronizeGoogleCalendar({
        userId: layout.user.id,
        permissions,
        timeMin: range.timeMin,
        timeMax: range.timeMax,
      });
      googleEvents = sync.events;
      googleCalendarError = sync.warning;
      googleSyncedAt = sync.syncedAt;
    } else {
      try {
        const legacyEvents = await listGoogleCalendarEvents(
          layout.user.id,
          range.timeMin,
          range.timeMax,
        );
        googleEvents = legacyEvents.map((event) => ({
          ...event,
          calendarId: "primary",
          calendarName: "Google Calendar",
        }));
        googleCalendarError = "Reconecte o Google Calendar para liberar agendas compartilhadas e sincronização completa.";
      } catch {
        googleCalendarError = "Não foi possível atualizar os eventos do Google Calendar agora.";
      }
    }
  }

  const projects = canViewTasks
    ? await listTaskProjects(layout.user.id, permissions)
    : [];
  const requestedProjectId = url.searchParams.get("project") ?? "";
  const selectedProject = canViewTasks
    ? projects.find((project) => project.id === requestedProjectId) ?? null
    : null;
  const canCreate = canViewTasks && hasPermission(permissions, "tasks.create");
  const canAssign = canViewTasks && hasPermission(permissions, "tasks.assign");
  const canCreateTicket = hasPermission(permissions, "tickets.create");
  const canSearchCustomers = canCreateTicket && hasPermission(permissions, "customers.view");
  const canChangeTicketDueOn = canViewTickets && hasPermission(permissions, "tickets.reply");
  const canManageScheduling = hasPermission(permissions, "scheduling.manage");
  const canCreateSchedulingEvent = Boolean(schedulingCreateScope);
  const canCreateScheduling = canCreateSchedulingEvent && hasPermission(permissions, "customers.view");
  const canConfigureScheduling = Boolean(schedulingCreateScope) || canManageScheduling;
  const needsSchedulingTeamUsers = schedulingCreateScope === "team" || schedulingViewScope === "team";
  const schedulingTeamUserIds = (canViewScheduling || canCreateSchedulingEvent) && needsSchedulingTeamUsers
    ? await listSchedulingTeamUserIds(layout.user.id)
    : [layout.user.id];
  const schedulingVisibility: "own" | "team" | "all" = canManageScheduling || schedulingViewScope === "all"
    ? "all"
    : schedulingViewScope ?? "own";

  let sourceTasks: Awaited<ReturnType<typeof listMyTasks>> = [];
  if (canViewTasks && selectedProject) {
    const board = await getTaskBoard(layout.user.id, permissions, selectedProject.id);
    sourceTasks = board.tasks.map((task) => {
      const status = board.statuses.find((item) => item.id === task.statusId);
      return {
        ...task,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        statusName: status?.name ?? "",
        statusClosed: status?.isClosed ?? Boolean(task.completedAt),
      };
    });
  } else if (canViewTasks) {
    sourceTasks = await listMyTasks(layout.user.id, permissions);
  }

  type ProjectMember = Awaited<ReturnType<typeof listProjectMembers>>[number];
  const [
    membersByProject,
    taskGoogleLinks,
    calendarUsers,
    ticketRows,
    ticketQueues,
    rawSchedulingHosts,
    schedulingCustomers,
    schedulingInvitations,
    schedulingEvents,
  ] = await Promise.all([
    canAssign
      ? Promise.all(
          projects.map(async (project) => [project.id, await listProjectMembers(project.id)] as const),
        ).then((entries) => Object.fromEntries(entries) as Record<string, ProjectMember[]>)
      : Promise.resolve({} as Record<string, ProjectMember[]>),
    canViewTasks && googleCalendar.connected
      ? listUserTaskGoogleCalendarLinks(layout.user.id).catch(() => [])
      : Promise.resolve([]),
    canViewTasks || canCreateSchedulingEvent
      ? listActiveTaskUsers()
      : Promise.resolve([]),
    canViewTickets
      ? listTicketAgendaItems(layout.user.id, permissions, range.startOn, range.endOn)
      : Promise.resolve([]),
    canCreateTicket
      ? listSupportQueues()
      : Promise.resolve([]),
    canCreateScheduling || canCreateSchedulingEvent
      ? listSchedulingHosts()
      : Promise.resolve([]),
    canCreateScheduling
      ? listSchedulingCustomers()
      : Promise.resolve([]),
    canViewScheduling
      ? listSchedulingInvitations(layout.user.id, schedulingVisibility, schedulingTeamUserIds)
      : Promise.resolve([]),
    canViewScheduling
      ? listAgendaSchedulingEvents(layout.user.id, permissions, range.timeMin, range.timeMax)
      : Promise.resolve([]),
  ]);

  const schedulingHosts = rawSchedulingHosts
    .filter((host) =>
      canManageScheduling ||
      schedulingCreateScope === "all" ||
      (schedulingCreateScope === "team" && schedulingTeamUserIds.includes(host.id)) ||
      host.id === layout.user.id
    )
    .map((host) => ({
      id: host.id,
      name: host.name,
      email: host.email,
      googleConnected: Boolean(host.googleConnectedUserId),
      defaultDurationMinutes: host.profileDefaultDurationMinutes ?? DEFAULT_SCHEDULING_AVAILABILITY.defaultDurationMinutes,
      maxHorizonDays: host.profileMaxHorizonDays ?? DEFAULT_SCHEDULING_AVAILABILITY.maxHorizonDays,
    }));

  const googleLinkedTaskIds = taskGoogleLinks.map((link) => link.taskId);
  const googleMeetTaskIds = taskGoogleLinks.filter((link) => link.googleMeetUrl).map((link) => link.taskId);
  const schedulingGoogleEventIds = new Set(
    schedulingEvents.map((event) => event.googleEventId).filter((eventId): eventId is string => Boolean(eventId)),
  );
  const schedulingGoogleIcalUids = new Set(
    schedulingEvents.map((event) => event.googleIcalUid).filter((iCalUid): iCalUid is string => Boolean(iCalUid)),
  );
  googleEvents = googleEvents.filter((event) =>
    !schedulingGoogleEventIds.has(event.id)
    && (!event.iCalUID || !schedulingGoogleIcalUids.has(event.iCalUID)),
  );

  return {
    projects,
    selectedProjectId: selectedProject?.id ?? null,
    tasks: sourceTasks,
    tickets: ticketRows,
    ticketQueues,
    membersByProject,
    calendarUsers,
    organizerUserId: layout.user.id,
    canViewTasks,
    canViewTickets,
    canCreate,
    canAssign,
    canCreateTicket,
    canSearchCustomers,
    canChangeTicketDueOn,
    canViewScheduling,
    canCreateSchedulingEvent,
    canCreateScheduling,
    canConfigureScheduling,
    schedulingHosts,
    schedulingCustomers,
    schedulingInvitations: schedulingInvitations.slice(0, 20),
    schedulingEvents,
    calendarAnchor,
    googleCalendar,
    googleEvents,
    googleLinkedTaskIds,
    googleMeetTaskIds,
    googleCalendarError,
    googleSyncedAt,
    googleStatus: url.searchParams.get("google") ?? "",
  };
};

export const actions: Actions = {
  updateTicketDueOn: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tickets.reply",
      "/app/tasks/calendar",
    );
    const formData = await request.formData();
    const ticketId = readFormValue(formData, "ticketId");
    const dueOn = readFormValue(formData, "dueOn");

    if (!isUuid(ticketId) || !isTicketDueDate(dueOn)) {
      return fail(400, {
        success: false,
        action: "updateTicketDueOn",
        message: "Ticket ou data de conclusão inválida.",
      });
    }

    try {
      await updateTicketDueOn(session.user.id, permissions, ticketId, dueOn);
      await syncAllTicketGoogleCalendarLinks(ticketId);
      return {
        success: true,
        action: "updateTicketDueOn",
        message: "Conclusão planejada atualizada.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "updateTicketDueOn",
        message: "Não foi possível alterar a conclusão planejada deste ticket.",
      });
    }
  },

  createSchedulingEvent: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.create",
      "/app/tasks/calendar",
    );
    const formData = await request.formData();

    let attendees: Awaited<ReturnType<typeof readGoogleEventDetailsFromForm>>["attendees"] = [];
    try {
      attendees = (await readGoogleEventDetailsFromForm(session.user.id, formData)).attendees;
    } catch {
      return fail(400, {
        success: false,
        action: "createSchedulingEvent",
        message: "Revise os participantes do compromisso.",
      });
    }

    try {
      const result = await createAgendaSchedulingEvent(session.user.id, permissions, {
        organizerUserId: readFormValue(formData, "organizerUserId") || session.user.id,
        title: readFormValue(formData, "title"),
        description: readFormValue(formData, "description"),
        date: readFormValue(formData, "date"),
        startTime: readFormValue(formData, "startTime"),
        endTime: readFormValue(formData, "endTime"),
        timeZone: readFormValue(formData, "timeZone"),
        attendees: attendees.map((attendee) => ({
          userId: attendee.userId,
          name: attendee.name,
          email: attendee.email,
        })),
        ticketId: isUuid(readFormValue(formData, "ticketId")) ? readFormValue(formData, "ticketId") : null,
        taskId: isUuid(readFormValue(formData, "taskId")) ? readFormValue(formData, "taskId") : null,
      });
      return {
        success: true,
        action: "createSchedulingEvent",
        message: result.googleSynchronized
          ? "Compromisso criado na Agenda F10 e sincronizado com o Google Calendar."
          : "Compromisso criado na Agenda F10.",
      };
    } catch (errorValue) {
      return fail(400, {
        success: false,
        action: "createSchedulingEvent",
        message: schedulingEventMessage(errorValue),
      });
    }
  },

  createSchedulingInvitation: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "scheduling.create",
      "/app/tasks/calendar",
    );
    if (!hasPermission(permissions, "customers.view")) {
      return fail(403, {
        success: false,
        action: "createSchedulingInvitation",
        message: "Acesso a clientes não autorizado.",
      });
    }

    const formData = await request.formData();
    try {
      const created = await generateSchedulingInvitation(session.user.id, permissions, {
        customerContactId: readFormValue(formData, "customerContactId"),
        title: readFormValue(formData, "title"),
        hostUserId: readFormValue(formData, "hostUserId"),
        durationMinutes: readInteger(formData, "durationMinutes"),
        dateRangeStart: readFormValue(formData, "dateRangeStart"),
        dateRangeEnd: readFormValue(formData, "dateRangeEnd"),
        addGoogleMeet: readFormValue(formData, "addGoogleMeet") === "true",
      });
      return {
        success: true,
        action: "createSchedulingInvitation",
        message: "Link de agendamento criado.",
        bookingPath: `/agendar/${created.token}`,
      };
    } catch (errorValue) {
      return fail(400, {
        success: false,
        action: "createSchedulingInvitation",
        message: schedulingMessage(errorValue),
      });
    }
  },

  createTask: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tasks.create", "/app/tasks/calendar");
    const formData = await request.formData();
    const projectId = readFormValue(formData, "projectId");
    const title = readFormValue(formData, "title");
    const dueOn = readFormValue(formData, "dueOn");
    const priority = readFormValue(formData, "priority");
    const requestedAssigneeId = readFormValue(formData, "assigneeId");
    const syncGoogle = readFormValue(formData, "syncGoogle") === "true";
    const googleAllDay = readFormValue(formData, "googleAllDay") === "true";
    const googleStartTime = readFormValue(formData, "googleStartTime");
    const googleEndTime = readFormValue(formData, "googleEndTime");
    const googleTimeZone = readFormValue(formData, "googleTimeZone");
    const googleMeet = readFormValue(formData, "googleMeet") === "true";

    if (!isUuid(projectId)) {
      return fail(400, { success: false, action: "createTask", message: "Projeto inválido." });
    }
    if (title.length < 3 || title.length > 180) {
      return fail(400, { success: false, action: "createTask", message: "Informe um título entre 3 e 180 caracteres." });
    }
    if (!isValidDate(dueOn)) {
      return fail(400, { success: false, action: "createTask", message: "Data inválida." });
    }
    if (!isTaskPriority(priority)) {
      return fail(400, { success: false, action: "createTask", message: "Prioridade inválida." });
    }
    if (requestedAssigneeId && !isUuid(requestedAssigneeId)) {
      return fail(400, { success: false, action: "createTask", message: "Responsável inválido." });
    }
    if (syncGoogle && !googleAllDay && (!isValidTime(googleStartTime) || !isValidTime(googleEndTime) || googleStartTime >= googleEndTime)) {
      return fail(400, { success: false, action: "createTask", message: "Informe um horário válido para sincronizar com o Google Calendar." });
    }

    let eventDetails: Awaited<ReturnType<typeof readGoogleEventDetailsFromForm>> = {
      location: "",
      reminderMinutes: null,
      attendees: [],
    };
    if (syncGoogle) {
      try {
        eventDetails = await readGoogleEventDetailsFromForm(session.user.id, formData);
      } catch {
        return fail(400, { success: false, action: "createTask", message: "Revise local, lembrete e participantes do evento." });
      }
    }

    let task: Awaited<ReturnType<typeof createTask>>;
    try {
      task = await createTask(session.user.id, permissions, {
        projectId,
        title,
        description: "",
        priority,
        dueOn,
        assigneeId: requestedAssigneeId || null,
      });
    } catch {
      return fail(403, { success: false, action: "createTask", message: "Não foi possível criar a tarefa neste projeto." });
    }

    if (syncGoogle) {
      try {
        const google = await googleWriteConfiguration(session.user.id);
        await configureTaskGoogleCalendar(session.user.id, permissions, task.id, {
          enabled: true,
          allDay: googleAllDay,
          startTime: googleStartTime,
          endTime: googleEndTime,
          timeZone: googleTimeZone,
          googleMeet,
          calendarId: google.calendarId,
          syncDirection: google.syncDirection,
          ...eventDetails,
        });
      } catch {
        return {
          success: true,
          syncWarning: true,
          action: "createTask",
          message: "Tarefa criada, mas não foi possível adicioná-la ao Google Calendar agora.",
        };
      }
    }

    const message = syncGoogle
      ? googleMeet
        ? "Tarefa criada com evento e Google Meet."
        : "Tarefa criada e adicionada ao Google Calendar."
      : "Tarefa criada.";
    return { success: true, action: "createTask", message };
  },

  createGoogleEvent: async ({ cookies, request }) => {
    const formData = await request.formData();
    const createAsTask = readFormValue(formData, "createAsTask") === "true";
    const context = createAsTask
      ? await requireAppPermission(cookies, "tasks.create", "/app/tasks/calendar")
      : await requireAppAnyPermission(cookies, [...GOOGLE_ACCESS_PERMISSIONS], "/app/tasks/calendar");
    const { session, permissions } = context;
    const title = readFormValue(formData, "title");
    const description = readFormValue(formData, "description");
    const date = readFormValue(formData, "date");
    const allDay = readFormValue(formData, "allDay") === "true";
    const startTime = readFormValue(formData, "startTime");
    const endTime = readFormValue(formData, "endTime");
    const timeZone = readFormValue(formData, "timeZone");
    const addGoogleMeet = readFormValue(formData, "addGoogleMeet") === "true";
    const projectId = readFormValue(formData, "projectId");
    const priority = readFormValue(formData, "priority");
    const requestedAssigneeId = readFormValue(formData, "assigneeId");

    if (title.length < 2 || title.length > 180 || description.length > 5000 || !isValidDate(date)) {
      return fail(400, { success: false, action: "createGoogleEvent", message: "Revise o título, descrição e data do evento." });
    }
    if (!allDay && (!isValidTime(startTime) || !isValidTime(endTime) || startTime >= endTime)) {
      return fail(400, { success: false, action: "createGoogleEvent", message: "Informe um horário inicial e final válidos." });
    }
    if (timeZone.length < 1 || timeZone.length > 100) {
      return fail(400, { success: false, action: "createGoogleEvent", message: "Fuso horário inválido." });
    }

    let eventDetails: Awaited<ReturnType<typeof readGoogleEventDetailsFromForm>>;
    try {
      eventDetails = await readGoogleEventDetailsFromForm(session.user.id, formData);
    } catch {
      return fail(400, { success: false, action: "createGoogleEvent", message: "Revise local, lembrete e participantes do evento." });
    }

    const google = await googleWriteConfiguration(session.user.id);

    if (createAsTask) {
      if (!isUuid(projectId)) {
        return fail(400, { success: false, action: "createGoogleEvent", message: "Selecione um projeto para criar a tarefa." });
      }
      if (title.length < 3 || !isTaskPriority(priority)) {
        return fail(400, { success: false, action: "createGoogleEvent", message: "Revise o título e a prioridade da tarefa." });
      }
      if (requestedAssigneeId && !isUuid(requestedAssigneeId)) {
        return fail(400, { success: false, action: "createGoogleEvent", message: "Responsável inválido." });
      }

      let task: Awaited<ReturnType<typeof createTask>>;
      try {
        task = await createTask(session.user.id, permissions, {
          projectId,
          title,
          description,
          priority,
          dueOn: date,
          assigneeId: requestedAssigneeId || null,
        });
      } catch {
        return fail(403, { success: false, action: "createGoogleEvent", message: "Não foi possível criar a tarefa no projeto selecionado." });
      }

      try {
        await configureTaskGoogleCalendar(session.user.id, permissions, task.id, {
          enabled: true,
          allDay,
          startTime,
          endTime,
          timeZone,
          googleMeet: addGoogleMeet,
          calendarId: google.calendarId,
          syncDirection: google.syncDirection,
          ...eventDetails,
        });
      } catch {
        return {
          success: true,
          syncWarning: true,
          action: "createGoogleEvent",
          message: "Tarefa criada, mas não foi possível gerar o evento no Google Calendar agora.",
        };
      }

      return {
        success: true,
        action: "createGoogleEvent",
        message: addGoogleMeet
          ? "Evento com Google Meet criado e vinculado a uma tarefa F10."
          : "Evento criado e vinculado a uma tarefa F10.",
      };
    }

    try {
      await createGoogleCalendarEvent(
        session.user.id,
        {
          title,
          description,
          date,
          allDay,
          startTime,
          endTime,
          timeZone,
          addGoogleMeet,
          location: eventDetails.location,
          reminderMinutes: eventDetails.reminderMinutes,
          attendees: eventDetails.attendees.map((attendee) => ({
            email: attendee.email,
            optional: attendee.optional,
          })),
        },
        google.calendarId,
      );
      return {
        success: true,
        action: "createGoogleEvent",
        message: addGoogleMeet ? "Evento com Google Meet criado." : "Evento criado no Google Calendar.",
      };
    } catch {
      return fail(409, { success: false, action: "createGoogleEvent", message: "Não foi possível criar o evento no Google Calendar." });
    }
  },

  disconnectGoogle: async ({ cookies }) => {
    const { session } = await requireAppAnyPermission(
      cookies,
      [...GOOGLE_ACCESS_PERMISSIONS],
      "/app/tasks/calendar",
    );
    try {
      await disconnectGoogleCalendar(session.user.id);
      return { success: true, action: "disconnectGoogle", message: "Google Calendar desconectado." };
    } catch {
      return fail(409, { success: false, action: "disconnectGoogle", message: "Não foi possível desconectar o Google Calendar agora." });
    }
  },
};