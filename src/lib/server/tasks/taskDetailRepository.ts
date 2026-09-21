import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { users } from "$lib/server/db/schema";
import {
  taskActivities,
  taskAssignees,
  taskComments,
  taskProjects,
  taskStatuses,
  tasks,
} from "$lib/server/db/taskSchema";
import {
  ensureTaskAccess,
  requireTaskPermissionScope,
  type TaskPermissionMap,
} from "$lib/server/tasks/taskAccess";
import { listProjectMembers } from "$lib/server/tasks/taskProjectRepository";
import type { TaskPriority } from "$lib/server/tasks/taskWorkRepository";

export type UpdateTaskDetailsInput = {
  title: string;
  description: string;
  priority: TaskPriority;
  dueOn: string | null;
};

export async function getTaskDetails(
  actorUserId: string,
  permissions: TaskPermissionMap,
  taskId: string,
) {
  const viewScope = requireTaskPermissionScope(permissions, "tasks.view");
  const context = await ensureTaskAccess(actorUserId, viewScope, taskId);
  const db = getDatabase();

  const [task] = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      projectName: taskProjects.name,
      statusId: tasks.statusId,
      statusName: taskStatuses.name,
      statusClosed: taskStatuses.isClosed,
      title: tasks.title,
      description: tasks.description,
      priority: tasks.priority,
      dueOn: tasks.dueOn,
      completedAt: tasks.completedAt,
      createdBy: tasks.createdBy,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .innerJoin(taskProjects, eq(tasks.projectId, taskProjects.id))
    .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task) throw new Error("TASK_NOT_FOUND");

  const [assignees, comments, activities, projectMembers] = await Promise.all([
    db
      .select({ userId: users.id, name: users.name, email: users.email })
      .from(taskAssignees)
      .innerJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, taskId))
      .orderBy(asc(users.name)),
    db
      .select({
        id: taskComments.id,
        body: taskComments.body,
        createdAt: taskComments.createdAt,
        authorUserId: taskComments.authorUserId,
        authorName: users.name,
      })
      .from(taskComments)
      .leftJoin(users, eq(taskComments.authorUserId, users.id))
      .where(eq(taskComments.taskId, taskId))
      .orderBy(asc(taskComments.createdAt)),
    db
      .select({
        id: taskActivities.id,
        action: taskActivities.action,
        metadata: taskActivities.metadata,
        createdAt: taskActivities.createdAt,
        actorName: users.name,
      })
      .from(taskActivities)
      .leftJoin(users, eq(taskActivities.actorUserId, users.id))
      .where(eq(taskActivities.taskId, taskId))
      .orderBy(desc(taskActivities.createdAt))
      .limit(50),
    listProjectMembers(context.task.projectId),
  ]);

  return { task, assignees, comments, activities, projectMembers };
}

export async function updateTaskDetails(
  actorUserId: string,
  permissions: TaskPermissionMap,
  taskId: string,
  input: UpdateTaskDetailsInput,
): Promise<void> {
  const updateScope = requireTaskPermissionScope(permissions, "tasks.update");
  await ensureTaskAccess(actorUserId, updateScope, taskId);

  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({
        title: input.title.trim(),
        description: input.description.trim(),
        priority: input.priority,
        dueOn: input.dueOn,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId));

    await tx.insert(taskActivities).values({
      taskId,
      actorUserId,
      action: "task.details.updated",
      metadata: {
        priority: input.priority,
        dueOn: input.dueOn,
      },
    });
  });
}

export async function assignTask(
  actorUserId: string,
  permissions: TaskPermissionMap,
  taskId: string,
  assigneeId: string,
): Promise<void> {
  const assignScope = requireTaskPermissionScope(permissions, "tasks.assign");
  const context = await ensureTaskAccess(actorUserId, assignScope, taskId);
  const projectMembers = await listProjectMembers(context.task.projectId);

  if (!projectMembers.some((member) => member.id === assigneeId)) {
    throw new Error("ASSIGNEE_NOT_PROJECT_MEMBER");
  }

  const db = getDatabase();
  const [task] = await db
    .select({ title: tasks.title })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  if (!task) throw new Error("TASK_NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
    await tx.insert(taskAssignees).values({
      taskId,
      userId: assigneeId,
      assignedBy: actorUserId,
    });
    await tx.insert(taskActivities).values({
      taskId,
      actorUserId,
      action: "task.assignee.changed",
      metadata: { assigneeId },
    });

    if (assigneeId !== actorUserId) {
      await tx.insert(internalNotifications).values({
        userId: assigneeId,
        actorUserId,
        kind: "task.assigned",
        title: "Uma tarefa foi atribuída a você",
        body: task.title.slice(0, 500),
        href: `/app/tasks/${taskId}`,
        entityType: "task",
        entityId: taskId,
      });
    }
  });
}

export async function addTaskComment(
  actorUserId: string,
  permissions: TaskPermissionMap,
  taskId: string,
  body: string,
  mentionedUserIds: string[] = [],
): Promise<void> {
  const updateScope = requireTaskPermissionScope(permissions, "tasks.update");
  const context = await ensureTaskAccess(actorUserId, updateScope, taskId);

  const db = getDatabase();
  const [task, projectMembers] = await Promise.all([
    db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, taskId)).limit(1),
    listProjectMembers(context.task.projectId),
  ]);
  if (!task[0]) throw new Error("TASK_NOT_FOUND");

  const allowedMemberIds = new Set(projectMembers.map((member) => member.id));
  const uniqueMentionIds = Array.from(new Set(mentionedUserIds))
    .filter((id) => id !== actorUserId && allowedMemberIds.has(id))
    .slice(0, 20);
  const mentionUsers = uniqueMentionIds.length > 0
    ? await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, uniqueMentionIds), eq(users.status, "active")))
    : [];

  await db.transaction(async (tx) => {
    await tx.insert(taskComments).values({
      taskId,
      authorUserId: actorUserId,
      body: body.trim(),
    });
    await tx.insert(taskActivities).values({
      taskId,
      actorUserId,
      action: "task.comment.added",
      metadata: mentionUsers.length > 0 ? { mentionedUserIds: mentionUsers.map((user) => user.id) } : {},
    });

    if (mentionUsers.length > 0) {
      await tx.insert(internalNotifications).values(
        mentionUsers.map((user) => ({
          userId: user.id,
          actorUserId,
          kind: "task.mention",
          title: "Você foi mencionado em uma tarefa",
          body: `${task[0].title}: ${body.trim()}`.slice(0, 500),
          href: `/app/tasks/${taskId}`,
          entityType: "task",
          entityId: taskId,
        })),
      );
    }
  });
}
