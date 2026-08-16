import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { ensureTaskProjectAccess } from "$lib/server/tasks/taskAccess";
import {
  addTaskProjectMember,
  getTaskProject,
  listActiveTaskUsers,
  listProjectMembers,
  removeTaskProjectMember,
  updateTaskProject,
} from "$lib/server/tasks/taskRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function readFormValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.projectId)) throw error(404, "Projeto não encontrado.");
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "tasks.manage")) throw error(403, "Acesso não autorizado.");

  try {
    const [project, members, activeUsers] = await Promise.all([
      getTaskProject(layout.user.id, permissions, params.projectId),
      listProjectMembers(params.projectId),
      listActiveTaskUsers(),
    ]);
    return { project, members, activeUsers };
  } catch {
    throw error(404, "Projeto não encontrado ou fora do seu escopo.");
  }
};

export const actions: Actions = {
  updateProject: async ({ cookies, params, request }) => {
    if (!isUuid(params.projectId)) return fail(404, { success: false, message: "Projeto não encontrado." });
    const { session, permissions } = await requireAppPermission(cookies, "tasks.manage", `/app/tasks/projects/${params.projectId}/settings`);
    const formData = await request.formData();
    const name = readFormValue(formData, "name");
    const description = readFormValue(formData, "description");
    if (name.length < 2 || name.length > 120 || description.length > 1000) {
      return fail(400, { success: false, action: "updateProject", message: "Revise nome e descrição do projeto." });
    }
    try {
      await updateTaskProject(session.user.id, permissions, params.projectId, { name, description });
      return { success: true, action: "updateProject", message: "Projeto atualizado." };
    } catch {
      return fail(403, { success: false, action: "updateProject", message: "Não foi possível atualizar este projeto." });
    }
  },

  addMember: async ({ cookies, params, request }) => {
    if (!isUuid(params.projectId)) return fail(404, { success: false, message: "Projeto não encontrado." });
    const { session, permissions } = await requireAppPermission(cookies, "tasks.manage", `/app/tasks/projects/${params.projectId}/settings`);
    const formData = await request.formData();
    const userId = readFormValue(formData, "userId");
    const scope = getPermissionScope(permissions, "tasks.manage");
    if (!isUuid(userId) || !scope) return fail(400, { success: false, action: "addMember", message: "Usuário inválido." });
    try {
      await ensureTaskProjectAccess(session.user.id, scope, params.projectId);
      await addTaskProjectMember(session.user.id, params.projectId, userId);
      return { success: true, action: "addMember", message: "Integrante adicionado." };
    } catch {
      return fail(403, { success: false, action: "addMember", message: "Não foi possível adicionar este integrante." });
    }
  },

  removeMember: async ({ cookies, params, request }) => {
    if (!isUuid(params.projectId)) return fail(404, { success: false, message: "Projeto não encontrado." });
    const { session, permissions } = await requireAppPermission(cookies, "tasks.manage", `/app/tasks/projects/${params.projectId}/settings`);
    const formData = await request.formData();
    const userId = readFormValue(formData, "userId");
    const scope = getPermissionScope(permissions, "tasks.manage");
    if (!isUuid(userId) || !scope) return fail(400, { success: false, action: "removeMember", message: "Usuário inválido." });
    try {
      await ensureTaskProjectAccess(session.user.id, scope, params.projectId);
      await removeTaskProjectMember(session.user.id, params.projectId, userId);
      return { success: true, action: "removeMember", message: "Integrante removido." };
    } catch (cause) {
      const message = cause instanceof Error && cause.message === "PROJECT_OWNER_CANNOT_BE_REMOVED"
        ? "O criador do projeto não pode ser removido."
        : "Não foi possível remover este integrante.";
      return fail(409, { success: false, action: "removeMember", message });
    }
  },
};
