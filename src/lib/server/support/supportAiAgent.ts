import { desc, eq } from "drizzle-orm";
import {
  getAiTaskProfile,
  isAiTaskConfigured,
} from "$lib/server/ai/aiConfigurationRepository";
import { AI_PROVIDER_DEFINITIONS } from "$lib/server/ai/aiTypes";
import { getDatabase } from "$lib/server/db";
import { supportAiRuns } from "$lib/server/db/supportAiSchema";
import {
  answerHelpQuestion,
  type HelpKnowledgeResult,
} from "$lib/server/help/helpKnowledgeEngine";
import { recordHelpKnowledgeRun } from "$lib/server/help/helpKnowledgeTelemetryRepository";
import { markHelpSearchOutcome } from "$lib/server/help/helpSearchRepository";

const CLARIFY_MESSAGE =
  "Quero entender exatamente o que você precisa no F10. Me diga em qual tela você está e o que deseja fazer nela.";
const TECHNICAL_FAILURE_MESSAGE =
  "Não consegui fechar essa resposta agora. Continue me dizendo o que você está tentando fazer no F10 que eu tento por outro caminho.";
const RETRYABLE_KNOWLEDGE_FAILURES = new Set([
  "AI_TIMEOUT",
  "AI_REQUEST_FAILED",
  "AI_INVALID_RESPONSE",
  "AI_EMPTY_RESPONSE",
  "AI_INVALID_JSON",
  "AI_INVALID_HELP_KNOWLEDGE_OUTPUT",
]);

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
  provider: string;
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

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function isFollowUpQuestion(value: string): boolean {
  const normalized = normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[?!.,;:]+$/g, "")
    .trim();
  if (!normalized) return false;
  const words = normalized.split(" ").filter(Boolean);
  if (words.length <= 2) return true;
  return /^(?:e\s+)?(?:como|onde|qual|quais|quando|por que|porque|e depois|e agora|e para|e pro|e pros|e as|e os)\b/.test(normalized)
    && words.length <= 6;
}

function previousCustomerTopic(conversationContext: string): string {
  const candidates = conversationContext
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap((line) => {
      const match = line.match(/^(?:Cliente|Usuário|Usuario):\s*(.+)$/i);
      return match?.[1] ? [normalizeText(match[1]).slice(0, 300)] : [];
    })
    .filter((value) => value.length >= 3)
    .reverse();

  return candidates.find((value) => !isFollowUpQuestion(value)) ?? candidates[0] ?? "";
}

function resolvedQuestion(question: string, conversationContext: string): string {
  if (!conversationContext || !isFollowUpQuestion(question)) return question;
  const topic = previousCustomerTopic(conversationContext);
  if (!topic) return question;
  return `${topic}\nContinuação: ${question}`.slice(0, 600);
}

function clarificationMessage(question: string, conversationContext: string): string {
  const topic = previousCustomerTopic(conversationContext);
  if (isFollowUpQuestion(question) && topic) {
    return "Posso detalhar isso. Você quer saber **onde clicar**, **o que preencher** ou **o que acontece depois**?";
  }
  return CLARIFY_MESSAGE;
}

function retryableKnowledgeFailure(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false;
  return Array.from(RETRYABLE_KNOWLEDGE_FAILURES).some((code) =>
    cause.message.includes(code),
  );
}

async function saveRun(input: {
  actorUserId?: string | null;
  searchEventId: string | null;
  question: string;
  answer: string;
  resolution: "answered" | "escalate" | "failed";
  provider: string;
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
      provider: input.provider,
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
  question: string,
  conversationContext: string,
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
    answer: clarificationMessage(question, conversationContext),
    escalationReason: "A Base de Conhecimento não sustentou uma resposta segura para esta pergunta.",
  };
}

export async function getSupportAiLabConfiguration() {
  const profile = await getAiTaskProfile("support_answer");
  return {
    configured: await isAiTaskConfigured("support_answer"),
    provider: profile.provider,
    providerLabel: AI_PROVIDER_DEFINITIONS[profile.provider].label,
    model: profile.model,
  };
}

export async function runSupportAi(
  input: RunSupportAiInput,
): Promise<SupportAiResult> {
  const startedAt = Date.now();
  const question = input.question.trim().slice(0, 600);
  if (!question) throw new Error("SUPPORT_AI_QUESTION_REQUIRED");
  const profile = await getAiTaskProfile("support_answer");
  const conversationContext = input.conversationContext?.trim().slice(0, 6_000) ?? "";
  const knowledgeQuestion = resolvedQuestion(question, conversationContext);

  try {
    let knowledge: HelpKnowledgeResult;
    try {
      knowledge = await answerHelpQuestion({
        question: knowledgeQuestion,
        scope: { type: "global" },
        source: "chat_ai",
        actorUserId: input.actorUserId ?? null,
        customerContactId: input.customerContactId ?? null,
        conversationContext,
        maxOutputTokens: input.maxOutputTokens,
      });
    } catch (firstCause) {
      if (!retryableKnowledgeFailure(firstCause)) throw firstCause;
      console.warn("[support-ai] retrying knowledge request", {
        code: firstCause instanceof Error ? firstCause.message.slice(0, 120) : "unknown",
      });
      knowledge = await answerHelpQuestion({
        question: knowledgeQuestion,
        scope: { type: "global" },
        source: "chat_ai",
        actorUserId: input.actorUserId ?? null,
        customerContactId: input.customerContactId ?? null,
        conversationContext,
        maxOutputTokens: input.maxOutputTokens,
      });
    }

    const mapped = mapKnowledgeResult(knowledge, question, conversationContext);
    const model = knowledge.model ?? profile.model;
    const provider = knowledge.provider ?? profile.provider;
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
      retrievalQuery: knowledge.retrievalQuery,
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
      provider,
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
      provider,
      model,
      providerResponseId: knowledge.providerResponseId,
      inputTokens: knowledge.inputTokens,
      outputTokens: knowledge.outputTokens,
      latencyMs,
    };
  } catch (cause) {
    const latencyMs = Date.now() - startedAt;
    const model = profile.model;
    const provider = profile.provider;
    const failureCode =
      cause instanceof Error ? cause.message.slice(0, 120) : "SUPPORT_AI_UNEXPECTED_FAILURE";
    const escalationReason =
      failureCode === "AI_PROVIDER_NOT_CONFIGURED" ||
      failureCode === "AI_TASK_DISABLED"
        ? "A função de IA do atendimento não possui um provedor disponível."
        : "Falha técnica durante a consulta ao motor de conhecimento.";
    const answer = isFollowUpQuestion(question)
      ? clarificationMessage(question, conversationContext)
      : TECHNICAL_FAILURE_MESSAGE;

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
      answer,
      resolution: "failed",
      provider,
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
      answer,
      escalationReason,
      sources: [],
      provider,
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
      provider: supportAiRuns.provider,
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
