import { eq } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";
import {
  requireTicketAccess,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";

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
  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({ linkedTaskId: taskId, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.task.linked",
      metadata: { taskId },
    });
  });
}
