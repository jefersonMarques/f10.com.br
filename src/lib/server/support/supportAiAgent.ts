import { desc, eq } from "drizzle-orm";
import { getOpenAiModel, isOpenAiConfigured } from "$lib/server/ai/openAiResponses";
import { getDatabase } from "$lib/server/db";
import { supportAiRuns } from "$lib/server/db/supportAiSchema";
import {
  answerHelpQuestion,
  type HelpKnowledgeResult,
} from "$lib/server/help/helpKnowledgeEngine";
import { recordHelpKnowledgeRun } from "$lib/server/help/helpKnowledgeTelemetryRepository";
import { markHelpSearchOutcome } from "$lib/server/help/helpSearchRepository";

const NOT_FOUND_MESSAGE =
  "Não encontrei informação suficiente para responder isso com segurança. Você pode reformular a pergunta ou, se preferir, falar com a equipe F10.";
const TECHNICAL_FAILURE_MESSAGE =
  "Não consegui consultar as orientações do F10 agora. Se preferir, posso encaminhar você para a equipe de atendimento.";

export type SupportAiSource = {
  contentId: string;
  slug: string;
  title: string;
  rank: number;
  score: number;
};

export type SupportAiResult = {
  runId: string;
  searchEventId: string | null;
  resolution: "answered" | "escalate" | "failed";
  answer: string;
  escalationReason: string;
  sources: SupportAiSource[];
  model: string;
  providerResponseId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
};

export type RunSupportAiInput = {
  question: string;
  actorUserId?: string | null;
  customerContactId?: string | null;
  ticketId?: string | null;
  conversationContext?: string;
  maxOutputTokens?: number;
};

async function saveRun(input: {
  actorUserId?: string | null;
  searchEventId: string | null;
  question: string;
  answer: string;
  resolution: "answered" | "escalate" | "failed";
  model: string;
  providerResponseId?: string | null;
  sources: SupportAiSource[];
  escalationReason?: string;
  failureCode?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs: number;
  ticketId?: string | null;
}): Promise<string> {
  const [run] = await getDatabase()
    .insert(supportAiRuns)
    .values({
      actorUserId: input.actorUserId ?? null,
      searchEventId: input.searchEventId,
      question: input.question,
      answer: input.answer,
      resolution: input.resolution,
      model: input.model,
      providerResponseId: input.providerResponseId ?? null,
      sourceSnapshot: input.sources,
      escalationReason: input.escalationReason ?? "",
      failureCode: input.failureCode ?? null,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      latencyMs: input.latencyMs,
      ticketId: input.ticketId ?? null,
    })
    .returning({ id: supportAiRuns.id });

  if (!run) throw new Error("SUPPORT_AI_RUN_NOT_CREATED");
  return run.id;
}

function mapKnowledgeResult(
  result: HelpKnowledgeResult,
): {
  resolution: "answered" | "escalate";
  answer: string;
  escalationReason: string;
} {
  if (result.resolution === "answered" || result.resolution === "navigate") {
    return {
      resolution: "answered",
      answer: result.answer,
      escalationReason: "",
    };
  }

  return {
    resolution: "escalate",
    answer: NOT_FOUND_MESSAGE,
    escalationReason: "A Base de Conhecimento não sustentou uma resposta segura para esta pergunta.",
  };
}

export function getSupportAiLabConfiguration() {
  return {
    configured: isOpenAiConfigured(),
    model: getOpenAiModel(),
  };
}

export async function runSupportAi(
  input: RunSupportAiInput,
): Promise<SupportAiResult> {
  const startedAt = Date.now();
  const question = input.question.trim().slice(0, 600);
  if (!question) throw new Error("SUPPORT_AI_QUESTION_REQUIRED");

  try {
    const knowledge = await answerHelpQuestion({
      question,
      scope: { type: "global" },
      source: "chat_ai",
      actorUserId: input.actorUserId ?? null,
      customerContactId: input.customerContactId ?? null,
      conversationContext: input.conversationContext,
      maxOutputTokens: input.maxOutputTokens,
    });
    const mapped = mapKnowledgeResult(knowledge);
    const model = knowledge.model ?? getOpenAiModel();
    const latencyMs = Date.now() - startedAt;

    if (knowledge.searchEventId && input.ticketId) {
      await markHelpSearchOutcome(knowledge.searchEventId, {
        ticketId: input.ticketId,
      });
    }

    await recordHelpKnowledgeRun({
      source: "chat_ai",
      scope: "global",
      actorUserId: input.actorUserId,
      customerContactId: input.customerContactId,
      searchEventId: knowledge.searchEventId,
      question,
      resolution: knowledge.resolution,
      target: knowledge.target
        ? {
            contentId: knowledge.target.contentId,
            slug: knowledge.target.slug,
            targetType: knowledge.target.targetType,
          }
        : null,
      sources: knowledge.sources,
      model: knowledge.model,
      providerResponseId: knowledge.providerResponseId,
      inputTokens: knowledge.inputTokens,
      outputTokens: knowledge.outputTokens,
      latencyMs,
    }).catch(() => undefined);

    const runId = await saveRun({
      actorUserId: input.actorUserId,
      searchEventId: knowledge.searchEventId,
      question,
      answer: mapped.answer,
      resolution: mapped.resolution,
      model,
      providerResponseId: knowledge.providerResponseId,
      sources: knowledge.sources,
      escalationReason: mapped.escalationReason,
      inputTokens: knowledge.inputTokens,
      outputTokens: knowledge.outputTokens,
      latencyMs,
      ticketId: input.ticketId,
    });

    return {
      runId,
      searchEventId: knowledge.searchEventId,
      resolution: mapped.resolution,
      answer: mapped.answer,
      escalationReason: mapped.escalationReason,
      sources: knowledge.sources,
      model,
      providerResponseId: knowledge.providerResponseId,
      inputTokens: knowledge.inputTokens,
      outputTokens: knowledge.outputTokens,
      latencyMs,
    };
  } catch (cause) {
    const latencyMs = Date.now() - startedAt;
    const model = getOpenAiModel();
    const failureCode =
      cause instanceof Error ? cause.message.slice(0, 120) : "SUPPORT_AI_UNEXPECTED_FAILURE";
    const escalationReason =
      failureCode === "OPENAI_NOT_CONFIGURED"
        ? "A integração com a OpenAI não está configurada neste ambiente."
        : "Falha técnica durante a consulta ao motor de conhecimento.";

    await recordHelpKnowledgeRun({
      source: "chat_ai",
      scope: "global",
      actorUserId: input.actorUserId,
      customerContactId: input.customerContactId,
      question,
      resolution: "failed",
      latencyMs,
      failureCode,
    }).catch(() => undefined);

    const runId = await saveRun({
      actorUserId: input.actorUserId,
      searchEventId: null,
      question,
      answer: TECHNICAL_FAILURE_MESSAGE,
      resolution: "failed",
      model,
      sources: [],
      escalationReason,
      failureCode,
      latencyMs,
      ticketId: input.ticketId,
    });

    return {
      runId,
      searchEventId: null,
      resolution: "failed",
      answer: TECHNICAL_FAILURE_MESSAGE,
      escalationReason,
      sources: [],
      model,
      providerResponseId: null,
      inputTokens: null,
      outputTokens: null,
      latencyMs,
    };
  }
}

export async function runSupportAiLab(
  actorUserId: string,
  question: string,
): Promise<SupportAiResult> {
  return runSupportAi({ actorUserId, question });
}

export async function listRecentSupportAiRuns(
  limit = 20,
  actorUserId?: string,
) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  return getDatabase()
    .select({
      id: supportAiRuns.id,
      question: supportAiRuns.question,
      answer: supportAiRuns.answer,
      resolution: supportAiRuns.resolution,
      model: supportAiRuns.model,
      sourceSnapshot: supportAiRuns.sourceSnapshot,
      escalationReason: supportAiRuns.escalationReason,
      failureCode: supportAiRuns.failureCode,
      inputTokens: supportAiRuns.inputTokens,
      outputTokens: supportAiRuns.outputTokens,
      latencyMs: supportAiRuns.latencyMs,
      createdAt: supportAiRuns.createdAt,
    })
    .from(supportAiRuns)
    .where(actorUserId ? eq(supportAiRuns.actorUserId, actorUserId) : undefined)
    .orderBy(desc(supportAiRuns.createdAt))
    .limit(safeLimit);
}
