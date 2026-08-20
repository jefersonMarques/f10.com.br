import { getDatabase } from "$lib/server/db";
import { ticketEvents, ticketMessages } from "$lib/server/db/supportSchema";

const MAX_TRANSCRIPT_CHARS = 8_000;

export async function persistSupportChatHandoffContext(
  ticketId: string,
  transcript: string,
): Promise<void> {
  const normalized = transcript.trim().slice(0, MAX_TRANSCRIPT_CHARS);
  if (!normalized) return;

  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: `Atendimento encaminhado para a equipe F10.\n\nContexto da conversa com o Assistente F10:\n${normalized}`,
    });

    await tx.insert(ticketEvents).values({
      ticketId,
      eventType: "chat.assistant.handoff_context",
      metadata: { transcriptLength: normalized.length },
    });
  });
}
