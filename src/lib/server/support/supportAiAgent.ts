import { desc, eq } from "drizzle-orm";
import { getOpenAiModel, isOpenAiConfigured } from "$lib/server/ai/openAiResponses";
import { getDatabase } from "$lib/server/db";
import { supportAiRuns } from "$lib/server/db/supportAiSchema";
import {
  answerHelpQuestion,
  type HelpKnowledgeResult,
  type HelpKnowledgeTarget,
} from "$lib/server/help/helpKnowledgeEngine";
import { recordHelpKnowledgeRun } from "$lib/server/help/helpKnowledgeTelemetryRepository";
import { markHelpSearchOutcome } from "$lib/server/help/helpSearchRepository";

const NOT_FOUND_MESSAGE =
  "Não encontrei informação suficiente para responder isso com segurança. Você pode reformular a pergunta ou, se preferir, falar com a equipe F10.";
const TECHNICAL_FAILURE_MESSAGE =
  "Não consegui consultar as orientações do F10 agora. Se preferir, posso encaminhar você para a equipe de atendimento.";

const RETRIEVAL_STOP_WORDS = new Set([
  "a", "ao", "aos", "as", "como", "da", "das", "de", "do", "dos", "e", "em", "eu",
  "faco", "fazer", "gostaria", "me", "na", "nas", "no", "nos", "o", "onde", "os", "ou",
  "para", "pode", "podem", "poderia", "posso", "preciso", "quero", "saber", "se", "um", "uma",
  "dar", "ver", "mostrar", "mostra", "encontrar", "encontro",
]);

export type SupportAiSource = {
  contentId: string;
  slug: string;
  title: string;
  rank: number;
  score: number;
};

export type SupportAiAnswerOrigin = "current_article" | "other_article" | "global";

export type SupportAiResult = {
  runId: string;
  searchEventId: string | null;
  resolution: "answered" | "escalate" | "failed";
  answer: string;
  escalationReason: string;
  target: HelpKnowledgeTarget | null;
  sources: SupportAiSource[];
  answerOrigin: SupportAiAnswerOrigin;
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
  preferredArticleSlug?: string | null;
  maxOutputTokens?: number;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isConversationNoise(value: string): boolean {
  const normalized = normalizeText(value);
  return /^(?:oi|ola|opa|e ai|bom dia|boa tarde|boa noite|tudo bem|oi tudo bem|ola tudo bem|obrigado|obrigada|valeu)$/.test(normalized);
}

function isConversationalFollowUp(question: string): boolean {
  const normalized = normalizeText(question);
  if (!normalized || normalized.length > 140) return false;
  return (
    /^(?:e\b|isso\b|isto\b|esse\b|essa\b|este\b|esta\b|ele\b|ela\b|depois\b|agora\b)/.test(normalized) ||
    /\b(?:isso|isto|esse|essa|este|esta|ele|ela|mesmo|mesma|outro|outra|tambem|video|link|artigo|conteudo|passo anterior|passo seguinte)\b/.test(normalized)
  );
}

function previousCustomerTopic(conversationContext: string): string {
  const customerMessages = conversationContext
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reverse();

  for (const line of customerMessages) {
    const match = line.match(/^Cliente:\s*(.+)$/i);
    if (!match?.[1]) continue;
    const value = match[1].trim().slice(0, 320);
    if (
      value.length < 3 ||
      isConversationNoise(value) ||
      isConversationalFollowUp(value)
    ) continue;
    return value;
  }
  return "";
}

function retrievalKeywords(value: string): string {
  const keywords = Array.from(
    new Set(
      normalizeText(value)
        .split(" ")
        .filter((term) => term.length >= 3 && !RETRIEVAL_STOP_WORDS.has(term)),
    ),
  ).slice(0, 10);
  return keywords.length >= 2 ? keywords.join(" ") : value.trim();
}

function knowledgeQuestion(question: string, conversationContext: string): string {
  let contextualQuestion = question;
  if (conversationContext && isConversationalFollowUp(question)) {
    const topic = previousCustomerTopic(conversationContext);
    if (topic) contextualQuestion = `${topic} ${question}`;
  }
  return retrievalKeywords(contextualQuestion).slice(0, 600);
}

function knowledgeConversationContext(question: string, conversationContext: string): string {
  const currentQuestion = `Pergunta original do cliente: ${question}`;
  return conversationContext
    ? `${conversationContext}\n${currentQuestion}`.slice(-6_000)
    : currentQuestion;
}

function emphasizeSupportMarkers(answer: string): string {
  return answer
    .replace(
      /\b(Acesse|Use|Abra|Vá para|Navegue até|Entre em)\s+([^.;\n]+(?:\s*>\s*[^.;\n]+)+)(?=[.;]|$)/giu,
      (_match, action: string, path: string) => `${action} **${path.trim()}**`,
    )
    .replace(
      /\((ex\.:?\s*)([^)]+)\)/giu,
      (_match, prefix: string, example: string) => `(${prefix}**${example.trim()}**)`,
    );
}

function proceduralSegments(answer: string): string[] {
  const normalized = answer
    .replace(/;\s+(?=(?:para|se|use|acesse|selecione|clique|marque|desmarque|informe|preencha)\b)/gi, ".\n")
    .replace(/\s+/g, " ")
    .replace(/\.\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g, ".\n");
  return normalized
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatSupportAnswer(answer: string): string {
  const trimmed = emphasizeSupportMarkers(answer.trim());
  if (!trimmed || /\n\s*(?:[-•]|\d+[.)])\s+/.test(trimmed)) return trimmed;

  const segments = proceduralSegments(trimmed);
  const actionSegments = segments.filter((segment) =>
    /^(?:acesse|selecione|clique|marque|desmarque|use|informe|preencha|abra|escolha|confirme|salve|para\b|se\b)/i.test(segment),
  );
  if (segments.length < 3 || actionSegments.length < 2) return trimmed;

  return [
    "**Passo a passo**",
    "",
    ...segments.map((segment, index) => `${index + 1}. ${segment}`),
  ].join("\n");
}

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
      answer: formatSupportAnswer(result.answer),
      escalationReason: "",
    };
  }

  return {
    resolution: "escalate",
    answer: NOT_FOUND_MESSAGE,
    escalationReason: "A Base de Conhecimento não sustentou uma resposta segura para esta pergunta.",
  };
}

function mergeArticleKnowledge(
  discovery: HelpKnowledgeResult,
  answer: HelpKnowledgeResult,
): HelpKnowledgeResult {
  return {
    ...answer,
    searchEventId: discovery.searchEventId ?? answer.searchEventId,
    retrievalQuery: discovery.retrievalQuery,
    sources: discovery.sources.length > 0 ? discovery.sources : answer.sources,
  };
}

async function answerArticle(
  input: RunSupportAiInput,
  question: string,
  slug: string,
): Promise<HelpKnowledgeResult> {
  return answerHelpQuestion({
    question,
    scope: { type: "article", slug },
    source: "chat_ai",
    actorUserId: input.actorUserId ?? null,
    customerContactId: input.customerContactId ?? null,
    conversationContext: input.conversationContext,
    maxOutputTokens: input.maxOutputTokens,
  });
}

async function answerGlobal(
  input: RunSupportAiInput,
  question: string,
): Promise<HelpKnowledgeResult> {
  let knowledge = await answerHelpQuestion({
    question: knowledgeQuestion(question, input.conversationContext ?? ""),
    scope: { type: "global" },
    source: "chat_ai",
    actorUserId: input.actorUserId ?? null,
    customerContactId: input.customerContactId ?? null,
    conversationContext: knowledgeConversationContext(
      question,
      input.conversationContext ?? "",
    ),
    maxOutputTokens: input.maxOutputTokens,
  });

  if (knowledge.resolution === "navigate" && knowledge.target?.slug) {
    const navigationKnowledge = knowledge;
    const articleKnowledge = await answerArticle(
      input,
      question,
      navigationKnowledge.target.slug,
    );
    if (articleKnowledge.resolution === "answered") {
      knowledge = mergeArticleKnowledge(navigationKnowledge, articleKnowledge);
    }
  }

  return knowledge;
}

async function resolveKnowledge(
  input: RunSupportAiInput,
  question: string,
): Promise<{ knowledge: HelpKnowledgeResult; answerOrigin: SupportAiAnswerOrigin }> {
  const preferredArticleSlug = input.preferredArticleSlug?.trim().slice(0, 160) ?? "";

  if (preferredArticleSlug) {
    try {
      const currentArticle = await answerArticle(input, question, preferredArticleSlug);
      if (currentArticle.resolution === "answered") {
        return { knowledge: currentArticle, answerOrigin: "current_article" };
      }

      if (
        currentArticle.resolution === "found_elsewhere" &&
        currentArticle.target?.slug &&
        currentArticle.target.slug !== preferredArticleSlug
      ) {
        const otherArticle = await answerArticle(
          input,
          question,
          currentArticle.target.slug,
        );
        if (otherArticle.resolution === "answered") {
          return {
            knowledge: mergeArticleKnowledge(currentArticle, otherArticle),
            answerOrigin: "other_article",
          };
        }
      }
    } catch (cause) {
      if (!(cause instanceof Error) || cause.message !== "HELP_ARTICLE_NOT_FOUND") {
        throw cause;
      }
    }
  }

  const global = await answerGlobal(input, question);
  return {
    knowledge: global,
    answerOrigin:
      preferredArticleSlug && global.target?.slug && global.target.slug !== preferredArticleSlug
        ? "other_article"
        : "global",
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
    const { knowledge, answerOrigin } = await resolveKnowledge(input, question);
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
      scope: answerOrigin === "current_article" ? "article" : "global",
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
      target: knowledge.target,
      sources: knowledge.sources,
      answerOrigin,
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
      scope: input.preferredArticleSlug ? "article" : "global",
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
      target: null,
      sources: [],
      answerOrigin: "global",
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
