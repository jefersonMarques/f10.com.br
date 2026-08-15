import {
  error,
  fail,
  redirect,
  type Actions,
} from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getPermissionScope,
  hasPermission,
} from "$lib/server/auth/permissions";
import { ensureTaskProjectAccess } from "$lib/server/tasks/taskAccess";
import {
  addTaskProjectMember,
  createTask,
  createTaskProject,
  getTaskBoard,
  listActiveTaskUsers,
  listProjectMembers,
  listTaskProjects,
  moveTask,
  removeTaskProjectMember,
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

export const load: PageServerLoad = async ({ parent, url }) => {
  const layout = await parent();
  const permissionMap = createPermissionMap(layout.permissions);

  if (!hasPermission(permissionMap, "tasks.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const projects = await listTaskProjects(layout.user.id, permissionMap);
  const requestedProjectId = url.searchParams.get("project") ?? "";
  const selectedProject =
    projects.find((project) => project.id === requestedProjectId) ?? projects[0] ?? null;
  const canManage = hasPermission(permissionMap, "tasks.manage");
  const canCreate = hasPermission(permissionMap, "tasks.create");
  const canUpdate = hasPermission(permissionMap, "tasks.update");
  const canAssign = hasPermission(permissionMap, "tasks.assign");

  if (!selectedProject) {
    return {
      projects,
      selectedProjectId: null,
      board: null,
      members: [],
      activeUsers: canManage ? await listActiveTaskUsers() : [],
      canManage,
      canCreate,
      canUpdate,
      canAssign,
    };
  }

  const [board, members, activeUsers] = await Promise.all([
    getTaskBoard(layout.user.id, permissionMap, selectedProject.id),
    listProjectMembers(selectedProject.id),
    canManage ? listActiveTaskUsers() : Promise.resolve([]),
  ]);

  return {
    projects,
    selectedProjectId: selectedProject.id,
    board,
    members,
    activeUsers,
    canManage,
    canCreate,
    canUpdate,
    canAssign,
  };
};

export const actions: Actions = {
  createProject: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "tasks.manage",
      "/app/tasks",
    );
    const formData = await request.formData();
    const name = readFormValue(formData, "name");
    const description = readFormValue(formData, "description");
    const memberIds = readUuidList(formData, "memberIds");

    if (name.length < 2 || name.length > 120) {
      return fail(400, {
        success: false,
        action: "createProject",
        message: "Informe um nome de projeto entre 2 e 120 caracteres.",
      });
    }

    if (description.length > 1000) {
      return fail(400, {
        success: false,
        action: "createProject",
        message: "A descrição do projeto deve ter no máximo 1.000 caracteres.",
      });
    }

    try {
      const project = await createTaskProject(session.user.id, {
        name,
        description,
        memberIds,
      });

      throw redirect(303, `/app/tasks?project=${project.id}`);
    } catch (cause) {
      if (
        cause &&
        typeof cause === "object" &&
        "status" in cause &&
        cause.status === 303
      ) {
        throw cause;
      }

      return fail(409, {
        success: false,
        action: "createProject",
        message: "Não foi possível criar o projeto com os membros selecionados.",
      });
    }
  },

  createTask: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tasks.create",
      "/app/tasks",
    );
    const formData = await request.formData();
    const projectId = readFormValue(formData, "projectId");
    const title = readFormValue(formData, "title");
    const description = readFormValue(formData, "description");
    const priority = readFormValue(formData, "priority");
    const requestedDueOn = readFormValue(formData, "dueOn");
    const requestedAssigneeId = readFormValue(formData, "assigneeId");

    if (!isUuid(projectId)) {
      return fail(400, {
        success: false,
        action: "createTask",
        message: "Projeto inválido.",
      });
    }

    if (title.length < 3 || title.length > 180) {
      return fail(400, {
        success: false,
        action: "createTask",
        message: "Informe um título entre 3 e 180 caracteres.",
      });
    }

    if (description.length > 5000) {
      return fail(400, {
        success: false,
        action: "createTask",
        message: "A descrição deve ter no máximo 5.000 caracteres.",
      });
    }

    if (!isTaskPriority(priority)) {
      return fail(400, {
        success: false,
        action: "createTask",
        message: "Prioridade inválida.",
      });
    }

    if (requestedDueOn && !isValidDate(requestedDueOn)) {
      return fail(400, {
        success: false,
        action: "createTask",
        message: "Data de prazo inválida.",
      });
    }

    if (requestedAssigneeId && !isUuid(requestedAssigneeId)) {
      return fail(400, {
        success: false,
        action: "createTask",
        message: "Responsável inválido.",
      });
    }

    try {
      await createTask(session.user.id, permissions, {
        projectId,
        title,
        description,
        priority,
        dueOn: requestedDueOn || null,
        assigneeId: requestedAssigneeId || null,
      });

      return {
        success: true,
        action: "createTask",
        message: "Tarefa criada.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "createTask",
        message: "Não foi possível criar esta tarefa no projeto selecionado.",
      });
    }
  },

  moveTask: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tasks.update",
      "/app/tasks",
    );
    const formData = await request.formData();
    const taskId = readFormValue(formData, "taskId");
    const statusId = readFormValue(formData, "statusId");

    if (!isUuid(taskId) || !isUuid(statusId)) {
      return fail(400, {
        success: false,
        action: "moveTask",
        message: "Tarefa ou status inválido.",
      });
    }

    try {
      await moveTask(session.user.id, permissions, taskId, statusId);

      return {
        success: true,
        action: "moveTask",
        message: "Status da tarefa atualizado.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "moveTask",
        message: "Você não pode alterar esta tarefa.",
      });
    }
  },

  addMember: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tasks.manage",
      "/app/tasks",
    );
    const formData = await request.formData();
    const projectId = readFormValue(formData, "projectId");
    const userId = readFormValue(formData, "userId");
    const scope = getPermissionScope(permissions, "tasks.manage");

    if (!isUuid(projectId) || !isUuid(userId) || !scope) {
      return fail(400, {
        success: false,
        action: "addMember",
        message: "Projeto ou usuário inválido.",
      });
    }

    try {
      await ensureTaskProjectAccess(session.user.id, scope, projectId);
      await addTaskProjectMember(session.user.id, projectId, userId);

      return {
        success: true,
        action: "addMember",
        message: "Integrante adicionado ao projeto.",
      };
    } catch {
      return fail(403, {
        success: false,
        action: "addMember",
        message: "Não foi possível adicionar este integrante ao projeto.",
      });
    }
  },

  removeMember: async ({ cookies, request }) => {
    const { session, permissions } = await requireAppPermission(
      cookies,
      "tasks.manage",
      "/app/tasks",
    );
    const formData = await request.formData();
    const projectId = readFormValue(formData, "projectId");
    const userId = readFormValue(formData, "userId");
    const scope = getPermissionScope(permissions, "tasks.manage");

    if (!isUuid(projectId) || !isUuid(userId) || !scope) {
      return fail(400, {
        success: false,
        action: "removeMember",
        message: "Projeto ou usuário inválido.",
      });
    }

    try {
      await ensureTaskProjectAccess(session.user.id, scope, projectId);
      await removeTaskProjectMember(session.user.id, projectId, userId);

      return {
        success: true,
        action: "removeMember",
        message: "Integrante removido do projeto.",
      };
    } catch (cause) {
      const message =
        cause instanceof Error &&
        cause.message === "PROJECT_OWNER_CANNOT_BE_REMOVED"
          ? "O criador do projeto não pode ser removido."
          : "Não foi possível remover este integrante do projeto.";

      return fail(409, {
        success: false,
        action: "removeMember",
        message,
      });
    }
  },
};
