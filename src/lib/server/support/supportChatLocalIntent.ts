import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";

function normalizeConversationText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPureSupportGreeting(value: string): boolean {
  const normalized = normalizeConversationText(value);
  return /^(?:(?:oi|ola|opa|e ai)(?: pessoal| equipe)?|bom dia|boa tarde|boa noite)(?:[, ]+(?:tudo bem|tudo certo|como vai|como voces estao|como vc esta|beleza))?$|^(?:tudo bem|tudo certo|como vai)$/.test(
    normalized,
  );
}

export async function handlePureSupportGreeting(
  sessionId: string,
  message: string,
): Promise<boolean> {
  if (!isPureSupportGreeting(message)) return false;

  const db = getDatabase();
  const now = new Date();
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select({ ticketId: webChatSessions.ticketId, aiState: webChatSessions.aiState })
      .from(webChatSessions)
      .where(eq(webChatSessions.id, sessionId))
      .limit(1);
    if (!session || !session.ticketId || session.aiState !== "active") return false;

    const [ticket] = await tx
      .select({ firstResponseAt: tickets.firstResponseAt, assignedUserId: tickets.assignedUserId })
      .from(tickets)
      .where(eq(tickets.id, session.ticketId))
      .limit(1);
    if (!ticket || ticket.assignedUserId) return false;

    const [accepted] = await tx
      .update(webChatSessions)
      .set({ aiProcessingAt: null })
      .where(
        and(
          eq(webChatSessions.id, sessionId),
          eq(webChatSessions.aiState, "active"),
        ),
      )
      .returning({ id: webChatSessions.id });
    if (!accepted) return false;

    await tx.insert(ticketMessages).values({
      ticketId: session.ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: "Olá! Tudo bem. Como posso ajudar você hoje?",
    });
    await tx
      .update(tickets)
      .set({
        firstResponseAt: ticket.firstResponseAt ?? now,
        status: "waiting_customer",
        updatedAt: now,
      })
      .where(eq(tickets.id, session.ticketId));
    await tx.insert(ticketEvents).values({
      ticketId: session.ticketId,
      eventType: "chat.automation.message",
      metadata: { intent: "greeting", modelUsed: false },
    });
    return true;
  });
}
