import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { ticketTaskLinks } from "$lib/server/db/supportRoutingSchema";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";
import { taskProjects, taskStatuses, tasks } from "$lib/server/db/taskSchema";
import {
  requireTicketAccess,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";
import { ensureTaskAccess } from "$lib/server/tasks/taskAccess";
import { createTask, type CreateTaskInput } from "$lib/server/tasks/taskRepository";

export async function linkTicketToTask(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  taskId: string,
): Promise<void> {
  const ticketScope = getPermissionScope(permissions, "tickets.reply");
  const taskScope = getPermissionScope(permissions, "tasks.view");
  if (!ticketScope || !taskScope) throw new Error("TICKET_TASK_LINK_NOT_ALLOWED");

  await Promise.all([
    requireTicketAccess(actorUserId, ticketScope, ticketId),
    ensureTaskAccess(actorUserId, taskScope, taskId),
  ]);

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .insert(ticketTaskLinks)
      .values({ ticketId, taskId, createdBy: actorUserId, createdAt: now })
      .onConflictDoNothing();

    // Mantém o campo legado preenchido enquanto outras telas ainda dependem dele.
    await tx
      .update(tickets)
      .set({ linkedTaskId: taskId, updatedAt: now })
      .where(and(eq(tickets.id, ticketId), isNull(tickets.linkedTaskId)));

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.task.linked",
      metadata: { taskId },
    });
  });
}

export async function createTaskFromTicket(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  input: CreateTaskInput,
) {
  const ticketScope = getPermissionScope(permissions, "tickets.reply");
  if (!ticketScope) throw new Error("TICKET_UPDATE_NOT_ALLOWED");
  await requireTicketAccess(actorUserId, ticketScope, ticketId);

  const task = await createTask(actorUserId, permissions, input);
  await linkTicketToTask(actorUserId, permissions, ticketId, task.id);
  return task;
}

export async function listTicketTasks(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
) {
  const ticketScope = getPermissionScope(permissions, "tickets.view");
  const taskScope = getPermissionScope(permissions, "tasks.view");
  if (!ticketScope || !taskScope) return [];
  await requireTicketAccess(actorUserId, ticketScope, ticketId);

  const db = getDatabase();
  const rows = await db
    .select({
      id: tasks.id,
      projectId: tasks.projectId,
      title: tasks.title,
      priority: tasks.priority,
      dueOn: tasks.dueOn,
      completedAt: tasks.completedAt,
      projectName: taskProjects.name,
      statusName: taskStatuses.name,
      statusClosed: taskStatuses.isClosed,
      createdAt: ticketTaskLinks.createdAt,
    })
    .from(ticketTaskLinks)
    .innerJoin(tasks, eq(ticketTaskLinks.taskId, tasks.id))
    .innerJoin(taskProjects, eq(tasks.projectId, taskProjects.id))
    .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
    .where(eq(ticketTaskLinks.ticketId, ticketId))
    .orderBy(asc(ticketTaskLinks.createdAt));

  const visible = await Promise.all(
    rows.map(async (row) => {
      try {
        await ensureTaskAccess(actorUserId, taskScope, row.id);
        return row;
      } catch {
        return null;
      }
    }),
  );
  return visible.filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export async function listTaskTicketOrigins(
  actorUserId: string,
  permissions: SupportPermissionMap,
  taskId: string,
) {
  const taskScope = getPermissionScope(permissions, "tasks.view");
  const ticketScope = getPermissionScope(permissions, "tickets.view");
  if (!taskScope || !ticketScope) return [];
  await ensureTaskAccess(actorUserId, taskScope, taskId);

  const db = getDatabase();
  const rows = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      createdAt: ticketTaskLinks.createdAt,
    })
    .from(ticketTaskLinks)
    .innerJoin(tickets, eq(ticketTaskLinks.ticketId, tickets.id))
    .where(eq(ticketTaskLinks.taskId, taskId))
    .orderBy(asc(ticketTaskLinks.createdAt));

  const visible = await Promise.all(
    rows.map(async (row) => {
      try {
        await requireTicketAccess(actorUserId, ticketScope, row.id);
        return row;
      } catch {
        return null;
      }
    }),
  );
  return visible.filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export async function listTaskTicketOriginsForTasks(
  actorUserId: string,
  permissions: SupportPermissionMap,
  taskIds: string[],
) {
  const uniqueTaskIds = Array.from(new Set(taskIds));
  const taskScope = getPermissionScope(permissions, "tasks.view");
  const ticketScope = getPermissionScope(permissions, "tickets.view");
  if (!taskScope || !ticketScope || uniqueTaskIds.length === 0) {
    return new Map<string, Array<{ id: string; ticketNumber: number; subject: string }>>();
  }

  const accessibleTaskIds = new Set<string>();
  await Promise.all(
    uniqueTaskIds.map(async (taskId) => {
      try {
        await ensureTaskAccess(actorUserId, taskScope, taskId);
        accessibleTaskIds.add(taskId);
      } catch {
        // Tarefas fora do escopo não entram no mapa.
      }
    }),
  );
  if (accessibleTaskIds.size === 0) {
    return new Map<string, Array<{ id: string; ticketNumber: number; subject: string }>>();
  }

  const db = getDatabase();
  const rows = await db
    .select({
      taskId: ticketTaskLinks.taskId,
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
    })
    .from(ticketTaskLinks)
    .innerJoin(tickets, eq(ticketTaskLinks.ticketId, tickets.id))
    .where(inArray(ticketTaskLinks.taskId, Array.from(accessibleTaskIds)))
    .orderBy(asc(ticketTaskLinks.createdAt));

  const accessibleTickets = new Map<string, boolean>();
  for (const row of rows) {
    if (accessibleTickets.has(row.id)) continue;
    try {
      await requireTicketAccess(actorUserId, ticketScope, row.id);
      accessibleTickets.set(row.id, true);
    } catch {
      accessibleTickets.set(row.id, false);
    }
  }

  const result = new Map<string, Array<{ id: string; ticketNumber: number; subject: string }>>();
  for (const row of rows) {
    if (!accessibleTickets.get(row.id)) continue;
    const current = result.get(row.taskId) ?? [];
    current.push({ id: row.id, ticketNumber: row.ticketNumber, subject: row.subject });
    result.set(row.taskId, current);
  }
  return result;
}
