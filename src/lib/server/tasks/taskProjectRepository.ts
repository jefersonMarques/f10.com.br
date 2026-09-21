import { and, asc, eq, inArray } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import {
  taskAssignees,
  taskProjectMembers,
  taskProjects,
  taskStatuses,
  tasks,
} from "$lib/server/db/taskSchema";
import {
  ensureTaskProjectAccess,
  getAccessibleTaskProjectIds,
  requireTaskPermissionScope,
  type TaskPermissionMap,
} from "$lib/server/tasks/taskAccess";

export type CreateTaskProjectInput = {
  name: string;
  description: string;
  memberIds: string[];
};

export type UpdateTaskProjectInput = {
  name: string;
  description: string;
};

export async function listTaskProjects(
  userId: string,
  permissions: TaskPermissionMap,
) {
  const scope = requireTaskPermissionScope(permissions, "tasks.view");
  const db = getDatabase();
  const accessibleProjectIds = await getAccessibleTaskProjectIds(userId, scope);

  if (accessibleProjectIds !== null && accessibleProjectIds.length === 0) {
    return [];
  }

  return db
    .select({
      id: taskProjects.id,
      name: taskProjects.name,
      description: taskProjects.description,
      active: taskProjects.active,
    })
    .from(taskProjects)
    .where(
      accessibleProjectIds === null
        ? eq(taskProjects.active, true)
        : and(
            eq(taskProjects.active, true),
            inArray(taskProjects.id, accessibleProjectIds),
          ),
    )
    .orderBy(asc(taskProjects.name));
}

export async function getTaskProject(
  actorUserId: string,
  permissions: TaskPermissionMap,
  projectId: string,
) {
  const scope = requireTaskPermissionScope(permissions, "tasks.view");
  await ensureTaskProjectAccess(actorUserId, scope, projectId);
  const db = getDatabase();
  const [project] = await db
    .select({
      id: taskProjects.id,
      name: taskProjects.name,
      description: taskProjects.description,
      active: taskProjects.active,
      createdBy: taskProjects.createdBy,
      createdAt: taskProjects.createdAt,
      updatedAt: taskProjects.updatedAt,
    })
    .from(taskProjects)
    .where(eq(taskProjects.id, projectId))
    .limit(1);

  if (!project) throw new Error("PROJECT_NOT_FOUND");
  return project;
}

export async function listActiveTaskUsers() {
  const db = getDatabase();

  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.status, "active"))
    .orderBy(asc(users.name));
}

export async function listProjectMembers(projectId: string) {
  const db = getDatabase();

  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(taskProjectMembers)
    .innerJoin(users, eq(taskProjectMembers.userId, users.id))
    .where(eq(taskProjectMembers.projectId, projectId))
    .orderBy(asc(users.name));
}

async function validateActiveMemberIds(memberIds: string[]): Promise<void> {
  const uniqueIds = Array.from(new Set(memberIds));
  if (uniqueIds.length === 0) return;

  const db = getDatabase();
  const activeUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, uniqueIds), eq(users.status, "active")));

  if (activeUsers.length !== uniqueIds.length) {
    throw new Error("PROJECT_MEMBER_NOT_ACTIVE");
  }
}

export async function createTaskProject(
  actorUserId: string,
  input: CreateTaskProjectInput,
) {
  const selectedMemberIds = Array.from(new Set(input.memberIds));
  await validateActiveMemberIds(selectedMemberIds);

  const db = getDatabase();
  const memberIds = Array.from(new Set([actorUserId, ...selectedMemberIds]));

  const project = await db.transaction(async (tx) => {
    const [createdProject] = await tx
      .insert(taskProjects)
      .values({
        name: input.name.trim(),
        description: input.description.trim(),
        createdBy: actorUserId,
      })
      .returning({ id: taskProjects.id, name: taskProjects.name });

    if (!createdProject) throw new Error("PROJECT_NOT_CREATED");

    await tx.insert(taskProjectMembers).values(
      memberIds.map((userId) => ({ projectId: createdProject.id, userId })),
    );

    await tx.insert(taskStatuses).values([
      {
        projectId: createdProject.id,
        code: "todo",
        name: "A fazer",
        sortOrder: 10,
        isClosed: false,
      },
      {
        projectId: createdProject.id,
        code: "in-progress",
        name: "Em andamento",
        sortOrder: 20,
        isClosed: false,
      },
      {
        projectId: createdProject.id,
        code: "done",
        name: "Concluído",
        sortOrder: 30,
        isClosed: true,
      },
    ]);

    return createdProject;
  });

  await recordAuditEvent({
    actorUserId,
    action: "task.project.created",
    entityType: "task_project",
    entityId: project.id,
    metadata: { name: project.name, memberCount: memberIds.length },
  });

  return project;
}

export async function updateTaskProject(
  actorUserId: string,
  permissions: TaskPermissionMap,
  projectId: string,
  input: UpdateTaskProjectInput,
): Promise<void> {
  const scope = requireTaskPermissionScope(permissions, "tasks.manage");
  await ensureTaskProjectAccess(actorUserId, scope, projectId);
  const db = getDatabase();
  const now = new Date();

  await db
    .update(taskProjects)
    .set({
      name: input.name.trim(),
      description: input.description.trim(),
      updatedAt: now,
    })
    .where(eq(taskProjects.id, projectId));

  await recordAuditEvent({
    actorUserId,
    action: "task.project.updated",
    entityType: "task_project",
    entityId: projectId,
    metadata: { name: input.name.trim() },
  });
}

export async function addTaskProjectMember(
  actorUserId: string,
  projectId: string,
  userId: string,
): Promise<void> {
  await validateActiveMemberIds([userId]);

  const db = getDatabase();
  const [project] = await db
    .select({ id: taskProjects.id })
    .from(taskProjects)
    .where(and(eq(taskProjects.id, projectId), eq(taskProjects.active, true)))
    .limit(1);

  if (!project) throw new Error("PROJECT_NOT_FOUND");

  await db
    .insert(taskProjectMembers)
    .values({ projectId, userId })
    .onConflictDoNothing();

  await recordAuditEvent({
    actorUserId,
    action: "task.project.member.added",
    entityType: "task_project",
    entityId: projectId,
    metadata: { userId },
  });
}

export async function removeTaskProjectMember(
  actorUserId: string,
  projectId: string,
  userId: string,
): Promise<void> {
  const db = getDatabase();
  const [project] = await db
    .select({ id: taskProjects.id, createdBy: taskProjects.createdBy })
    .from(taskProjects)
    .where(eq(taskProjects.id, projectId))
    .limit(1);

  if (!project) throw new Error("PROJECT_NOT_FOUND");
  if (project.createdBy === userId) throw new Error("PROJECT_OWNER_CANNOT_BE_REMOVED");

  await db.transaction(async (tx) => {
    await tx
      .delete(taskProjectMembers)
      .where(
        and(
          eq(taskProjectMembers.projectId, projectId),
          eq(taskProjectMembers.userId, userId),
        ),
      );

    const projectTasks = await tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    if (projectTasks.length > 0) {
      await tx
        .delete(taskAssignees)
        .where(
          and(
            inArray(
              taskAssignees.taskId,
              projectTasks.map((task) => task.id),
            ),
            eq(taskAssignees.userId, userId),
          ),
        );
    }
  });

  await recordAuditEvent({
    actorUserId,
    action: "task.project.member.removed",
    entityType: "task_project",
    entityId: projectId,
    metadata: { userId },
  });
}
