import { createHash } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { supportChatEvents, webChatSessions } from "$lib/server/db/chatSchema";
import {
  CHAT_TOKEN_RENEWAL_WINDOW_MS,
  CHAT_TOKEN_TTL_MS,
  createCustomerChatToken,
} from "$lib/server/support/customerChatToken";
import type { PublicChatCustomerContext } from "$lib/server/support/publicChatRepository";

type ChatCustomerContext = Pick<PublicChatCustomerContext, "legacyUserId" | "groupId" | "unitId">;

export type ResumedCustomerChatSession = {
  sessionId: string;
  token: string;
  chatNumber: number;
  ticketId: string | null;
  expiresAt: Date;
  aiState: "active" | "escalated" | "human" | "disabled";
  entryOptionLabel: string;
  department: "support" | "finance";
  escalated: boolean;
};

function activeCustomerChatCondition(context: ChatCustomerContext) {
  return and(
    eq(webChatSessions.legacyUserId, context.legacyUserId),
    eq(webChatSessions.groupId, context.groupId),
    eq(webChatSessions.unitId, context.unitId),
    isNull(webChatSessions.closedAt),
  );
}

export async function findActiveCustomerChat(context: ChatCustomerContext): Promise<boolean> {
  const [chat] = await getDatabase()
    .select({ id: webChatSessions.id })
    .from(webChatSessions)
    .where(activeCustomerChatCondition(context))
    .limit(1);
  return Boolean(chat);
}

export async function resumeActiveCustomerChatSession(input: {
  customerContext: ChatCustomerContext;
  requiredQueueId?: string | null;
  handoffReason?: string;
  requestHuman?: boolean;
}): Promise<ResumedCustomerChatSession | null> {
  return getDatabase().transaction(async (tx) => {
    const [session] = await tx.select({
      id: webChatSessions.id,
      queueId: webChatSessions.queueId,
      ticketId: webChatSessions.ticketId,
      chatNumber: webChatSessions.chatNumber,
      aiState: webChatSessions.aiState,
      contextData: webChatSessions.contextData,
      humanRequestedAt: webChatSessions.humanRequestedAt,
      tokenHash: webChatSessions.tokenHash,
      expiresAt: webChatSessions.expiresAt,
    }).from(webChatSessions)
      .where(activeCustomerChatCondition(input.customerContext))
      .orderBy(desc(webChatSessions.updatedAt), desc(webChatSessions.createdAt))
      .limit(1).for("update");

    if (!session) return null;
    if (input.requiredQueueId && session.queueId !== input.requiredQueueId) {
      throw new Error("CHAT_QUEUE_MISMATCH");
    }

    const now = new Date();
    const token = createCustomerChatToken(session.id);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const renewToken = session.tokenHash !== tokenHash
      || session.expiresAt.getTime() <= now.getTime() + CHAT_TOKEN_RENEWAL_WINDOW_MS;
    const expiresAt = renewToken
      ? new Date(now.getTime() + CHAT_TOKEN_TTL_MS)
      : session.expiresAt;

    // Uma retomada comum não altera a fila, o responsável ou o ciclo de espera.
    const escalated = input.requestHuman === true && session.aiState === "active";
    const aiState = escalated ? "escalated" : session.aiState;

    await tx.update(webChatSessions).set({
      ...(renewToken ? { tokenHash, expiresAt } : {}),
      lastSeenAt: now,
      ...(escalated ? {
        aiState,
        humanRequestedAt: session.humanRequestedAt ?? now,
        aiHandoffReason: input.handoffReason || null,
        aiHandoffAt: now,
        updatedAt: now,
      } : {}),
    }).where(eq(webChatSessions.id, session.id));

    if (escalated && !session.humanRequestedAt) {
      await tx.insert(supportChatEvents).values({
        sessionId: session.id,
        eventType: "human_requested",
        occurredAt: now,
      }).onConflictDoNothing();
    }

    return {
      sessionId: session.id,
      token,
      chatNumber: session.chatNumber,
      ticketId: session.ticketId,
      expiresAt,
      aiState,
      entryOptionLabel: typeof session.contextData?.entryOptionLabel === "string"
        ? session.contextData.entryOptionLabel : "Atendimento F10",
      department: session.contextData?.department === "finance" ? "finance" : "support",
      escalated,
    };
  });
}
