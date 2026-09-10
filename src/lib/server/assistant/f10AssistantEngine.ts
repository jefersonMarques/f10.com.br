import { and, eq, sql } from "drizzle-orm";
import {
  AiGatewayError,
  createAiStructuredResponse,
  type AiStructuredResponse,
} from "$lib/server/ai/aiGateway";
import type {
  AiCapability,
  AiProviderCode,
  AiTaskCode,
} from "$lib/server/ai/aiTypes";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import {
  parseHelpKnowledgeDocument,
  type HelpKnowledgeDocument,
  type HelpKnowledgeTargetType,
} from "$lib/server/help/helpKnowledgeCompiler";
import {
  markHelpSearchOutcome,
  recordHelpSearchSelection,
  searchPublishedHelp,
  type HelpSearchSource,
} from "$lib/server/help/helpSearchRepository";

export type F10AssistantSurface = "helpdesk" | "article" | "chat";
export type F10AssistantAction = "answer" | "clarify" | "handoff" | "ticket_offer";

type PlannedAction = "search" | "current_article" | "clarify" | "handoff" | "ticket_offer";

type PlanResponse = {
  action: PlannedAction;
  searchQuery: string;
  reply: string;
};

type SelectionResponse = {
  articleIndex: number;
  reply: string;
};

type ArticleAnswerResponse = {
  answer: string;
  resolved: boolean;
  fragmentIndex: number;
};

type Candidate = {
  contentId: string;
  slug: string;
  title: string;
  summary: string;
  categoryText: string;
  rank: number;
  score: number;
};

type ArticleFragment = {
  targetType: HelpKnowledgeTargetType;
  stepId: string | null;
  blockId: string | null;
  anchor: string | null;
  text: string;
  url: string;
};

type ArticleContext = {
  contentId: string;
  slug: string;
  title: string;
  url: string;
  fragments: ArticleFragment[];
};

type UsageState = {
  provider: AiProviderCode | null;
  model: string | null;
  responseId: string | null;
  inputTokens: number;
  inputTokensKnown: boolean;
  outputTokens: number;
  outputTokensKnown: boolean;
  fallbackUsed: boolean;
};

export type F10AssistantTarget = {
  contentId: string;
  slug: string;
  title: string;
  targetType: HelpKnowledgeTargetType;
  stepId: string | null;
  blockId: string | null;
  anchor: string | null;
};

export type F10AssistantSource = {
  contentId: string;
  slug: string;
  title: string;
  rank: number;
  score: number;
};

export type F10AssistantResult = {
  action: F10AssistantAction;
  answer: string;
  target: F10AssistantTarget | null;
  searchEventId: string | null;
  retrievalQuery: string;
  sources: F10AssistantSource[];
  provider: AiProviderCode | null;
  model: string | null;
  providerResponseId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  fallbackUsed: boolean;
};

const MAX_QUESTION_CHARS = 600;
const MAX_SEARCH_QUERY_CHARS = 220;
const MAX_CANDIDATES = 10;
const MAX_CONVERSATION_CHARS = 4_500;
const MAX_ARTICLE_CONTEXT_CHARS = 48_000;
const MAX_CANDIDATE_SUMMARY_CHARS = 800;
const DEFAULT_MAX_OUTPUT_TOKENS = 1_100;

const RETRIABLE_CODES = new Set([
  "AI_TIMEOUT",
  "AI_REQUEST_FAILED",
  "AI_INVALID_RESPONSE",
  "AI_EMPTY_RESPONSE",
  "AI_INVALID_JSON",
  "AI_OUTPUT_INCOMPLETE",
]);

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ["search", "current_article", "clarify", "handoff", "ticket_offer"],
    },
    searchQuery: { type: "string" },
    reply: { type: "string" },
  },
  required: ["action", "searchQuery", "reply"],
} as const;

const SELECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    articleIndex: { type: "integer" },
    reply: { type: "string" },
  },
  required: ["articleIndex", "reply"],
} as const;

const ARTICLE_ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    resolved: { type: "boolean" },
    fragmentIndex: { type: "integer" },
  },
  required: ["answer", "resolved", "fragmentIndex"],
} as const;

function taskFor(surface: F10AssistantSurface): AiTaskCode {
  return surface === "chat" ? "support_answer" : "help_public_answer";
}

function capabilitiesFor(surface: F10AssistantSurface): AiCapability[] {
  return surface === "chat"
    ? ["knowledge.search", "knowledge.read", "customer.reply"]
    : ["knowledge.search", "knowledge.read", "public.reply"];
}

function searchSourceFor(surface: F10AssistantSurface): HelpSearchSource {
  return surface === "chat" ? "chat_ai" : "public";
}

function trim(value: string, limit: number): string {
  const normalized = value.trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1))}…`;
}

function effectiveConversationContext(
  surface: F10AssistantSurface,
  value: string | undefined,
): string {
  if (surface === "helpdesk") return "";
  return trim(value ?? "", MAX_CONVERSATION_CHARS);
}

function shouldRetry(cause: unknown): boolean {
  if (!(cause instanceof AiGatewayError)) return false;
  if (cause.status !== null && cause.status >= 500) return true;
  return RETRIABLE_CODES.has(cause.code);
}

function createUsageState(): UsageState {
  return {
    provider: null,
    model: null,
    responseId: null,
    inputTokens: 0,
    inputTokensKnown: false,
    outputTokens: 0,
    outputTokensKnown: false,
    fallbackUsed: false,
  };
}

function absorbUsage<T>(usage: UsageState, response: AiStructuredResponse<T>): void {
  usage.provider = response.provider;
  usage.model = response.model;
  usage.responseId = response.responseId;
  usage.fallbackUsed ||= response.fallbackUsed;
  if (response.inputTokens !== null) {
    usage.inputTokens += response.inputTokens;
    usage.inputTokensKnown = true;
  }
  if (response.outputTokens !== null) {
    usage.outputTokens += response.outputTokens;
    usage.outputTokensKnown = true;
  }
}

async function runStructured<T>(input: {
  surface: F10AssistantSurface;
  instructions: string;
  userInput: string;
  schemaName: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
  usage: UsageState;
}): Promise<T> {
  const request = () => createAiStructuredResponse<T>({
    task: taskFor(input.surface),
    requiredCapabilities: capabilitiesFor(input.surface),
    instructions: input.instructions,
    userInput: input.userInput,
    schemaName: input.schemaName,
    schema: input.schema,
    maxOutputTokens: input.maxOutputTokens,
  });

  let response: AiStructuredResponse<T>;
  try {
    response = await request();
  } catch (cause) {
    if (!shouldRetry(cause)) throw cause;
    response = await request();
  }
  absorbUsage(input.usage, response);
  return response.data;
}

async function getPublishedDocument(input: {
  slug?: string;
  contentId?: string;
}): Promise<HelpKnowledgeDocument | null> {
  if (!input.slug && !input.contentId) return null;
  const predicate = input.contentId
    ? eq(helpPublications.entityId, input.contentId)
    : sql`${helpPublications.snapshot}->'knowledge'->>'slug' = ${input.slug ?? ""}`;
  const [row] = await getDatabase()
    .select({
      entityId: helpPublications.entityId,
      snapshot: helpPublications.snapshot,
    })
    .from(helpPublications)
    .where(and(eq(helpPublications.entityType, "content"), predicate))
    .limit(1);
  if (!row) return null;
  const document = parseHelpKnowledgeDocument(row.snapshot.knowledge);
  if (!document || document.contentId !== row.entityId) return null;
  return document;
}

function buildArticleContext(document: HelpKnowledgeDocument): ArticleContext {
  const baseUrl = `/ajuda-f10/${encodeURIComponent(document.slug)}`;
  let remaining = MAX_ARTICLE_CONTEXT_CHARS;
  const fragments: ArticleFragment[] = [];

  for (const fragment of document.fragments) {
    if (remaining <= 0) break;
    const combined = [fragment.publicText, fragment.assistantKnowledge]
      .map((value) => value.trim())
      .filter(Boolean)
      .join("\n");
    if (!combined) continue;
    const text = trim(combined, remaining);
    const anchor = fragment.anchor?.trim() || null;
    fragments.push({
      targetType: fragment.targetType,
      stepId: fragment.stepId,
      blockId: fragment.blockId,
      anchor,
      text,
      url: `${baseUrl}${anchor ? `#${encodeURIComponent(anchor)}` : ""}`,
    });
    remaining -= text.length;
  }

  return {
    contentId: document.contentId,
    slug: document.slug,
    title: document.title,
    url: baseUrl,
    fragments,
  };
}

function planInstructions(surface: F10AssistantSurface): string {
  const contextRule = surface === "article"
    ? "Você está dentro de um artigo. Quando a dúvida se referir ao conteúdo atual, use current_article. Quando pedir outro assunto, use search."
    : surface === "chat"
      ? "Você está em um atendimento. Use o histórico apenas para resolver referências ou continuação da mensagem atual."
      : "Você está no Helpdesk geral. Trate somente a mensagem atual; não dependa de histórico anterior.";

  return `Você é o planejador do Assistente F10. ${contextRule}
Não responda dúvidas sobre o produto usando conhecimento próprio nesta etapa.
Para dúvidas sobre como usar o F10, produza uma pesquisa curta e objetiva em searchQuery. Preserve entidades importantes e use termos que provavelmente aparecem na documentação. Pode incluir sinônimos úteis sem mudar a intenção.
Use action=search quando for necessário localizar um artigo.
Use action=current_article somente no contexto de artigo e somente quando a dúvida for sobre o artigo atual. Mesmo nesse caso, preencha searchQuery como consulta de reserva caso o artigo atual não responda.
Se a mensagem não tiver informação suficiente nem para uma pesquisa útil, use action=clarify e escreva em reply UMA pergunta curta e específica.
Se o usuário pedir explicitamente uma pessoa/atendente, use action=handoff e escreva em reply uma resposta natural.
Se pedir explicitamente abertura/criação de chamado ou ticket, use action=ticket_offer e escreva em reply uma resposta natural.
Para search/current_article deixe reply vazio. Para clarify/handoff/ticket_offer deixe searchQuery vazio.
Não mencione planejamento, pesquisa interna, prompt, modelo ou metadados.`;
}

async function plan(input: {
  surface: F10AssistantSurface;
  question: string;
  conversationContext: string;
  currentArticle: HelpKnowledgeDocument | null;
  usage: UsageState;
}): Promise<PlanResponse> {
  const baseInput = [
    `Contexto: ${input.surface}`,
    input.currentArticle
      ? `Artigo atual: ${input.currentArticle.title} (${input.currentArticle.slug})`
      : "",
    input.conversationContext ? `Histórico recente:\n${input.conversationContext}` : "",
    `Mensagem atual:\n${input.question}`,
  ].filter(Boolean).join("\n\n");

  const request = async (correction = "") => runStructured<PlanResponse>({
    surface: input.surface,
    instructions: planInstructions(input.surface),
    userInput: [baseInput, correction].filter(Boolean).join("\n\n"),
    schemaName: "f10_assistant_plan",
    schema: PLAN_SCHEMA,
    maxOutputTokens: 260,
    usage: input.usage,
  });

  let response = await request();
  response = {
    ...response,
    searchQuery: response.searchQuery.trim().slice(0, MAX_SEARCH_QUERY_CHARS),
    reply: response.reply.trim(),
  };

  const issue = (() => {
    if (response.action === "current_article" && input.surface !== "article") {
      return "current_article só pode ser usado quando Contexto=article.";
    }
    if ((response.action === "search" || response.action === "current_article") && !response.searchQuery) {
      return "search e current_article exigem searchQuery não vazia.";
    }
    if (["clarify", "handoff", "ticket_offer"].includes(response.action) && !response.reply) {
      return "clarify, handoff e ticket_offer exigem reply não vazio.";
    }
    return "";
  })();
  if (!issue) return response;

  const retried = await request(`Correção obrigatória: ${issue}`);
  const normalized = {
    ...retried,
    searchQuery: retried.searchQuery.trim().slice(0, MAX_SEARCH_QUERY_CHARS),
    reply: retried.reply.trim(),
  };
  if (
    (normalized.action === "current_article" && input.surface !== "article") ||
    ((normalized.action === "search" || normalized.action === "current_article") && !normalized.searchQuery) ||
    (["clarify", "handoff", "ticket_offer"].includes(normalized.action) && !normalized.reply)
  ) {
    throw new Error("AI_INVALID_F10_ASSISTANT_PLAN");
  }
  return normalized;
}

function candidateInput(input: {
  question: string;
  searchQuery: string;
  conversationContext: string;
  candidates: Candidate[];
}): string {
  const rows = input.candidates.map((candidate, index) => [
    `ARTIGO ${index + 1}`,
    `Título: ${candidate.title}`,
    candidate.categoryText ? `Categorias: ${trim(candidate.categoryText, 320)}` : "",
    candidate.summary ? `Resumo: ${trim(candidate.summary, MAX_CANDIDATE_SUMMARY_CHARS)}` : "",
  ].filter(Boolean).join("\n"));

  return [
    input.conversationContext ? `Histórico relevante:\n${input.conversationContext}` : "",
    `Pergunta atual:\n${input.question}`,
    `Pesquisa produzida pela IA:\n${input.searchQuery}`,
    rows.length > 0
      ? `Artigos encontrados:\n\n${rows.join("\n\n---\n\n")}`
      : "Nenhum artigo foi encontrado para a pesquisa.",
  ].filter(Boolean).join("\n\n");
}

async function selectArticle(input: {
  surface: F10AssistantSurface;
  question: string;
  searchQuery: string;
  conversationContext: string;
  candidates: Candidate[];
  usage: UsageState;
}): Promise<SelectionResponse> {
  const instructions = `Você é a etapa de seleção do Assistente F10.
Analise a intenção completa da pergunta e os artigos encontrados. Não escolha por simples coincidência de palavra.
Escolha articleIndex de 1 a ${input.candidates.length} somente quando título/resumo/categoria indicarem que o artigo realmente pode responder ao que o usuário quer fazer.
Se nenhum artigo for compatível, use articleIndex=0 e escreva em reply UMA pergunta de esclarecimento específica e útil para permitir uma nova tentativa.
Quando escolher um artigo, deixe reply vazio.
Não responda o procedimento nesta etapa e não invente informações sobre o F10.`;

  const request = async (correction = "") => runStructured<SelectionResponse>({
    surface: input.surface,
    instructions,
    userInput: [candidateInput(input), correction].filter(Boolean).join("\n\n"),
    schemaName: "f10_assistant_article_selection",
    schema: SELECTION_SCHEMA,
    maxOutputTokens: 320,
    usage: input.usage,
  });

  let response = await request();
  response = { ...response, reply: response.reply.trim() };
  const validIndex = response.articleIndex >= 0 && response.articleIndex <= input.candidates.length;
  const validReply = response.articleIndex !== 0 || Boolean(response.reply);
  if (validIndex && validReply) return response;

  response = await request(
    `Correção obrigatória: articleIndex deve estar entre 0 e ${input.candidates.length}; quando for 0, reply deve conter uma pergunta específica.`,
  );
  response = { ...response, reply: response.reply.trim() };
  if (
    response.articleIndex < 0 ||
    response.articleIndex > input.candidates.length ||
    (response.articleIndex === 0 && !response.reply)
  ) {
    throw new Error("AI_INVALID_F10_ASSISTANT_SELECTION");
  }
  return response;
}

function articleInput(input: {
  question: string;
  conversationContext: string;
  article: ArticleContext;
}): string {
  const fragments = input.article.fragments.map((fragment, index) => [
    `TRECHO ${index + 1}`,
    `URL: ${fragment.url}`,
    `Conteúdo:\n${fragment.text}`,
  ].join("\n"));

  return [
    input.conversationContext ? `Histórico relevante:\n${input.conversationContext}` : "",
    `Pergunta atual:\n${input.question}`,
    `Artigo selecionado: ${input.article.title}`,
    `URL do artigo: ${input.article.url}`,
    `Trechos do artigo em ordem:\n\n${fragments.join("\n\n---\n\n")}`,
  ].filter(Boolean).join("\n\n");
}

async function answerFromArticle(input: {
  surface: F10AssistantSurface;
  question: string;
  conversationContext: string;
  article: ArticleContext;
  currentArticleSlug: string | null;
  maxOutputTokens: number;
  usage: UsageState;
}): Promise<{ response: ArticleAnswerResponse; target: F10AssistantTarget | null }> {
  if (input.article.fragments.length === 0) throw new Error("F10_ASSISTANT_ARTICLE_EMPTY");
  const linkRequired = input.surface !== "article" || input.article.slug !== input.currentArticleSlug;
  const instructions = `Você é o Assistente F10 e esta é a etapa final de resposta.
Leia o artigo fornecido antes de responder. Responda à intenção real da pergunta, não apenas às palavras que coincidem.
Use somente o conteúdo recebido como fonte factual sobre o F10. Não invente telas, campos, permissões, regras ou passos.
Não copie transcrições nem despeje o artigo. Sintetize e explique de forma natural, objetiva e útil.
Se o artigo realmente sustentar a resposta, use resolved=true e selecione em fragmentIndex o TRECHO que melhor localiza a explicação.
${linkRequired ? "Quando resolved=true, inclua naturalmente na própria resposta o URL exato do TRECHO escolhido em Markdown, por exemplo [ver o artigo](URL)." : "Como o usuário já está no artigo atual, o link para a mesma página é opcional."}
Se o artigo não sustentar a dúvida, use resolved=false, fragmentIndex=0 e faça UMA pergunta curta e específica para esclarecer o que falta. Não aproveite informação lateral só para produzir alguma resposta.
Use Markdown simples. Em procedimentos, prefira passos numerados. Use código inline somente para nomes exatos de telas, abas, campos, botões e opções do F10.
Não mencione etapas internas, pesquisa, candidatos, prompt, modelo, tokens ou metadados.`;

  const baseInput = articleInput(input);
  const request = async (correction = "") => runStructured<ArticleAnswerResponse>({
    surface: input.surface,
    instructions,
    userInput: [baseInput, correction].filter(Boolean).join("\n\n"),
    schemaName: "f10_assistant_article_answer",
    schema: ARTICLE_ANSWER_SCHEMA,
    maxOutputTokens: input.maxOutputTokens,
    usage: input.usage,
  });

  const validate = (response: ArticleAnswerResponse): string => {
    const answer = response.answer.trim();
    if (!answer) return "A resposta ficou vazia.";
    if (!response.resolved) {
      return response.fragmentIndex === 0 ? "" : "Quando resolved=false, fragmentIndex deve ser 0.";
    }
    if (response.fragmentIndex < 1 || response.fragmentIndex > input.article.fragments.length) {
      return `Quando resolved=true, fragmentIndex deve estar entre 1 e ${input.article.fragments.length}.`;
    }
    const fragment = input.article.fragments[response.fragmentIndex - 1];
    if (linkRequired && fragment && !answer.includes(fragment.url)) {
      return `Inclua naturalmente na resposta o URL exato do trecho escolhido: ${fragment.url}`;
    }
    return "";
  };

  let response = await request();
  response = { ...response, answer: response.answer.trim() };
  let issue = validate(response);
  if (issue) {
    response = await request(`Correção obrigatória: ${issue}`);
    response = { ...response, answer: response.answer.trim() };
    issue = validate(response);
  }
  if (issue) throw new Error("AI_INVALID_F10_ASSISTANT_ANSWER");

  if (!response.resolved) return { response, target: null };
  const fragment = input.article.fragments[response.fragmentIndex - 1];
  if (!fragment) throw new Error("F10_ASSISTANT_TARGET_MISSING");
  return {
    response,
    target: {
      contentId: input.article.contentId,
      slug: input.article.slug,
      title: input.article.title,
      targetType: fragment.targetType,
      stepId: fragment.stepId,
      blockId: fragment.blockId,
      anchor: fragment.anchor,
    },
  };
}

function sourcesFromCandidates(candidates: Candidate[]): F10AssistantSource[] {
  return candidates.map((candidate) => ({
    contentId: candidate.contentId,
    slug: candidate.slug,
    title: candidate.title,
    rank: candidate.rank,
    score: candidate.score,
  }));
}

function resultFrom(input: {
  action: F10AssistantAction;
  answer: string;
  target?: F10AssistantTarget | null;
  searchEventId?: string | null;
  retrievalQuery: string;
  sources?: F10AssistantSource[];
  usage: UsageState;
}): F10AssistantResult {
  return {
    action: input.action,
    answer: input.answer.trim(),
    target: input.target ?? null,
    searchEventId: input.searchEventId ?? null,
    retrievalQuery: input.retrievalQuery,
    sources: input.sources ?? [],
    provider: input.usage.provider,
    model: input.usage.model,
    providerResponseId: input.usage.responseId,
    inputTokens: input.usage.inputTokensKnown ? input.usage.inputTokens : null,
    outputTokens: input.usage.outputTokensKnown ? input.usage.outputTokens : null,
    fallbackUsed: input.usage.fallbackUsed,
  };
}

async function searchAndAnswer(input: {
  surface: F10AssistantSurface;
  question: string;
  searchQuery: string;
  conversationContext: string;
  currentArticleSlug: string | null;
  excludeContentId?: string | null;
  actorUserId?: string | null;
  customerContactId?: string | null;
  maxOutputTokens: number;
  usage: UsageState;
}): Promise<F10AssistantResult> {
  const search = await searchPublishedHelp({
    query: input.searchQuery,
    source: searchSourceFor(input.surface),
    actorUserId: input.actorUserId ?? null,
    customerContactId: input.customerContactId ?? null,
    limit: MAX_CANDIDATES,
    includeAssistantKnowledge: true,
    relevanceMode: "broad",
  });
  const candidates = search.results
    .filter((candidate) => candidate.contentId !== input.excludeContentId)
    .slice(0, MAX_CANDIDATES);
  const sources = sourcesFromCandidates(candidates);
  const selection = await selectArticle({
    surface: input.surface,
    question: input.question,
    searchQuery: input.searchQuery,
    conversationContext: input.conversationContext,
    candidates,
    usage: input.usage,
  });

  if (selection.articleIndex === 0) {
    if (search.searchEventId) {
      await markHelpSearchOutcome(search.searchEventId, { aiAnswered: false });
    }
    return resultFrom({
      action: "clarify",
      answer: selection.reply,
      searchEventId: search.searchEventId,
      retrievalQuery: input.searchQuery,
      sources,
      usage: input.usage,
    });
  }

  const selected = candidates[selection.articleIndex - 1];
  if (!selected) throw new Error("F10_ASSISTANT_ARTICLE_NOT_SELECTED");
  const document = await getPublishedDocument({ contentId: selected.contentId });
  if (!document) throw new Error("F10_ASSISTANT_ARTICLE_NOT_FOUND");
  const article = buildArticleContext(document);
  const final = await answerFromArticle({
    surface: input.surface,
    question: input.question,
    conversationContext: input.conversationContext,
    article,
    currentArticleSlug: input.currentArticleSlug,
    maxOutputTokens: input.maxOutputTokens,
    usage: input.usage,
  });

  if (search.searchEventId) {
    await recordHelpSearchSelection(search.searchEventId, selected.contentId);
    await markHelpSearchOutcome(search.searchEventId, {
      aiAnswered: final.response.resolved,
      escalated: false,
    });
  }

  return resultFrom({
    action: final.response.resolved ? "answer" : "clarify",
    answer: final.response.answer,
    target: final.target,
    searchEventId: search.searchEventId,
    retrievalQuery: input.searchQuery,
    sources,
    usage: input.usage,
  });
}

export async function runF10Assistant(input: {
  surface: F10AssistantSurface;
  question: string;
  articleSlug?: string | null;
  conversationContext?: string;
  actorUserId?: string | null;
  customerContactId?: string | null;
  maxOutputTokens?: number;
}): Promise<F10AssistantResult> {
  const question = input.question.trim().slice(0, MAX_QUESTION_CHARS);
  if (question.length < 2) throw new Error("F10_ASSISTANT_QUESTION_INVALID");

  const usage = createUsageState();
  const conversationContext = effectiveConversationContext(input.surface, input.conversationContext);
  const currentArticle = input.surface === "article"
    ? await getPublishedDocument({ slug: input.articleSlug?.trim() || "" })
    : null;
  if (input.surface === "article" && !currentArticle) {
    throw new Error("F10_ASSISTANT_ARTICLE_NOT_FOUND");
  }

  const planned = await plan({
    surface: input.surface,
    question,
    conversationContext,
    currentArticle,
    usage,
  });

  if (planned.action === "clarify" || planned.action === "handoff" || planned.action === "ticket_offer") {
    return resultFrom({
      action: planned.action,
      answer: planned.reply,
      retrievalQuery: question,
      usage,
    });
  }

  const maxOutputTokens = Math.min(
    Math.max(Math.round(input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS), 300),
    1_800,
  );

  if (planned.action === "current_article" && currentArticle) {
    const article = buildArticleContext(currentArticle);
    const direct = await answerFromArticle({
      surface: input.surface,
      question,
      conversationContext,
      article,
      currentArticleSlug: currentArticle.slug,
      maxOutputTokens,
      usage,
    });
    if (direct.response.resolved) {
      return resultFrom({
        action: "answer",
        answer: direct.response.answer,
        target: direct.target,
        retrievalQuery: question,
        sources: [{
          contentId: currentArticle.contentId,
          slug: currentArticle.slug,
          title: currentArticle.title,
          rank: 1,
          score: 1,
        }],
        usage,
      });
    }

    return searchAndAnswer({
      surface: input.surface,
      question,
      searchQuery: planned.searchQuery,
      conversationContext,
      currentArticleSlug: currentArticle.slug,
      excludeContentId: currentArticle.contentId,
      actorUserId: input.actorUserId,
      customerContactId: input.customerContactId,
      maxOutputTokens,
      usage,
    });
  }

  return searchAndAnswer({
    surface: input.surface,
    question,
    searchQuery: planned.searchQuery,
    conversationContext,
    currentArticleSlug: currentArticle?.slug ?? null,
    actorUserId: input.actorUserId,
    customerContactId: input.customerContactId,
    maxOutputTokens,
    usage,
  });
}
