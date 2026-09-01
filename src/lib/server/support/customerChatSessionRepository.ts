import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import type { PublicChatCustomerContext } from "$lib/server/support/publicChatRepository";

const CHAT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type ResumedCustomerChatSession = {
  sessionId: string;
  token: string;
  chatNumber: number;
  expiresAt: Date;
  aiState: "active" | "escalated" | "human" | "disabled";
  entryOptionLabel: string;
};

export async function resumeActiveCustomerChatSession(input: {
  customerContext: PublicChatCustomerContext;
  contextUrl: string;
  contextData: Record<string, unknown>;
  handoffReason: string;
}): Promise<ResumedCustomerChatSession | null> {
  const db = getDatabase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHAT_SESSION_TTL_MS);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);

  return db.transaction(async (tx) => {
    const [session] = await tx
      .select({
        id: webChatSessions.id,
        chatNumber: webChatSessions.chatNumber,
        aiState: webChatSessions.aiState,
        contextData: webChatSessions.contextData,
      })
      .from(webChatSessions)
      .where(
        and(
          eq(webChatSessions.legacyUserId, input.customerContext.legacyUserId),
          eq(webChatSessions.groupId, input.customerContext.groupId),
          eq(webChatSessions.unitId, input.customerContext.unitId),
          isNull(webChatSessions.closedAt),
          gt(webChatSessions.expiresAt, now),
        ),
      )
      .orderBy(desc(webChatSessions.updatedAt), desc(webChatSessions.createdAt))
      .limit(1);

    if (!session) return null;

    const nextAiState = session.aiState === "active" ? "escalated" : session.aiState;
    const nextContextData: Record<string, unknown> = {
      ...(session.contextData ?? {}),
      ...input.contextData,
      resumedAt: now.toISOString(),
    };

    await tx
      .update(webChatSessions)
      .set({
        tokenHash,
        expiresAt,
        lastSeenAt: now,
        updatedAt: now,
        contextUrl: input.contextUrl || null,
        contextData: nextContextData,
        aiState: nextAiState,
        aiHandoffReason: input.handoffReason || null,
        aiHandoffAt: now,
      })
      .where(eq(webChatSessions.id, session.id));

    return {
      sessionId: session.id,
      token,
      chatNumber: session.chatNumber,
      expiresAt,
      aiState: nextAiState,
      entryOptionLabel:
        typeof nextContextData.entryOptionLabel === "string"
          ? nextContextData.entryOptionLabel
          : "Atendimento F10",
    };
  });
}
