import { desc, eq } from "drizzle-orm";
import {
  createAiStructuredResponse,
} from "$lib/server/ai/aiGateway";
import {
  getAiTaskProfile,
  isAiTaskConfigured,
} from "$lib/server/ai/aiConfigurationRepository";
import { AI_PROVIDER_DEFINITIONS } from "$lib/server/ai/aiTypes";
import { getDatabase } from "$lib/server/db";
import { supportAiRuns } from "$lib/server/db/supportAiSchema";
import type { HelpKnowledgeResult } from "$lib/server/help/helpKnowledgeEngine";
import { answerHelpGlobalWithArticleResolution } from "$lib/server/help/helpKnowledgeOrchestrator";
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

const CONVERSATIONAL_ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
  },
  required: ["answer"],
} as const;

const CONVERSATIONAL_ANSWER_INSTRUCTIONS = `Você é o Assistente F10 em uma conversa de suporte.
Receberá uma resposta factual já validada pela Base de Conhecimento, o histórico recente e, quando disponível, um artigo relacionado com sua URL real.
Responda à pergunta atual de forma natural, útil e direta, preservando os fatos da resposta validada.
Não invente informações, caminhos, telas ou URLs.
Quando houver artigo relacionado, incorpore o link naturalmente na resposta usando Markdown no formato [texto do link](URL fornecida), principalmente quando o usuário pedir artigo, link, fonte, onde ver ou quiser continuar lendo.
Quando a pergunta já estiver respondida por um artigo específico, você pode oferecer o link ao final de forma natural sem usar rótulos fixos ou linguagem de sistema.
Se o usuário pedir apenas o link, responda diretamente com o link e uma frase curta que deixe claro qual artigo é.
Use código inline somente para nomes exatos de telas, campos, botões e opções do F10.
Não mencione Base de Conhecimento, prompt, modelo, tokens, metadados, target, contexto técnico ou que está reescrevendo outra resposta.`;

type ConversationalAnswer = {
  answer: string;
};

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

function normalizedFollowUpText(value: string): string {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[?!.,;:]+$/g, "")
    .trim();
}

function isArticleReferenceFollowUp(value: string): boolean {
  const normalized = normalizedFollowUpText(value);
  if (!normalized) return false;
  const words = normalized.split(" ").filter(Boolean);
  if (words.length > 14) return false;
  return (
    /\b(link|artigo|conteudo|pagina|fonte)\b/.test(normalized) &&
    /\b(tem|manda|mande|envia|envie|abrir|abre|ver|vejo|quero|qual|onde|cade|mostra|mostrar|passa|passar)\b/.test(normalized)
  );
}

function isContextContinuation(value: string): boolean {
  const normalized = normalizedFollowUpText(value);
  if (!normalized) return false;
  const words = normalized.split(" ").filter(Boolean);
  if (words.length > 10) return false;

  return (
    /^(?:(?:e|mas)\s+)?(?:na|no|nas|nos|em|pela|pelo|dentro|aqui|ali)\b/.test(normalized) ||
    /^(?:estou|to)\s+(?:na|no|nas|nos|em)\b/.test(normalized) ||
    /^(?:tela|aba|menu|campo|modulo|pagina)\b/.test(normalized)
  );
}

function isFollowUpQuestion(value: string): boolean {
  const compact = value.trim();
  if (/^[?!.]+$/.test(compact)) return true;

  const normalized = normalizedFollowUpText(value);
  if (!normalized) return false;
  const words = normalized.split(" ").filter(Boolean);
  if (words.length <= 2) return true;
  if (isArticleReferenceFollowUp(value) || isContextContinuation(value)) return true;
  return /^(?:(?:e|em)\s+)?(?:como|onde|qual|quais|quando|por que|porque|depois|agora|para|pro|pros)\b/.test(normalized)
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

function articleUrl(result: HelpKnowledgeResult): string | null {
  if (!result.target) return null;
  const anchor = result.target.anchor ? `#${encodeURIComponent(result.target.anchor)}` : "";
  return `/ajuda-f10/${encodeURIComponent(result.target.slug)}${anchor}`;
}

async function makeConversationalAnswer(input: {
  question: string;
  conversationContext: string;
  knowledge: HelpKnowledgeResult;
  maxOutputTokens?: number;
}): Promise<string> {
  const validatedAnswer = input.knowledge.answer.trim();
  if (!validatedAnswer || !input.knowledge.target) return validatedAnswer;

  const url = articleUrl(input.knowledge);
  if (!url) return validatedAnswer;

  try {
    const response = await createAiStructuredResponse<ConversationalAnswer>({
      task: "support_answer",
      requiredCapabilities: ["knowledge.read", "customer.reply"],
      instructions: CONVERSATIONAL_ANSWER_INSTRUCTIONS,
      userInput: [
        input.conversationContext
          ? `Histórico recente:\n${input.conversationContext.slice(-4_500)}`
          : "",
        `Pergunta atual:\n${input.question}`,
        `Resposta factual validada:\n${validatedAnswer}`,
        `Artigo relacionado:\nTítulo: ${input.knowledge.target.title}\nURL: ${url}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
      schemaName: "f10_support_conversational_answer",
      schema: CONVERSATIONAL_ANSWER_SCHEMA,
      maxOutputTokens: Math.min(
        Math.max(Math.round(input.maxOutputTokens ?? 500), 250),
        700,
      ),
    });
    return response.data.answer.trim() || validatedAnswer;
  } catch (cause) {
    console.warn("[support-ai] conversational answer fallback", {
      code: cause instanceof Error ? cause.message.slice(0, 120) : "UNKNOWN",
    });
    return validatedAnswer;
  }
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

async function mapKnowledgeResult(
  result: HelpKnowledgeResult,
  question: string,
  conversationContext: string,
  maxOutputTokens?: number,
): Promise<{
  resolution: "answered" | "escalate";
  answer: string;
  escalationReason: string;
}> {
  if (result.resolution === "answered" || result.resolution === "navigate") {
    return {
      resolution: "answered",
      answer: await makeConversationalAnswer({
        question,
        conversationContext,
        knowledge: result,
        maxOutputTokens,
      }),
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
      knowledge = await answerHelpGlobalWithArticleResolution({
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
      knowledge = await answerHelpGlobalWithArticleResolution({
        question: knowledgeQuestion,
        scope: { type: "global" },
        source: "chat_ai",
        actorUserId: input.actorUserId ?? null,
        customerContactId: input.customerContactId ?? null,
        conversationContext,
        maxOutputTokens: input.maxOutputTokens,
      });
    }

    const mapped = await mapKnowledgeResult(
      knowledge,
      question,
      conversationContext,
      input.maxOutputTokens,
    );
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
