import { and, eq, isNull, or, lt } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";

export async function touchCustomerChatPresence(sessionId: string): Promise<void> {
  const now = new Date();
  await getDatabase().update(webChatSessions).set({ lastSeenAt: now })
    .where(and(
      eq(webChatSessions.id, sessionId),
      isNull(webChatSessions.closedAt),
      or(isNull(webChatSessions.lastSeenAt), lt(webChatSessions.lastSeenAt, new Date(now.getTime() - 30_000))),
    ));
}
