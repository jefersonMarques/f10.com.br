import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { supportMessageTaskLinks, type TaskMessageOrigin } from "$lib/server/db/supportMessageTaskSchema";
import { ticketTaskLinks } from "$lib/server/db/supportRoutingSchema";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";
import { users } from "$lib/server/db/schema";
import {
  taskActivities,
  taskAssignees,
  taskProjects,
  taskStatuses,
  tasks,
} from "$lib/server/db/taskSchema";
import {
  ensureTaskAccess,
  ensureTaskProjectAccess,
  requireTaskPermissionScope,
  type TaskPermissionMap,
} from "$lib/server/tasks/taskAccess";
import { listAssignableTaskMembers } from "$lib/server/tasks/taskAssigneeAccess";

export type TaskPriority = "low" | "normal" | "high" | "urgent";

export type CreateTaskInput = {
  projectId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueOn: string | null;
  assigneeId: string | null;
  messageOrigin?: TaskMessageOrigin;
};

export async function listMyTasks(
  userId: string,
  permissions: TaskPermissionMap,
) {
  requireTaskPermissionScope(permissions, "tasks.view");
  const db = getDatabase();

  return db
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
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(taskAssignees)
    .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
    .innerJoin(taskProjects, eq(tasks.projectId, taskProjects.id))
    .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
    .where(and(eq(taskAssignees.userId, userId), eq(taskProjects.active, true)))
    .orderBy(asc(taskStatuses.isClosed), asc(tasks.dueOn), asc(tasks.createdAt));
}

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
        dueOn: tasks.dueOn,
        completedAt: tasks.completedAt,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.dueOn), asc(tasks.createdAt)),
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

  const assigneeId = input.assigneeId ?? actorUserId;
  const allowedMembers = await listAssignableTaskMembers(
    actorUserId,
    permissions,
    input.projectId,
  );
  if (!allowedMembers.some((member) => member.id === assigneeId)) {
    throw new Error("TASK_ASSIGNEE_NOT_ALLOWED");
  }

  return db.transaction(async (tx) => {
    if (input.messageOrigin) {
      // Serializa tentativas repetidas para não criar tarefas duplicadas.
      await tx.execute(sql`
        SELECT pg_advisory_xact_lock(hashtext(${input.messageOrigin.requestKey}))
      `);
      const [existing] = await tx
        .select({
          taskId: supportMessageTaskLinks.taskId,
          messageId: supportMessageTaskLinks.messageId,
          sourceKind: supportMessageTaskLinks.sourceKind,
          createdBy: supportMessageTaskLinks.createdBy,
          title: tasks.title,
        })
        .from(supportMessageTaskLinks)
        .innerJoin(tasks, eq(tasks.id, supportMessageTaskLinks.taskId))
        .where(eq(supportMessageTaskLinks.requestKey, input.messageOrigin.requestKey))
        .limit(1);

      if (existing) {
        if (existing.createdBy !== actorUserId ||
          existing.messageId !== input.messageOrigin.messageId ||
          existing.sourceKind !== input.messageOrigin.sourceKind) {
          throw new Error("TASK_REQUEST_CONFLICT");
        }
        return { id: existing.taskId, title: existing.title };
      }
    }

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

    if (input.messageOrigin) {
      const origin = input.messageOrigin;
      await tx.insert(supportMessageTaskLinks).values({
        sourceKind: origin.sourceKind,
        messageId: origin.messageId,
        taskId: createdTask.id,
        createdBy: actorUserId,
        requestKey: origin.requestKey,
      });

      if (origin.ticketId) {
        await tx.insert(ticketTaskLinks).values({
          ticketId: origin.ticketId,
          taskId: createdTask.id,
          createdBy: actorUserId,
        }).onConflictDoNothing();

        // Compatibilidade com telas anteriores que dependem do vínculo legado.
        await tx.update(tickets)
          .set({ linkedTaskId: createdTask.id, updatedAt: new Date() })
          .where(and(eq(tickets.id, origin.ticketId), isNull(tickets.linkedTaskId)));

        await tx.insert(ticketEvents).values({
          ticketId: origin.ticketId,
          actorUserId,
          eventType: "ticket.task.linked",
          metadata: { taskId: createdTask.id, sourceMessageId: origin.messageId },
        });
      } else {
        await tx.execute(sql`
          UPDATE web_chat_sessions SET updated_at = now()
          WHERE id = (
            SELECT session_id FROM web_chat_messages
            WHERE id = ${origin.messageId}::uuid
          )
        `);
      }
    }

    if (assigneeId !== actorUserId) {
      await tx.insert(internalNotifications).values({
        userId: assigneeId,
        actorUserId,
        kind: "task.assigned",
        title: "Nova tarefa atribuída a você",
        body: createdTask.title.slice(0, 160),
        href: `/app/tasks/${createdTask.id}`,
        entityType: "task",
        entityId: createdTask.id,
      });
    }

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

export async function setTaskCompletion(
  actorUserId: string,
  permissions: TaskPermissionMap,
  taskId: string,
  completed: boolean,
): Promise<void> {
  const updateScope = requireTaskPermissionScope(permissions, "tasks.update");
  const context = await ensureTaskAccess(actorUserId, updateScope, taskId);
  const db = getDatabase();

  const [currentStatus] = await db
    .select({ id: taskStatuses.id, isClosed: taskStatuses.isClosed })
    .from(taskStatuses)
    .where(eq(taskStatuses.id, context.task.statusId))
    .limit(1);

  if (!currentStatus) throw new Error("TASK_STATUS_NOT_FOUND");
  if (currentStatus.isClosed === completed) return;

  const [targetStatus] = await db
    .select({ id: taskStatuses.id, name: taskStatuses.name })
    .from(taskStatuses)
    .where(
      and(
        eq(taskStatuses.projectId, context.task.projectId),
        eq(taskStatuses.isClosed, completed),
      ),
    )
    .orderBy(asc(taskStatuses.sortOrder))
    .limit(1);

  if (!targetStatus) {
    throw new Error(completed ? "PROJECT_WITHOUT_CLOSED_STATUS" : "PROJECT_WITHOUT_OPEN_STATUS");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({
        statusId: targetStatus.id,
        completedAt: completed ? now : null,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(tasks.id, taskId));

    await tx.insert(taskActivities).values({
      taskId,
      actorUserId,
      action: completed ? "task.completed" : "task.reopened",
      metadata: {
        previousStatusId: context.task.statusId,
        statusId: targetStatus.id,
        statusName: targetStatus.name,
      },
    });
  });
}
