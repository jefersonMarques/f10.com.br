import {
  and,
  asc,
  eq,
  inArray,
  or,
} from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import {
  getPermissionScope,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { teamMembers, users } from "$lib/server/db/schema";
import {
  taskActivities,
  taskAssignees,
  taskProjectMembers,
  taskProjects,
  taskStatuses,
  tasks,
} from "$lib/server/db/taskSchema";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export type CreateTaskInput = {
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueAt: Date | null;
  assigneeId: string | null;
};

export type CreateTaskProjectInput = {
  name: string;
  description: string;
  memberIds: string[];
};

type PermissionMap = Map<string, PermissionScope>;

async function getDirectProjectIds(userId: string): Promise<string[]> {
  const db = getDatabase();
  const memberships = await db
    .select({ projectId: taskProjectMembers.projectId })
    .from(taskProjectMembers)
    .where(eq(taskProjectMembers.userId, userId));
  const created = await db
    .select({ id: taskProjects.id })
    .from(taskProjects)
    .where(eq(taskProjects.createdBy, userId));

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

async function getAccessibleProjectIds(
  userId: string,
  scope: PermissionScope,
): Promise<string[] | null> {
  if (scope === "all") return null;

  const directProjectIds = await getDirectProjectIds(userId);
  if (scope === "own") return directProjectIds;

  const teamProjectIds = await getTeamProjectIds(userId);
  return Array.from(new Set([...directProjectIds, ...teamProjectIds]));
}

async function ensureProjectAccess(
  userId: string,
  scope: PermissionScope,
  projectId: string,
): Promise<void> {
  const accessibleProjectIds = await getAccessibleProjectIds(userId, scope);

  if (accessibleProjectIds === null) return;
  if (!accessibleProjectIds.includes(projectId)) {
    throw new Error("PROJECT_NOT_ACCESSIBLE");
  }
}

async function getTaskAccessContext(taskId: string) {
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

async function ensureTaskAccess(
  userId: string,
  scope: PermissionScope,
  taskId: string,
): Promise<Awaited<ReturnType<typeof getTaskAccessContext>>> {
  const context = await getTaskAccessContext(taskId);

  if (scope === "own") {
    const isOwn =
      context.task.createdBy === userId || context.assigneeIds.includes(userId);
    if (!isOwn) throw new Error("TASK_NOT_ACCESSIBLE");
    return context;
  }

  await ensureProjectAccess(userId, scope, context.task.projectId);
  return context;
}

export async function listTaskProjects(
  userId: string,
  permissions: PermissionMap,
) {
  const scope = getPermissionScope(permissions, "tasks.view");
  if (!scope) return [];

  const db = getDatabase();
  const accessibleProjectIds = await getAccessibleProjectIds(userId, scope);

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

export async function getTaskBoard(
  userId: string,
  permissions: PermissionMap,
  projectId: string,
) {
  const scope = getPermissionScope(permissions, "tasks.view");
  if (!scope) throw new Error("TASK_VIEW_NOT_ALLOWED");

  await ensureProjectAccess(userId, scope, projectId);

  const db = getDatabase();
  const [project] = await db
    .select({
      id: taskProjects.id,
      name: taskProjects.name,
      description: taskProjects.description,
    })
    .from(taskProjects)
    .where(and(eq(taskProjects.id, projectId), eq(taskProjects.active, true)))
    .limit(1);

  if (!project) throw new Error("PROJECT_NOT_FOUND");

  const [statuses, taskRows, assigneeRows] = await Promise.all([
    db
      .select({
        id: taskStatuses.id,
        code: taskStatuses.code,
        name: taskStatuses.name,
        sortOrder: taskStatuses.sortOrder,
        isClosed: taskStatuses.isClosed,
      })
      .from(taskStatuses)
      .where(eq(taskStatuses.projectId, projectId))
      .orderBy(asc(taskStatuses.sortOrder)),
    db
      .select({
        id: tasks.id,
        statusId: tasks.statusId,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        dueAt: tasks.dueAt,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId)),
    db
      .select({
        taskId: taskAssignees.taskId,
        userId: taskAssignees.userId,
        name: users.name,
      })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .where(eq(tasks.projectId, projectId)),
  ]);

  const assigneesByTask = new Map<
    string,
    Array<{ userId: string; name: string }>
  >();

  for (const assignee of assigneeRows) {
    const current = assigneesByTask.get(assignee.taskId) ?? [];
    current.push({ userId: assignee.userId, name: assignee.name });
    assigneesByTask.set(assignee.taskId, current);
  }

  const visibleTasks = taskRows
    .filter((task) => {
      if (scope !== "own") return true;
      return (
        task.createdBy === userId ||
        (assigneesByTask.get(task.id) ?? []).some(
          (assignee) => assignee.userId === userId,
        )
      );
    })
    .map((task) => ({
      ...task,
      assignees: assigneesByTask.get(task.id) ?? [],
    }));

  return { project, statuses, tasks: visibleTasks };
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

export async function createTaskProject(
  actorUserId: string,
  input: CreateTaskProjectInput,
) {
  const db = getDatabase();
  const memberIds = Array.from(new Set([actorUserId, ...input.memberIds]));

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

export async function addTaskProjectMember(
  actorUserId: string,
  projectId: string,
  userId: string,
): Promise<void> {
  const db = getDatabase();
  const [activeUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.status, "active")))
    .limit(1);

  if (!activeUser) throw new Error("USER_NOT_ACTIVE");

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

export async function createTask(
  actorUserId: string,
  permissions: PermissionMap,
  input: CreateTaskInput,
) {
  const createScope = getPermissionScope(permissions, "tasks.create");
  if (!createScope) throw new Error("TASK_CREATE_NOT_ALLOWED");

  await ensureProjectAccess(actorUserId, createScope, input.projectId);

  const db = getDatabase();
  const [initialStatus] = await db
    .select({ id: taskStatuses.id })
    .from(taskStatuses)
    .where(
      and(
        eq(taskStatuses.projectId, input.projectId),
        eq(taskStatuses.isClosed, false),
      ),
    )
    .orderBy(asc(taskStatuses.sortOrder))
    .limit(1);

  if (!initialStatus) throw new Error("PROJECT_WITHOUT_OPEN_STATUS");

  const assignScope = getPermissionScope(permissions, "tasks.assign");
  const assigneeId = assignScope && input.assigneeId
    ? input.assigneeId
    : actorUserId;
  const members = await listProjectMembers(input.projectId);

  if (!members.some((member) => member.id === assigneeId)) {
    throw new Error("ASSIGNEE_NOT_PROJECT_MEMBER");
  }

  const task = await db.transaction(async (tx) => {
    const [createdTask] = await tx
      .insert(tasks)
      .values({
        projectId: input.projectId,
        statusId: initialStatus.id,
        title: input.title.trim(),
        description: input.description.trim(),
        priority: input.priority,
        dueAt: input.dueAt,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning({ id: tasks.id, title: tasks.title });

    if (!createdTask) throw new Error("TASK_NOT_CREATED");

    await tx.insert(taskAssignees).values({
      taskId: createdTask.id,
      userId: assigneeId,
      assignedBy: actorUserId,
    });

    await tx.insert(taskActivities).values({
      taskId: createdTask.id,
      actorUserId,
      action: "task.created",
      metadata: { assigneeId },
    });

    return createdTask;
  });

  return task;
}

export async function moveTask(
  actorUserId: string,
  permissions: PermissionMap,
  taskId: string,
  statusId: string,
): Promise<void> {
  const updateScope = getPermissionScope(permissions, "tasks.update");
  if (!updateScope) throw new Error("TASK_UPDATE_NOT_ALLOWED");

  const context = await ensureTaskAccess(actorUserId, updateScope, taskId);
  const db = getDatabase();
  const [status] = await db
    .select({
      id: taskStatuses.id,
      projectId: taskStatuses.projectId,
      name: taskStatuses.name,
      isClosed: taskStatuses.isClosed,
    })
    .from(taskStatuses)
    .where(eq(taskStatuses.id, statusId))
    .limit(1);

  if (!status || status.projectId !== context.task.projectId) {
    throw new Error("STATUS_NOT_IN_PROJECT");
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({
        statusId,
        completedAt: status.isClosed ? now : null,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId));

    await tx.insert(taskActivities).values({
      taskId,
      actorUserId,
      action: "task.status.changed",
      metadata: {
        previousStatusId: context.task.statusId,
        statusId,
        statusName: status.name,
      },
    });
  });
}
