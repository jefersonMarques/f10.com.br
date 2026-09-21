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

type PlannedAction = "search" | "clarify" | "handoff" | "ticket_offer";

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
const MAX_CANDIDATE_SUMMARY_CHARS = 900;
const DEFAULT_MAX_OUTPUT_TOKENS = 1_400;

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
      enum: ["search", "clarify", "handoff", "ticket_offer"],
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

const GENERIC_TERMS = new Set([
  "ajuda",
  "ajudar",
  "como",
  "consigo",
  "consegue",
  "erro",
  "fazer",
  "funciona",
  "funcionar",
  "f10",
  "gostaria",
  "me",
  "nao",
  "pode",
  "poderia",
  "problema",
  "quero",
  "saber",
  "sobre",
  "tenho",
]);

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

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSearchableSubject(question: string, conversationContext: string): boolean {
  const value = normalize([conversationContext, question].filter(Boolean).join(" "));
  if (!value) return false;
  return value
    .split(" ")
    .some((term) => term.length >= 4 && !GENERIC_TERMS.has(term));
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
  const contextRule = surface === "chat"
    ? "Você está em um atendimento do F10. Use o histórico apenas para resolver referências da mensagem atual."
    : surface === "article"
      ? "Você está dentro de um artigo do F10. O artigo atual será lido pelo sistema antes da pesquisa global."
      : "Você está no Assistente geral do F10. A mensagem deve ser interpretada como uma dúvida sobre o F10 por padrão.";

  return `Você cria a pesquisa do Assistente F10. ${contextRule}
Não responda a dúvida de produto nesta etapa.
REGRA PRINCIPAL: se a mensagem contém um assunto identificável, use action=search. Pesquise antes de pedir esclarecimento.
Nunca pergunte se o usuário quer saber sobre o F10 ou sobre um serviço externo. Dentro deste assistente, assuma F10, salvo quando o usuário disser explicitamente que quer informação externa.
Corrija erros ortográficos óbvios na pesquisa. Exemplo: “tranmissão” pode virar “transmissão”.
Gere searchQuery curta, com os termos que provavelmente aparecem na documentação. Preserve entidades relevantes e acrescente sinônimos úteis sem mudar a intenção.
Use action=clarify somente quando realmente não existir assunto pesquisável, como “não funciona”, “me ajuda” ou “como faço?” sem qualquer contexto útil. Nesse caso, reply deve ser UMA pergunta curta para descobrir o assunto. Não invente telas, domínios, URLs, produtos ou procedimentos.
Se o usuário pedir explicitamente uma pessoa/atendente, use action=handoff e escreva uma resposta natural em reply.
Se pedir explicitamente abertura/criação de chamado ou ticket, use action=ticket_offer e escreva uma resposta natural em reply.
Para search deixe reply vazio. Para clarify/handoff/ticket_offer deixe searchQuery vazio.
Não mencione planejamento, pesquisa interna, prompt, modelo ou metadados.`;
}

async function plan(input: {
  surface: F10AssistantSurface;
  question: string;
  conversationContext: string;
  usage: UsageState;
}): Promise<PlanResponse> {
  const baseInput = [
    `Contexto: ${input.surface}`,
    input.conversationContext ? `Histórico relevante:\n${input.conversationContext}` : "",
    `Mensagem atual:\n${input.question}`,
  ].filter(Boolean).join("\n\n");
  const mustSearch = hasSearchableSubject(input.question, input.conversationContext);

  const request = async (correction = "") => runStructured<PlanResponse>({
    surface: input.surface,
    instructions: planInstructions(input.surface),
    userInput: [baseInput, correction].filter(Boolean).join("\n\n"),
    schemaName: "f10_assistant_plan",
    schema: PLAN_SCHEMA,
    maxOutputTokens: 900,
    usage: input.usage,
  });

  const normalizeResponse = (response: PlanResponse): PlanResponse => ({
    ...response,
    searchQuery: response.searchQuery.trim().slice(0, MAX_SEARCH_QUERY_CHARS),
    reply: response.reply.trim(),
  });

  const issueFor = (response: PlanResponse): string => {
    if (response.action === "search" && !response.searchQuery) {
      return "action=search exige searchQuery não vazia.";
    }
    if (response.action === "clarify" && mustSearch) {
      return "A mensagem contém assunto pesquisável. Use action=search e gere a consulta; não peça esclarecimento antes de pesquisar.";
    }
    if (["clarify", "handoff", "ticket_offer"].includes(response.action) && !response.reply) {
      return "clarify, handoff e ticket_offer exigem reply não vazio.";
    }
    return "";
  };

  let response = normalizeResponse(await request());
  let issue = issueFor(response);
  if (!issue) return response;

  response = normalizeResponse(await request(`Correção obrigatória: ${issue}`));
  issue = issueFor(response);
  if (issue) throw new Error("AI_INVALID_F10_ASSISTANT_PLAN");
  return response;
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
    candidate.categoryText ? `Categorias: ${trim(candidate.categoryText, 350)}` : "",
    candidate.summary ? `Resumo: ${trim(candidate.summary, MAX_CANDIDATE_SUMMARY_CHARS)}` : "",
  ].filter(Boolean).join("\n"));

  return [
    input.conversationContext ? `Histórico relevante:\n${input.conversationContext}` : "",
    `Pergunta atual:\n${input.question}`,
    `Pesquisa criada pela IA:\n${input.searchQuery}`,
    rows.length > 0
      ? `Artigos encontrados:\n\n${rows.join("\n\n---\n\n")}`
      : "Nenhum artigo foi encontrado.",
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
  if (input.candidates.length === 0) {
    return {
      articleIndex: 0,
      reply: await clarifyAfterSearch(input),
    };
  }

  const instructions = `Você seleciona a fonte do Assistente F10.
Analise a intenção completa da pergunta e compare com título, categorias e resumo dos artigos.
Não escolha por simples coincidência de palavra. Escolha articleIndex de 1 a ${input.candidates.length} somente quando o artigo realmente puder responder ao que o usuário quer fazer.
Considere que a pergunta é sobre o F10. Não pergunte “F10 ou serviço externo”.
Se nenhum artigo for compatível, use articleIndex=0 e escreva em reply UMA pergunta curta e específica para melhorar uma próxima pesquisa.
Não invente domínios, URLs, telas ou procedimentos. Quando escolher um artigo, deixe reply vazio.
Não responda o procedimento nesta etapa.`;

  const request = async (correction = "") => runStructured<SelectionResponse>({
    surface: input.surface,
    instructions,
    userInput: [candidateInput(input), correction].filter(Boolean).join("\n\n"),
    schemaName: "f10_assistant_article_selection",
    schema: SELECTION_SCHEMA,
    maxOutputTokens: 900,
    usage: input.usage,
  });

  const normalizeResponse = (response: SelectionResponse): SelectionResponse => ({
    articleIndex: response.articleIndex,
    reply: response.reply.trim(),
  });
  const valid = (response: SelectionResponse) =>
    response.articleIndex >= 0 &&
    response.articleIndex <= input.candidates.length &&
    (response.articleIndex !== 0 || Boolean(response.reply));

  let response = normalizeResponse(await request());
  if (valid(response)) return response;

  response = normalizeResponse(await request(
    `Correção obrigatória: articleIndex deve estar entre 0 e ${input.candidates.length}; quando for 0, reply deve conter uma pergunta específica.`,
  ));
  if (!valid(response)) throw new Error("AI_INVALID_F10_ASSISTANT_SELECTION");
  return response;
}

async function clarifyAfterSearch(input: {
  surface: F10AssistantSurface;
  question: string;
  searchQuery: string;
  conversationContext: string;
  usage: UsageState;
}): Promise<string> {
  const response = await runStructured<{ reply: string }>({
    surface: input.surface,
    instructions: `Você é o Assistente F10. Uma pesquisa na documentação não encontrou artigos candidatos para a pergunta atual.
Faça UMA pergunta curta e específica que permita ao usuário acrescentar o detalhe necessário para uma nova pesquisa.
Assuma que a dúvida é sobre o F10. Não pergunte “F10 ou serviço externo”. Não invente domínio, URL, tela, recurso ou procedimento.`,
    userInput: [
      input.conversationContext ? `Histórico relevante:\n${input.conversationContext}` : "",
      `Pergunta atual:\n${input.question}`,
      `Pesquisa tentada:\n${input.searchQuery}`,
    ].filter(Boolean).join("\n\n"),
    schemaName: "f10_assistant_clarify_after_search",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { reply: { type: "string" } },
      required: ["reply"],
    },
    maxOutputTokens: 700,
    usage: input.usage,
  });
  const reply = response.reply.trim();
  if (!reply) throw new Error("AI_EMPTY_F10_ASSISTANT_CLARIFICATION");
  return reply;
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
    `Artigo: ${input.article.title}`,
    `URL do artigo: ${input.article.url}`,
    `Trechos em ordem:\n\n${fragments.join("\n\n---\n\n")}`,
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
  const instructions = `Você é o Assistente F10 e deve responder usando o artigo recebido.
Leia o artigo inteiro antes de responder e considere a intenção completa da pergunta.
Use somente o conteúdo recebido como fonte factual sobre o F10. Não invente telas, campos, permissões, regras ou passos.
Não copie transcrições e não despeje o artigo. Interprete e explique de forma natural, objetiva e útil.
Se o artigo sustentar a resposta, use resolved=true e indique em fragmentIndex o TRECHO que melhor localiza a explicação.
${linkRequired ? "Quando resolved=true, inclua naturalmente na resposta o URL exato do TRECHO escolhido em Markdown." : "Como o usuário já está neste artigo, repetir o link da mesma página é opcional."}
Se o artigo não responder realmente à dúvida, use resolved=false, fragmentIndex=0 e faça UMA pergunta curta e específica. Não aproveite informação lateral apenas para produzir alguma resposta.
Use Markdown simples. Em procedimentos, prefira passos numerados. Use código inline somente para nomes exatos de telas, abas, campos, botões e opções do F10.
Não mencione pesquisa, prompt, modelo, tokens ou metadados.`;

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

  const issueFor = (response: ArticleAnswerResponse): string => {
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
  let issue = issueFor(response);
  if (issue) {
    response = await request(`Correção obrigatória: ${issue}`);
    response = { ...response, answer: response.answer.trim() };
    issue = issueFor(response);
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
    usage,
  });

  if (planned.action !== "search") {
    return resultFrom({
      action: planned.action,
      answer: planned.reply,
      retrievalQuery: question,
      usage,
    });
  }

  const maxOutputTokens = Math.min(
    Math.max(Math.round(input.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS), 900),
    2_200,
  );

  if (currentArticle) {
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
        retrievalQuery: planned.searchQuery,
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
  }

  return searchAndAnswer({
    surface: input.surface,
    question,
    searchQuery: planned.searchQuery,
    conversationContext,
    currentArticleSlug: currentArticle?.slug ?? null,
    excludeContentId: currentArticle?.contentId ?? null,
    actorUserId: input.actorUserId,
    customerContactId: input.customerContactId,
    maxOutputTokens,
    usage,
  });
}
