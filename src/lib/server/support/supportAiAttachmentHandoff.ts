import { and, eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
import { getSupportAvailabilityStatus } from "$lib/server/support/publicSupportStatus";
import { autoAssignTicketIfConfigured } from "$lib/server/support/supportRoutingRepository";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";

export async function handoffSupportChatForAttachment(sessionId: string) {
  const db = getDatabase();
  const now = new Date();
  const [session] = await db
    .select({ ticketId: webChatSessions.ticketId, aiState: webChatSessions.aiState })
    .from(webChatSessions)
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);

  if (!session || !session.ticketId || session.aiState !== "active") {
    return {
      processed: false,
      state: session?.aiState ?? ("disabled" as const),
      result: null,
    };
  }

  const availability = await getSupportAvailabilityStatus().catch(() => null);
  const publicMessage = availability?.isOpen === false
    ? availability.nextOpenLabel
      ? `Recebi a imagem. Ela precisa de análise da equipe F10, então deixei seu atendimento encaminhado. A equipe retorna ${availability.nextOpenLabel.toLowerCase()}.`
      : "Recebi a imagem. Ela precisa de análise da equipe F10, então deixei seu atendimento encaminhado para o próximo horário de atendimento."
    : "Recebi a imagem. Vou chamar alguém da equipe F10 para analisá-la com você por aqui.";
  const reason = "Cliente enviou uma imagem que requer análise humana.";

  const accepted = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(webChatSessions)
      .set({
        aiState: "escalated",
        aiHandoffReason: reason,
        aiHandoffAt: now,
        aiProcessingAt: null,
      })
      .where(
        and(
          eq(webChatSessions.id, sessionId),
          eq(webChatSessions.aiState, "active"),
        ),
      )
      .returning({ id: webChatSessions.id });
    if (!updated) return false;

    await tx.insert(ticketMessages).values({
      ticketId: session.ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: publicMessage,
    });
    await tx
      .update(tickets)
      .set({ status: "open", updatedAt: now })
      .where(eq(tickets.id, session.ticketId));
    await tx.insert(ticketEvents).values({
      ticketId: session.ticketId,
      eventType: "chat.ai.escalated",
      metadata: { reason, withoutModel: true, attachment: true },
    });
    return true;
  });

  if (!accepted) {
    return { processed: false, state: "active" as const, result: null };
  }

  const assignedUserId = await autoAssignTicketIfConfigured(session.ticketId).catch(() => null);
  if (!assignedUserId) {
    await notifySupportTicketNeedsAttention(session.ticketId, reason).catch(() => undefined);
  }

  return { processed: true, state: "escalated" as const, result: null };
}
