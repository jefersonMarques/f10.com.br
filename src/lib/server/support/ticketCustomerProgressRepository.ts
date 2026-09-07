import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketEvents } from "$lib/server/db/supportSchema";

export const CUSTOMER_INTERNAL_MOVEMENT_EVENT_TYPES = [
  "ticket.note.added",
  "ticket.workflow.global.moved",
  "ticket.workflow.area.moved",
  "ticket.workflow.handoff",
  "ticket.task.linked",
  "ticket.assignee.changed",
  "ticket.priority.changed",
  "ticket.due_date.changed",
  "ticket.auto_assigned",
  "chat.auto_assigned",
] as const;

export const CUSTOMER_TEAM_ACTIVITY_EVENT_TYPES = [
  "ticket.agent.first_viewed",
  "ticket.replied",
  "ticket.status.changed",
  ...CUSTOMER_INTERNAL_MOVEMENT_EVENT_TYPES,
] as const;

export async function markTicketFirstAgentView(
  actorUserId: string,
  ticketId: string,
): Promise<void> {
  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`ticket-first-agent-view:${ticketId}`}))`,
    );
    const [existing] = await tx
      .select({ id: ticketEvents.id })
      .from(ticketEvents)
      .where(
        and(
          eq(ticketEvents.ticketId, ticketId),
          eq(ticketEvents.eventType, "ticket.agent.first_viewed"),
        ),
      )
      .limit(1);
    if (existing) return;

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.agent.first_viewed",
      metadata: {},
    });
  });
}
