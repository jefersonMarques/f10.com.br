import { and, asc, eq } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import {
  taskActivities,
  taskAssignees,
  taskStatuses,
  tasks,
} from "$lib/server/db/taskSchema";
import {
  ensureTaskAccess,
  ensureTaskProjectAccess,
  requireTaskPermissionScope,
  type TaskPermissionMap,
} from "$lib/server/tasks/taskAccess";
import { listProjectMembers } from "$lib/server/tasks/taskProjectRepository";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export type CreateTaskInput = {
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueOn: string | null;
  assigneeId: string | null;
};

export async function getTaskBoard(
  userId: string,
  permissions: TaskPermissionMap,
  projectId: string,
) {
  const scope = requireTaskPermissionScope(permissions, "tasks.view");
  await ensureTaskProjectAccess(userId, scope, projectId);

  const db = getDatabase();
  const [project] = await db
    .select({
      id: tasks.projectId,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .limit(1);

  const [projectRow] = await db.query.taskProjects.findMany
    ? []
    : [];

  const projectData = await db.execute<{
    id: string;
    name: string;
    description: string;
  }>(
    `select id, name, description from task_projects where id = '${projectId.replace(/'/g, "''")}' and active = true limit 1`,
  );

  const projectRecord = Array.from(projectData)[0];
  if (!projectRecord) throw new Error("PROJECT_NOT_FOUND");

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
        dueOn: tasks.dueOn,
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

  return {
    project: {
      id: projectRecord.id,
      name: projectRecord.name,
      description: projectRecord.description,
    },
    statuses,
    tasks: visibleTasks,
  };
}

export async function createTask(
  actorUserId: string,
  permissions: TaskPermissionMap,
  input: CreateTaskInput,
) {
  const createScope = requireTaskPermissionScope(permissions, "tasks.create");
  await ensureTaskProjectAccess(actorUserId, createScope, input.projectId);

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
  const assigneeId =
    assignScope && input.assigneeId ? input.assigneeId : actorUserId;
  const members = await listProjectMembers(input.projectId);

  if (!members.some((member) => member.id === assigneeId)) {
    throw new Error("ASSIGNEE_NOT_PROJECT_MEMBER");
  }

  return db.transaction(async (tx) => {
    const [createdTask] = await tx
      .insert(tasks)
      .values({
        projectId: input.projectId,
        statusId: initialStatus.id,
        title: input.title.trim(),
        description: input.description.trim(),
        priority: input.priority,
        dueOn: input.dueOn,
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
}

export async function moveTask(
  actorUserId: string,
  permissions: TaskPermissionMap,
  taskId: string,
  statusId: string,
): Promise<void> {
  const updateScope = requireTaskPermissionScope(permissions, "tasks.update");
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
