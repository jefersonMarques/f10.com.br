import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";

type SupportDatabase = ReturnType<typeof getDatabase>;
type SupportTransaction = Parameters<Parameters<SupportDatabase["transaction"]>[0]>[0];

type ExpectedChat = {
  ticketId: string | null;
  assignedUserId?: string | null;
  tokenHash?: string;
};

// A conversão e as mensagens precisam usar o mesmo lock de sessão.
export async function lockChatForWrite(
  tx: SupportTransaction,
  sessionId: string,
  expected: ExpectedChat,
) {
  const [current] = await tx.select({
    ticketId: webChatSessions.ticketId,
    assignedUserId: webChatSessions.assignedUserId,
    closedAt: webChatSessions.closedAt,
    expiresAt: webChatSessions.expiresAt,
    tokenHash: webChatSessions.tokenHash,
    firstResponseAt: webChatSessions.firstResponseAt,
  }).from(webChatSessions).where(eq(webChatSessions.id, sessionId)).limit(1).for("update");
  if (!current || current.closedAt) throw new Error("CHAT_CLOSED");
  if (current.ticketId !== expected.ticketId
    || (expected.assignedUserId !== undefined && current.assignedUserId !== expected.assignedUserId)
    || (expected.tokenHash !== undefined && (
      current.tokenHash !== expected.tokenHash || current.expiresAt.getTime() <= Date.now()
    ))) {
    throw new Error("CHAT_STATE_CHANGED");
  }
  return current;
}
