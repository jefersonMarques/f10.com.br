import { env } from "$env/dynamic/private";
import {
  and,
  asc,
  eq,
  gt,
  isNull,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { isOpenAiConfigured } from "$lib/server/ai/openAiResponses";
import { getDatabase } from "$lib/server/db";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { supportAiRuns } from "$lib/server/db/supportAiSchema";
import {
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";
import { runSupportAi, type SupportAiResult } from "$lib/server/support/supportAiAgent";

const PROCESSING_STALE_MS = 60_000;
const AI_WINDOW_MS = 30 * 60 * 1000;
const AI_MAX_RUNS_PER_WINDOW = 15;
const MAX_HISTORY_MESSAGES = 10;
const MAX_HISTORY_BODY_CHARS = 1_500;

export type SupportAiChatProcessResult = {
  processed: boolean;
  state: "active" | "escalated" | "human" | "disabled";
  result: SupportAiResult | null;
};

export function isSupportAiChatEnabled(): boolean {
  return env.SUPPORT_AI_CHAT_ENABLED === "true" && isOpenAiConfigured();
}

async function claimAiProcessing(sessionId: string) {
  const db = getDatabase();
  const now = new Date();
  const staleBefore = new Date(now.getTime() - PROCESSING_STALE_MS);
  const [session] = await db
    .update(webChatSessions)
    .set({ aiProcessingAt: now })
    .where(
      and(
        eq(webChatSessions.id, sessionId),
        eq(webChatSessions.aiState, "active"),
        or(
          isNull(webChatSessions.aiProcessingAt),
          lt(webChatSessions.aiProcessingAt, staleBefore),
        ),
      ),
    )
    .returning({
      id: webChatSessions.id,
      ticketId: webChatSessions.ticketId,
      aiState: webChatSessions.aiState,
    });

  return session ?? null;
}

async function clearAiProcessing(sessionId: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(webChatSessions)
    .set({ aiProcessingAt: null })
    .where(eq(webChatSessions.id, sessionId));
}

async function getAiRunCount(ticketId: string): Promise<number> {
  const db = getDatabase();
  const since = new Date(Date.now() - AI_WINDOW_MS);
  const [row] = await db
    .select({ value: sql<number>`count(*)::integer` })
    .from(supportAiRuns)
    .where(
      and(
        eq(supportAiRuns.ticketId, ticketId),
        gt(supportAiRuns.createdAt, since),
      ),
    );

  return Number(row?.value ?? 0);
}

async function getConversationContext(ticketId: string, currentQuestion: string) {
  const db = getDatabase();
  const messages = await db
    .select({
      authorType: ticketMessages.authorType,
      body: ticketMessages.body,
      createdAt: ticketMessages.createdAt,
    })
    .from(ticketMessages)
    .where(
      and(
        eq(ticketMessages.ticketId, ticketId),
        eq(ticketMessages.visibility, "public"),
      ),
    )
    .orderBy(asc(ticketMessages.createdAt));

  const recent = messages.slice(-MAX_HISTORY_MESSAGES);
  const last = recent.at(-1);
  const history =
    last?.authorType === "customer" && last.body.trim() === currentQuestion.trim()
      ? recent.slice(0, -1)
      : recent;

  return history
    .map((message) => {
      const author =
        message.authorType === "customer"
          ? "Cliente"
          : message.authorType === "user"
            ? "Atendente"
            : "Agente IA";
      const body = message.body.trim().slice(0, MAX_HISTORY_BODY_CHARS);
      return `${author}: ${body}`;
    })
    .join("\n");
}

async function escalateWithoutModel(
  sessionId: string,
  ticketId: string,
  reason: string,
): Promise<SupportAiChatProcessResult> {
  const db = getDatabase();
  const now = new Date();
  const message =
    "Vou encaminhar esta conversa para a equipe de suporte para continuar o atendimento.";

  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: message,
    });

    await tx
      .update(webChatSessions)
      .set({
        aiState: "escalated",
        aiHandoffReason: reason,
        aiHandoffAt: now,
        aiProcessingAt: null,
      })
      .where(eq(webChatSessions.id, sessionId));

    await tx
      .update(tickets)
      .set({ status: "open", updatedAt: now })
      .where(eq(tickets.id, ticketId));

    await tx.insert(ticketEvents).values({
      ticketId,
      eventType: "chat.ai.escalated",
      metadata: { reason, withoutModel: true },
    });
  });

  return { processed: true, state: "escalated", result: null };
}

async function persistAiResult(
  sessionId: string,
  ticketId: string,
  result: SupportAiResult,
): Promise<SupportAiChatProcessResult> {
  const db = getDatabase();
  const now = new Date();
  const answered = result.resolution === "answered";

  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: result.answer,
    });

    await tx
      .update(webChatSessions)
      .set({
        aiState: answered ? "active" : "escalated",
        aiHandoffReason: answered ? null : result.escalationReason,
        aiHandoffAt: answered ? null : now,
        aiProcessingAt: null,
        aiLastRunId: result.runId,
      })
      .where(eq(webChatSessions.id, sessionId));

    const [ticket] = await tx
      .select({ firstResponseAt: tickets.firstResponseAt })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);

    await tx
      .update(tickets)
      .set({
        firstResponseAt: ticket?.firstResponseAt ?? now,
        status: answered ? "waiting_customer" : "open",
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId));

    await tx.insert(ticketEvents).values({
      ticketId,
      eventType: answered ? "chat.ai.message" : "chat.ai.escalated",
      metadata: {
        runId: result.runId,
        resolution: result.resolution,
        sourceContentIds: result.sources.map((source) => source.contentId),
        escalationReason: result.escalationReason || null,
      },
    });
  });

  return {
    processed: true,
    state: answered ? "active" : "escalated",
    result,
  };
}

export async function processSupportAiChatMessage(
  sessionId: string,
  questionValue: string,
): Promise<SupportAiChatProcessResult> {
  const question = questionValue.trim().slice(0, 4_000);
  if (!question) {
    return { processed: false, state: "disabled", result: null };
  }

  const db = getDatabase();
  const [current] = await db
    .select({ aiState: webChatSessions.aiState })
    .from(webChatSessions)
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);

  if (!current || current.aiState !== "active") {
    return {
      processed: false,
      state: current?.aiState ?? "disabled",
      result: null,
    };
  }

  const claimed = await claimAiProcessing(sessionId);
  if (!claimed) {
    return { processed: false, state: "active", result: null };
  }

  try {
    const [ticket] = await db
      .select({
        id: tickets.id,
        customerContactId: tickets.customerContactId,
        assignedUserId: tickets.assignedUserId,
      })
      .from(tickets)
      .where(eq(tickets.id, claimed.ticketId))
      .limit(1);

    if (!ticket) {
      return escalateWithoutModel(
        sessionId,
        claimed.ticketId,
        "Ticket da conversa não foi encontrado.",
      );
    }

    if (ticket.assignedUserId) {
      await db
        .update(webChatSessions)
        .set({
          aiState: "human",
          aiHandoffReason: "Conversa já atribuída a um atendente.",
          aiHandoffAt: new Date(),
          aiProcessingAt: null,
        })
        .where(eq(webChatSessions.id, sessionId));
      return { processed: false, state: "human", result: null };
    }

    const runCount = await getAiRunCount(ticket.id);
    if (runCount >= AI_MAX_RUNS_PER_WINDOW) {
      return escalateWithoutModel(
        sessionId,
        ticket.id,
        "Limite de interações automáticas atingido nesta conversa.",
      );
    }

    const conversationContext = await getConversationContext(
      ticket.id,
      question,
    );
    const result = await runSupportAi({
      question,
      actorUserId: null,
      customerContactId: ticket.customerContactId,
      ticketId: ticket.id,
      conversationContext,
    });

    return persistAiResult(sessionId, ticket.id, result);
  } catch {
    return escalateWithoutModel(
      sessionId,
      claimed.ticketId,
      "Falha técnica no atendimento automático.",
    );
  } finally {
    await clearAiProcessing(sessionId);
  }
}
