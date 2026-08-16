import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  listTaskTicketOrigins,
  listTaskTicketOriginsForTasks,
} from "$lib/server/support/ticketTaskBridge";
import {
  addTaskComment,
  assignTask,
  createTask,
  createTaskProject,
  getTaskBoard,
  getTaskDetails,
  listActiveTaskUsers,
  listMyTasks,
  listProjectMembers,
  listTaskProjects,
  moveTask,
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

function readUuidList(formData: FormData, name: string): string[] {
  return Array.from(
    new Set(
      formData
        .getAll(name)
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(isUuid),
    ),
  );
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

function createPermissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
}

async function loadSelectedTask(
  userId: string,
  permissions: Map<string, "own" | "team" | "all">,
  taskId: string,
) {
  if (!isUuid(taskId)) return null;
  try {
    const [details, ticketOrigins] = await Promise.all([
      getTaskDetails(userId, permissions, taskId),
      listTaskTicketOrigins(userId, permissions, taskId),
    ]);
    return { details, ticketOrigins };
  } catch {
    return null;
  }
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissionMap = createPermissionMap(layout.permissions);

  if (!hasPermission(permissionMap, "tasks.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const projects = await listTaskProjects(layout.user.id, permissionMap);
  const requestedProjectId = url.searchParams.get("project") ?? "";
  const selectedProject = projects.find((project) => project.id === requestedProjectId) ?? null;
  const mode = selectedProject ? "project" as const : "mine" as const;
  const requestedView = url.searchParams.get("view");
  const view = mode === "project" && requestedView === "board" ? "board" as const : "list" as const;
  const selectedTaskId = url.searchParams.get("task") ?? "";

  const canManage = hasPermission(permissionMap, "tasks.manage");
  const canCreate = hasPermission(permissionMap, "tasks.create");
  const canUpdate = hasPermission(permissionMap, "tasks.update");
  const canAssign = hasPermission(permissionMap, "tasks.assign");

  const [board, myTasks, members, activeUsers, selectedTask] = await Promise.all([
    selectedProject
      ? getTaskBoard(layout.user.id, permissionMap, selectedProject.id)
      : Promise.resolve(null),
    mode === "mine"
      ? listMyTasks(layout.user.id, permissionMap)
      : Promise.resolve([]),
    selectedProject
      ? listProjectMembers(selectedProject.id)
      : Promise.resolve([]),
    canManage ? listActiveTaskUsers() : Promise.resolve([]),
    selectedTaskId
      ? loadSelectedTask(layout.user.id, permissionMap, selectedTaskId)
      : Promise.resolve(null),
  ]);

  const visibleTasks = board?.tasks ?? myTasks;
  const ticketOriginsByTask = Object.fromEntries(
    await listTaskTicketOriginsForTasks(
      layout.user.id,
      permissionMap,
      visibleTasks.map((task) => task.id),
    ),
  );

  return {
    projects,
    mode,
    view,
    selectedProjectId: selectedProject?.id ?? null,
    board,
    myTasks,
    members,
    activeUsers,
    selectedTask,
    ticketOriginsByTask,
    canManage,
    canCreate,
    canUpdate,
    canAssign,
  };
};

export const actions: Actions = {
  createProject: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "tasks.manage", "/app/tasks");
    const formData = await request.formData();
    const name = readFormValue(formData, "name");
    const description = readFormValue(formData, "description");
    const memberIds = readUuidList(formData, "memberIds");

    if (name.length < 2 || name.length > 120) {
      return fail(400, { success: false, action: "createProject", message: "Informe um nome de projeto entre 2 e 120 caracteres." });
    }
    if (description.length > 1000) {
      return fail(400, { success: false, action: "createProject", message: "A descrição do projeto deve ter no máximo 1.000 caracteres." });
    }

    try {
      const project = await createTaskProject(session.user.id, { name, description, memberIds });
      throw redirect(303, `/app/tasks?project=${project.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, action: "createProject", message: "Não foi possível criar o projeto com os integrantes selecionados." });
    }
  },

  createTask: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tasks.create", "/app/tasks");
    const formData = await request.formData();
    const projectId = readFormValue(formData, "projectId");
    const title = readFormValue(formData, "title");
    const description = readFormValue(formData, "description");
    const priority = readFormValue(formData, "priority");
    const requestedDueOn = readFormValue(formData, "dueOn");
    const requestedAssigneeId = readFormValue(formData, "assigneeId");

    if (!isUuid(projectId)) return fail(400, { success: false, action: "createTask", message: "Projeto inválido." });
    if (title.length < 3 || title.length > 180) return fail(400, { success: false, action: "createTask", message: "Informe um título entre 3 e 180 caracteres." });
    if (description.length > 5000) return fail(400, { success: false, action: "createTask", message: "A descrição deve ter no máximo 5.000 caracteres." });
    if (!isTaskPriority(priority)) return fail(400, { success: false, action: "createTask", message: "Prioridade inválida." });
    if (requestedDueOn && !isValidDate(requestedDueOn)) return fail(400, { success: false, action: "createTask", message: "Data de prazo inválida." });
    if (requestedAssigneeId && !isUuid(requestedAssigneeId)) return fail(400, { success: false, action: "createTask", message: "Responsável inválido." });

    try {
      await createTask(session.user.id, permissions, {
        projectId,
        title,
        description,
        priority,
        dueOn: requestedDueOn || null,
        assigneeId: requestedAssigneeId || null,
      });
      return { success: true, action: "createTask", message: "Tarefa criada." };
    } catch {
      return fail(403, { success: false, action: "createTask", message: "Não foi possível criar esta tarefa no projeto selecionado." });
    }
  },

  moveTask: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tasks.update", "/app/tasks");
    const formData = await request.formData();
    const taskId = readFormValue(formData, "taskId");
    const statusId = readFormValue(formData, "statusId");

    if (!isUuid(taskId) || !isUuid(statusId)) {
      return fail(400, { success: false, action: "moveTask", message: "Tarefa ou status inválido." });
    }

    try {
      await moveTask(session.user.id, permissions, taskId, statusId);
      return { success: true, action: "moveTask", message: "Status da tarefa atualizado." };
    } catch {
      return fail(403, { success: false, action: "moveTask", message: "Você não pode alterar esta tarefa." });
    }
  },

  updateTask: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tasks.update", "/app/tasks");
    const formData = await request.formData();
    const taskId = readFormValue(formData, "taskId");
    const title = readFormValue(formData, "title");
    const description = readFormValue(formData, "description");
    const priority = readFormValue(formData, "priority");
    const dueOn = readFormValue(formData, "dueOn");

    if (!isUuid(taskId) || title.length < 3 || title.length > 180 || description.length > 5000 || !isTaskPriority(priority) || (dueOn && !isValidDate(dueOn))) {
      return fail(400, { success: false, action: "updateTask", message: "Revise os dados da tarefa." });
    }

    try {
      await updateTaskDetails(session.user.id, permissions, taskId, {
        title,
        description,
        priority,
        dueOn: dueOn || null,
      });
      return { success: true, action: "updateTask", message: "Tarefa atualizada." };
    } catch {
      return fail(403, { success: false, action: "updateTask", message: "Você não pode alterar esta tarefa." });
    }
  },

  assignTask: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tasks.assign", "/app/tasks");
    const formData = await request.formData();
    const taskId = readFormValue(formData, "taskId");
    const assigneeId = readFormValue(formData, "assigneeId");
    if (!isUuid(taskId) || !isUuid(assigneeId)) {
      return fail(400, { success: false, action: "assignTask", message: "Responsável inválido." });
    }

    try {
      await assignTask(session.user.id, permissions, taskId, assigneeId);
      return { success: true, action: "assignTask", message: "Responsável atualizado." };
    } catch {
      return fail(403, { success: false, action: "assignTask", message: "Você não pode atribuir esta tarefa a esse integrante." });
    }
  },

  commentTask: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(cookies, "tasks.update", "/app/tasks");
    const formData = await request.formData();
    const taskId = readFormValue(formData, "taskId");
    const body = readFormValue(formData, "body");
    const mentionedUserIds = readUuidList(formData, "mentionedUserIds");

    if (!isUuid(taskId) || body.length < 1 || body.length > 5000) {
      return fail(400, { success: false, action: "commentTask", message: "O comentário deve ter entre 1 e 5.000 caracteres." });
    }

    try {
      await addTaskComment(session.user.id, permissions, taskId, body, mentionedUserIds);
      return { success: true, action: "commentTask", message: "Comentário adicionado." };
    } catch {
      return fail(403, { success: false, action: "commentTask", message: "Você não pode comentar nesta tarefa." });
    }
  },
};
