import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  createTask,
  getTaskBoard,
  listMyTasks,
  listProjectMembers,
  listTaskProjects,
  type TaskPriority,
} from "$lib/server/tasks/taskRepository";

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

function createPermissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(permissions.map((permission) => [permission.code, permission.scope]));
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

  const sourceTasks = selectedProject
    ? (await getTaskBoard(layout.user.id, permissions, selectedProject.id)).tasks.map((task) => ({
        ...task,
        projectName: selectedProject.name,
        statusName: "",
        statusClosed: Boolean(task.completedAt),
      }))
    : await listMyTasks(layout.user.id, permissions);

  const membersByProject = canAssign
    ? Object.fromEntries(
        await Promise.all(
          projects.map(async (project) => [project.id, await listProjectMembers(project.id)] as const),
        ),
      )
    : {};

  return {
    projects,
    selectedProjectId: selectedProject?.id ?? null,
    tasks: sourceTasks,
    membersByProject,
    canCreate,
    canAssign,
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

    try {
      await createTask(session.user.id, permissions, {
        projectId,
        title,
        description: "",
        priority,
        dueOn,
        assigneeId: requestedAssigneeId || null,
      });
      return { success: true, action: "createTask", message: "Tarefa criada." };
    } catch {
      return fail(403, { success: false, action: "createTask", message: "Não foi possível criar a tarefa neste projeto." });
    }
  },
};
