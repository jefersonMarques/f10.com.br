import { eq, inArray } from "drizzle-orm";
import {
  getPermissionScope,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { teamMembers } from "$lib/server/db/schema";
import {
  taskAssignees,
  taskProjectMembers,
  taskProjects,
  tasks,
} from "$lib/server/db/taskSchema";

export type TaskPermissionMap = Map<string, PermissionScope>;

async function getDirectProjectIds(userId: string): Promise<string[]> {
  const db = getDatabase();
  const [memberships, created] = await Promise.all([
    db
      .select({ projectId: taskProjectMembers.projectId })
      .from(taskProjectMembers)
      .where(eq(taskProjectMembers.userId, userId)),
    db
      .select({ id: taskProjects.id })
      .from(taskProjects)
      .where(eq(taskProjects.createdBy, userId)),
  ]);

  return Array.from(
    new Set([
      ...memberships.map((membership) => membership.projectId),
      ...created.map((project) => project.id),
    ]),
  );
}

async function getTeamProjectIds(userId: string): Promise<string[]> {
  const db = getDatabase();
  const memberships = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));
  const teamIds = memberships.map((membership) => membership.teamId);

  if (teamIds.length === 0) return [];

  const projects = await db
    .select({ id: taskProjects.id })
    .from(taskProjects)
    .where(inArray(taskProjects.teamId, teamIds));

  return projects.map((project) => project.id);
}

export async function getAccessibleTaskProjectIds(
  userId: string,
  scope: PermissionScope,
): Promise<string[] | null> {
  if (scope === "all") return null;

  const directProjectIds = await getDirectProjectIds(userId);
  if (scope === "own") return directProjectIds;

  const teamProjectIds = await getTeamProjectIds(userId);
  return Array.from(new Set([...directProjectIds, ...teamProjectIds]));
}

export async function ensureTaskProjectAccess(
  userId: string,
  scope: PermissionScope,
  projectId: string,
): Promise<void> {
  const accessibleProjectIds = await getAccessibleTaskProjectIds(userId, scope);

  if (accessibleProjectIds === null) return;
  if (!accessibleProjectIds.includes(projectId)) {
    throw new Error("PROJECT_NOT_ACCESSIBLE");
  }
}

export async function getTaskAccessContext(taskId: string) {
  const db = getDatabase();
  const [task] = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      statusId: tasks.statusId,
      createdBy: tasks.createdBy,
    })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task) throw new Error("TASK_NOT_FOUND");

  const assignees = await db
    .select({ userId: taskAssignees.userId })
    .from(taskAssignees)
    .where(eq(taskAssignees.taskId, taskId));

  return {
    task,
    assigneeIds: assignees.map((assignee) => assignee.userId),
  };
}

export async function ensureTaskAccess(
  userId: string,
  scope: PermissionScope,
  taskId: string,
) {
  const context = await getTaskAccessContext(taskId);

  if (scope === "own") {
    const isOwn =
      context.task.createdBy === userId || context.assigneeIds.includes(userId);

    if (!isOwn) throw new Error("TASK_NOT_ACCESSIBLE");
    return context;
  }

  await ensureTaskProjectAccess(userId, scope, context.task.projectId);
  return context;
}

export function requireTaskPermissionScope(
  permissions: TaskPermissionMap,
  permissionCode: string,
): PermissionScope {
  const scope = getPermissionScope(permissions, permissionCode);
  if (!scope) throw new Error("TASK_PERMISSION_NOT_ALLOWED");
  return scope;
}
