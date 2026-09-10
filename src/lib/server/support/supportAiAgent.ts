import { desc, eq } from "drizzle-orm";
import {
  getAiTaskProfile,
  isAiTaskConfigured,
} from "$lib/server/ai/aiConfigurationRepository";
import { AI_PROVIDER_DEFINITIONS } from "$lib/server/ai/aiTypes";
import { runF10Assistant } from "$lib/server/assistant/f10AssistantEngine";
import { getDatabase } from "$lib/server/db";
import { supportAiRuns } from "$lib/server/db/supportAiSchema";
import { recordHelpKnowledgeRun } from "$lib/server/help/helpKnowledgeTelemetryRepository";
import { markHelpSearchOutcome } from "$lib/server/help/helpSearchRepository";

const TECHNICAL_FAILURE_MESSAGE =
  "O Assistente F10 não conseguiu concluir essa resposta agora. Tente novamente em instantes.";

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

export async function getSupportAiLabConfiguration() {
  const profile = await getAiTaskProfile("support_answer");
  return {
    configured: await isAiTaskConfigured("support_answer", [
      "knowledge.search",
      "knowledge.read",
      "customer.reply",
    ]),
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

  try {
    const assistant = await runF10Assistant({
      surface: "chat",
      question,
      conversationContext: input.conversationContext,
      actorUserId: input.actorUserId ?? null,
      customerContactId: input.customerContactId ?? null,
      maxOutputTokens: input.maxOutputTokens,
    });
    const resolution = assistant.action === "handoff" ? "escalate" : "answered";
    const escalationReason = resolution === "escalate"
      ? "O cliente solicitou atendimento humano ao Assistente F10."
      : "";
    const provider = assistant.provider ?? profile.provider;
    const model = assistant.model ?? profile.model;
    const latencyMs = Date.now() - startedAt;

    if (assistant.searchEventId && input.ticketId) {
      await markHelpSearchOutcome(assistant.searchEventId, {
        ticketId: input.ticketId,
      });
    }

    await recordHelpKnowledgeRun({
      source: "chat_ai",
      scope: "global",
      actorUserId: input.actorUserId,
      customerContactId: input.customerContactId,
      searchEventId: assistant.searchEventId,
      question,
      retrievalQuery: assistant.retrievalQuery,
      resolution: assistant.action === "answer" ? "answered" : "not_found",
      target: assistant.target
        ? {
            contentId: assistant.target.contentId,
            slug: assistant.target.slug,
            targetType: assistant.target.targetType,
          }
        : null,
      sources: assistant.sources,
      model: assistant.model,
      providerResponseId: assistant.providerResponseId,
      inputTokens: assistant.inputTokens,
      outputTokens: assistant.outputTokens,
      latencyMs,
    }).catch(() => undefined);

    const runId = await saveRun({
      actorUserId: input.actorUserId,
      searchEventId: assistant.searchEventId,
      question,
      answer: assistant.answer,
      resolution,
      provider,
      model,
      providerResponseId: assistant.providerResponseId,
      sources: assistant.sources,
      escalationReason,
      inputTokens: assistant.inputTokens,
      outputTokens: assistant.outputTokens,
      latencyMs,
      ticketId: input.ticketId,
    });

    return {
      runId,
      searchEventId: assistant.searchEventId,
      resolution,
      answer: assistant.answer,
      escalationReason,
      sources: assistant.sources,
      provider,
      model,
      providerResponseId: assistant.providerResponseId,
      inputTokens: assistant.inputTokens,
      outputTokens: assistant.outputTokens,
      latencyMs,
    };
  } catch (cause) {
    const latencyMs = Date.now() - startedAt;
    const failureCode = cause instanceof Error
      ? cause.message.slice(0, 120)
      : "SUPPORT_AI_UNEXPECTED_FAILURE";
    const provider = profile.provider;
    const model = profile.model;
    const escalationReason = "Falha técnica durante a consulta ao Assistente F10.";

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
      answer: TECHNICAL_FAILURE_MESSAGE,
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
