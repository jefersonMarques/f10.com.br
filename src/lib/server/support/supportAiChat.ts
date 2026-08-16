import { env } from "$env/dynamic/private";
import {
  and,
  asc,
  eq,
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
import {
  runSupportAi,
  type SupportAiResult,
} from "$lib/server/support/supportAiAgent";
import { getSupportAvailabilityStatus } from "$lib/server/support/publicSupportStatus";
import {
  autoAssignTicketIfConfigured,
  getSupportRoutingConfiguration,
} from "$lib/server/support/supportRoutingRepository";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";

const PROCESSING_STALE_MS = 60_000;
const MAX_HISTORY_MESSAGES = 6;
const MAX_HISTORY_BODY_CHARS = 1_000;

type ChatAiState = "active" | "escalated" | "human" | "disabled";

type SupportAvailability = Awaited<ReturnType<typeof getSupportAvailabilityStatus>>;

export type SupportAiChatProcessResult = {
  processed: boolean;
  state: ChatAiState;
  result: SupportAiResult | null;
};

export function isSupportAiChatEnabled(): boolean {
  return env.SUPPORT_AI_CHAT_ENABLED === "true" && isOpenAiConfigured();
}

function requestsHumanSupport(question: string): boolean {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /(?:quero|preciso|gostaria|posso|pode|chama|chamar|falar|conversar).{0,28}(?:atendente|humano|pessoa)|(?:atendente humano|suporte humano|falar com alguem)/i.test(normalized);
}

function handoffMessage(availability: SupportAvailability): string {
  if (availability.isOpen === false) {
    const next = availability.nextOpenLabel
      ? ` O atendimento humano retorna ${availability.nextOpenLabel.toLowerCase()}.`
      : " O atendimento humano está fora do horário de funcionamento neste momento.";
    return `Registrei seu caso para a equipe de suporte.${next} Você pode continuar enviando informações por aqui enquanto isso.`;
  }

  return "Vou encaminhar esta conversa para a equipe de suporte para continuar o atendimento.";
}

async function getSessionState(sessionId: string): Promise<ChatAiState> {
  const db = getDatabase();
  const [session] = await db
    .select({ aiState: webChatSessions.aiState })
    .from(webChatSessions)
    .where(eq(webChatSessions.id, sessionId))
    .limit(1);

  return session?.aiState ?? "disabled";
}

async function disableAiSession(sessionId: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(webChatSessions)
    .set({
      aiState: "disabled",
      aiHandoffReason: "Atendimento automático desativado por configuração.",
      aiHandoffAt: new Date(),
      aiProcessingAt: null,
    })
    .where(
      and(
        eq(webChatSessions.id, sessionId),
        eq(webChatSessions.aiState, "active"),
      ),
    );
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
  const [row] = await db
    .select({ value: sql<number>`count(*)::integer` })
    .from(supportAiRuns)
    .where(eq(supportAiRuns.ticketId, ticketId));

  return Number(row?.value ?? 0);
}

async function getAiTokensUsedToday(timezone: string): Promise<number> {
  const db = getDatabase();
  const [row] = await db
    .select({
      value: sql<number>`coalesce(sum(coalesce(${supportAiRuns.inputTokens}, 0) + coalesce(${supportAiRuns.outputTokens}, 0)), 0)::bigint`,
    })
    .from(supportAiRuns)
    .where(
      sql`${supportAiRuns.createdAt} >= (date_trunc('day', now() at time zone ${timezone}) at time zone ${timezone})`,
    );

  return Number(row?.value ?? 0);
}

async function getConversationContext(
  ticketId: string,
  currentQuestion: string,
) {
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
    last?.authorType === "customer" &&
    last.body.trim() === currentQuestion.trim()
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

async function notifyOrAssignEscalation(
  ticketId: string,
  reason: string,
): Promise<void> {
  const assignedUserId = await autoAssignTicketIfConfigured(ticketId).catch(() => null);
  if (!assignedUserId) {
    await notifySupportTicketNeedsAttention(ticketId, reason).catch(() => undefined);
  }
}

async function escalateWithoutModel(
  sessionId: string,
  ticketId: string,
  reason: string,
  publicMessage: string,
): Promise<SupportAiChatProcessResult> {
  const db = getDatabase();
  const now = new Date();

  const accepted = await db.transaction(async (tx) => {
    const [session] = await tx
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

    if (!session) return false;

    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: publicMessage,
    });

    await tx
      .update(tickets)
      .set({ status: "open", updatedAt: now })
      .where(eq(tickets.id, ticketId));

    await tx.insert(ticketEvents).values({
      ticketId,
      eventType: "chat.ai.escalated",
      metadata: { reason, withoutModel: true },
    });

    return true;
  });

  if (!accepted) {
    return {
      processed: false,
      state: await getSessionState(sessionId),
      result: null,
    };
  }

  await notifyOrAssignEscalation(ticketId, reason);
  return { processed: true, state: "escalated", result: null };
}

async function persistAiResult(
  sessionId: string,
  ticketId: string,
  result: SupportAiResult,
  unresolvedPublicMessage: string,
): Promise<SupportAiChatProcessResult> {
  const db = getDatabase();
  const now = new Date();
  const answered = result.resolution === "answered";

  const accepted = await db.transaction(async (tx) => {
    const [session] = await tx
      .update(webChatSessions)
      .set({
        aiState: answered ? "active" : "escalated",
        aiHandoffReason: answered ? null : result.escalationReason,
        aiHandoffAt: answered ? null : now,
        aiProcessingAt: null,
        aiLastRunId: result.runId,
      })
      .where(
        and(
          eq(webChatSessions.id, sessionId),
          eq(webChatSessions.aiState, "active"),
        ),
      )
      .returning({ id: webChatSessions.id });

    if (!session) return false;

    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: answered ? result.answer : unresolvedPublicMessage,
    });

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

    return true;
  });

  if (!accepted) {
    return {
      processed: false,
      state: await getSessionState(sessionId),
      result: null,
    };
  }

  if (!answered) {
    await notifyOrAssignEscalation(
      ticketId,
      result.escalationReason || "A IA encaminhou a conversa para atendimento humano.",
    );
  }

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

  if (!isSupportAiChatEnabled()) {
    await disableAiSession(sessionId);
    return { processed: false, state: "disabled", result: null };
  }

  const currentState = await getSessionState(sessionId);
  if (currentState !== "active") {
    return { processed: false, state: currentState, result: null };
  }

  const claimed = await claimAiProcessing(sessionId);
  if (!claimed) {
    return {
      processed: false,
      state: await getSessionState(sessionId),
      result: null,
    };
  }

  const db = getDatabase();

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
      const availability = await getSupportAvailabilityStatus();
      return escalateWithoutModel(
        sessionId,
        claimed.ticketId,
        "Ticket da conversa não foi encontrado.",
        handoffMessage(availability),
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
        .where(
          and(
            eq(webChatSessions.id, sessionId),
            eq(webChatSessions.aiState, "active"),
          ),
        );
      return { processed: false, state: "human", result: null };
    }

    const [configuration, availability] = await Promise.all([
      getSupportRoutingConfiguration(),
      getSupportAvailabilityStatus(),
    ]);
    const publicHandoffMessage = handoffMessage(availability);

    if (requestsHumanSupport(question)) {
      return escalateWithoutModel(
        sessionId,
        ticket.id,
        "Cliente solicitou atendimento humano explicitamente.",
        publicHandoffMessage,
      );
    }

    const [runCount, usedTokens] = await Promise.all([
      getAiRunCount(ticket.id),
      getAiTokensUsedToday(availability.timezone),
    ]);
    if (runCount >= configuration.aiMaxRunsPerConversation) {
      return escalateWithoutModel(
        sessionId,
        ticket.id,
        "Limite de interações automáticas atingido nesta conversa.",
        publicHandoffMessage,
      );
    }

    if (usedTokens >= configuration.aiDailyTokenBudget) {
      return escalateWithoutModel(
        sessionId,
        ticket.id,
        "Orçamento diário do atendimento automático atingido.",
        publicHandoffMessage,
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
      maxOutputTokens: configuration.aiMaxOutputTokens,
    });

    return persistAiResult(
      sessionId,
      ticket.id,
      result,
      publicHandoffMessage,
    );
  } catch {
    const availability = await getSupportAvailabilityStatus().catch(() => null);
    return escalateWithoutModel(
      sessionId,
      claimed.ticketId,
      "Falha técnica no atendimento automático.",
      availability
        ? handoffMessage(availability)
        : "Vou encaminhar esta conversa para a equipe de suporte para continuar o atendimento.",
    );
  } finally {
    await clearAiProcessing(sessionId);
  }
}
