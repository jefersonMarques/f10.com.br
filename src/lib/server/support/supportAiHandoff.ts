import { and, eq, or } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { ticketEvents } from "$lib/server/db/supportSchema";

export async function markTicketChatHumanTakeover(
  ticketId: string,
  actorUserId: string,
  reason: string,
): Promise<void> {
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    const [session] = await tx
      .update(webChatSessions)
      .set({
        aiState: "human",
        aiHandoffReason: reason,
        aiHandoffAt: now,
        aiProcessingAt: null,
      })
      .where(
        and(
          eq(webChatSessions.ticketId, ticketId),
          or(
            eq(webChatSessions.aiState, "active"),
            eq(webChatSessions.aiState, "escalated"),
          ),
        ),
      )
      .returning({ id: webChatSessions.id });

    if (!session) return;

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "chat.ai.human_takeover",
      metadata: { reason },
    });
  });
}
