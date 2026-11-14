import { and, desc, eq, isNull } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatMessages, webChatSessions } from "$lib/server/db/chatSchema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
import type { CustomerF10PortalSession } from "$lib/server/customerPortal/customerF10AuthRepository";

export type CustomerChatCloseResult = {
  closed: boolean;
  sessionId: string | null;
};

export async function closeCurrentCustomerChat(
  customer: CustomerF10PortalSession,
): Promise<CustomerChatCloseResult> {
  const { selectedGroupId, selectedUnitId, legacyUserId } = customer;
  if (selectedGroupId === null || selectedUnitId === null) {
    throw new Error("CHAT_UNIT_REQUIRED");
  }

  const db = getDatabase();

  return db.transaction(async (tx) => {
    // O lock impede mensagens duplicadas em solicitações simultâneas.
    const [chat] = await tx
      .select({
        id: webChatSessions.id,
        ticketId: webChatSessions.ticketId,
      })
      .from(webChatSessions)
      .where(and(
        eq(webChatSessions.legacyUserId, legacyUserId),
        eq(webChatSessions.groupId, selectedGroupId),
        eq(webChatSessions.unitId, selectedUnitId),
        isNull(webChatSessions.closedAt),
      ))
      .orderBy(desc(webChatSessions.updatedAt))
      .limit(1)
      .for("update");

    if (!chat) return { closed: false, sessionId: null };

    const now = new Date();
    await tx.update(webChatSessions)
      .set({
        closedAt: now,
        aiState: "disabled",
        aiProcessingAt: null,
        updatedAt: now,
      })
      .where(eq(webChatSessions.id, chat.id));

    const body = "Conversa finalizada pelo cliente.";
    if (chat.ticketId) {
      // O encerramento do chat não modifica o status do ticket.
      await tx.insert(ticketMessages).values({
        ticketId: chat.ticketId,
        authorType: "system",
        visibility: "public",
        channel: "web_chat",
        body,
      });
      await tx.insert(ticketEvents).values({
        ticketId: chat.ticketId,
        eventType: "chat.closed",
        metadata: { sessionId: chat.id, closedBy: "customer" },
      });
      await tx.update(tickets).set({ updatedAt: now })
        .where(eq(tickets.id, chat.ticketId));
    } else {
      await tx.insert(webChatMessages).values({
        sessionId: chat.id,
        authorType: "system",
        body,
      });
    }

    return { closed: true, sessionId: chat.id };
  });
}
