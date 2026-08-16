import { and, asc, eq, isNull } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { ticketTaskLinks } from "$lib/server/db/supportRoutingSchema";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";
import { taskProjects, taskStatuses, tasks } from "$lib/server/db/taskSchema";
import {
  requireTicketAccess,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";
import { createTask, type CreateTaskInput } from "$lib/server/tasks/taskRepository";

export async function linkTicketToTask(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  taskId: string,
): Promise<void> {
  const scope = getPermissionScope(permissions, "tickets.reply");
  if (!scope) throw new Error("TICKET_UPDATE_NOT_ALLOWED");

  await requireTicketAccess(actorUserId, scope, ticketId);

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

export async function listTicketTasks(ticketId: string) {
  const db = getDatabase();
  return db
    .select({
      id: tasks.id,
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
}

export async function listTaskTicketOrigins(taskId: string) {
  const db = getDatabase();
  return db
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
}
