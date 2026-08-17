import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { readGoogleEventDetailsFromForm } from "$lib/server/calendar/googleEventFormInput";
import {
  createGoogleCalendarEvent,
  disconnectGoogleCalendar,
  getGoogleCalendarConnection,
  listGoogleCalendarEvents,
} from "$lib/server/calendar/googleCalendarRepository";
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
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

function googleRange(anchor: string): { timeMin: Date; timeMax: Date } {
  const base = new Date(`${anchor}T00:00:00.000Z`);
  return {
    timeMin: addUtcDays(base, -45),
    timeMax: addUtcDays(base, 80),
  };
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissions = createPermissionMap(layout.permissions);

  if (!hasPermission(permissions, "tasks.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const projects = await listTaskProjects(layout.user.id, permissions);
  const requestedProjectId = url.searchParams.get("project") ?? "";
  const selectedProject = projects.find((project) => project.id === requestedProjectId) ?? null;
  const canCreate = hasPermission(permissions, "tasks.create");
  const canAssign = hasPermission(permissions, "tasks.assign");
  const requestedDate = url.searchParams.get("date") ?? "";
  const calendarAnchor = isValidDate(requestedDate) ? requestedDate : todayKey();

  let sourceTasks;
  if (selectedProject) {
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
  } else {
    sourceTasks = await listMyTasks(layout.user.id, permissions);
  }

  type ProjectMember = Awaited<ReturnType<typeof listProjectMembers>>[number];
  const [membersByProject, googleCalendar, taskGoogleLinks, calendarUsers] = await Promise.all([
    canAssign
      ? Promise.all(
          projects.map(async (project) => [project.id, await listProjectMembers(project.id)] as const),
        ).then((entries) => Object.fromEntries(entries) as Record<string, ProjectMember[]>)
      : Promise.resolve({} as Record<string, ProjectMember[]>),
    getGoogleCalendarConnection(layout.user.id),
    listUserTaskGoogleCalendarLinks(layout.user.id),
    listActiveTaskUsers(),
  ]);

  const linkedEventIds = new Set(taskGoogleLinks.map((link) => link.googleEventId));
  const googleLinkedTaskIds = taskGoogleLinks.map((link) => link.taskId);
  const googleMeetTaskIds = taskGoogleLinks.filter((link) => link.googleMeetUrl).map((link) => link.taskId);
  let googleEvents: Awaited<ReturnType<typeof listGoogleCalendarEvents>> = [];
  let googleCalendarError = "";

  if (googleCalendar.connected) {
    try {
      const range = googleRange(calendarAnchor);
      const fetchedEvents = await listGoogleCalendarEvents(layout.user.id, range.timeMin, range.timeMax);
      googleEvents = fetchedEvents.filter((event) => !linkedEventIds.has(event.id));
    } catch {
      googleCalendarError = "Não foi possível atualizar os eventos do Google Calendar agora.";
    }
  }

  return {
    projects,
    selectedProjectId: selectedProject?.id ?? null,
    tasks: sourceTasks,
    membersByProject,
    calendarUsers,
    organizerUserId: layout.user.id,
    canCreate,
    canAssign,
    calendarAnchor,
    googleCalendar,
    googleEvents,
    googleLinkedTaskIds,
    googleMeetTaskIds,
    googleCalendarError,
    googleStatus: url.searchParams.get("google") ?? "",
  };
};

export const actions: Actions = {
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
        await configureTaskGoogleCalendar(session.user.id, permissions, task.id, {
          enabled: true,
          allDay: googleAllDay,
          startTime: googleStartTime,
          endTime: googleEndTime,
          timeZone: googleTimeZone,
          googleMeet,
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
    const { session, permissions } = await requireAppPermission(
      cookies,
      createAsTask ? "tasks.create" : "tasks.view",
      "/app/tasks/calendar",
    );
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
      await createGoogleCalendarEvent(session.user.id, {
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
      });
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
    const { session } = await requireAppPermission(cookies, "tasks.view", "/app/tasks/calendar");
    try {
      await disconnectGoogleCalendar(session.user.id);
      return { success: true, action: "disconnectGoogle", message: "Google Calendar desconectado." };
    } catch {
      return fail(409, { success: false, action: "disconnectGoogle", message: "Não foi possível desconectar o Google Calendar agora." });
    }
  },
};
