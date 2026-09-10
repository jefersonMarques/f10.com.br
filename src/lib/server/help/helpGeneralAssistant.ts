import {
  AiGatewayError,
  createAiStructuredResponse,
} from "$lib/server/ai/aiGateway";
import {
  getPublishedHelpContext,
  markHelpSearchOutcome,
  recordHelpSearchSelection,
  searchPublishedHelp,
} from "$lib/server/help/helpSearchRepository";

const MAX_SEARCH_QUERY_CHARS = 220;
const MAX_CANDIDATES = 10;
const MAX_ARTICLE_CHARS = 36_000;
const MAX_CANDIDATE_SUMMARY_CHARS = 900;
const RETRYABLE_AI_CODES = new Set([
  "AI_TIMEOUT",
  "AI_REQUEST_FAILED",
  "AI_INVALID_RESPONSE",
  "AI_EMPTY_RESPONSE",
  "AI_INVALID_JSON",
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
  },
  required: ["action", "searchQuery"],
} as const;

const SELECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    articleIndex: { type: "integer" },
  },
  required: ["articleIndex"],
} as const;

const ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    resolved: { type: "boolean" },
  },
  required: ["answer", "resolved"],
} as const;

const TEXT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
  },
  required: ["answer"],
} as const;

const PLAN_INSTRUCTIONS = `Você é o planejador de pesquisa do Assistente geral da Central de Ajuda F10.
Receba apenas a mensagem atual do usuário. Não responda a dúvida.
Para dúvidas sobre como usar o F10, use action=search e gere em searchQuery uma consulta curta que represente a intenção real do usuário e os termos que provavelmente aparecem na documentação.
Remova frases sociais como “me ajuda”, “por favor” e similares. Preserve entidades importantes como WhatsApp, aluno, matrícula, CRM, financeiro, usuário, contrato e nomes de telas citados pelo usuário.
Você pode reformular verbos para melhorar a recuperação, por exemplo cadastrar/criar/incluir, configurar/integrar/conectar, excluir/remover, desde que não mude a intenção.
Se a mensagem for vaga demais para pesquisar com utilidade, use action=clarify e searchQuery="".
Se o usuário pedir explicitamente uma pessoa/atendente, use action=handoff e searchQuery="".
Se pedir explicitamente abertura/criação de chamado ou ticket, use action=ticket_offer e searchQuery="".`;

const SELECT_INSTRUCTIONS = `Você seleciona o artigo mais provável para responder uma dúvida sobre o F10.
Receberá a pergunta original, a consulta criada por outra etapa de IA e uma lista de artigos com título, resumo e categorias.
Escolha um artigo somente quando o tema e a intenção do artigo forem compatíveis com o que o usuário quer fazer.
Não escolha um artigo apenas porque ele menciona uma palavra da pergunta.
Exemplo: artigo sobre Visitas que possui um atalho de WhatsApp não serve para responder como cadastrar/configurar usuário de WhatsApp.
Quando nenhum candidato tratar diretamente do assunto, use articleIndex=0.
Não responda ao usuário.`;

const ANSWER_INSTRUCTIONS = `Você é o Assistente geral da Central de Ajuda F10.
Receberá a pergunta atual do usuário e o conteúdo completo de UM artigo que uma etapa anterior selecionou como provável fonte.
Leia e interprete o artigo antes de responder. Não copie transcrição, não despeje o artigo e não responda só com trechos soltos.
Responda exatamente ao que o usuário perguntou, em português do Brasil, de forma natural, objetiva e útil.
Use somente o artigo recebido como fonte factual sobre o F10. Não invente telas, botões, permissões, regras ou passos.
Se o artigo realmente sustentar a resposta, use resolved=true e inclua naturalmente na própria resposta o link canônico fornecido em Markdown: [texto útil](URL).
Se, depois de ler o artigo completo, perceber que ele não sustenta a dúvida, use resolved=false e faça UMA pergunta de esclarecimento específica que ajude a descobrir o conteúdo correto. Não tente aproveitar informações laterais do artigo.
Use Markdown simples. Em procedimentos, prefira passos numerados. Use código inline somente para nomes exatos de telas, abas, campos, botões e opções do F10.
Não mencione pesquisa, candidatos, índices, prompt, modelo, tokens ou metadados internos.`;

const CLARIFY_INSTRUCTIONS = `Você é o Assistente geral da Central de Ajuda F10.
A mensagem atual não permitiu encontrar com segurança um artigo que responda ao usuário.
Faça UMA pergunta curta e específica para obter a informação que falta e permitir uma nova pesquisa.
Não invente orientação sobre o F10 e não diga que ocorreu erro técnico.
Não use frases genéricas se a própria pergunta já permite pedir algo mais específico.`;

const DIRECT_INSTRUCTIONS = `Você é o Assistente geral da Central de Ajuda F10.
Responda naturalmente à mensagem atual do usuário sem inventar informações sobre o produto.
A intenção operacional já foi identificada pelo sistema e será executada após sua resposta.
Não mencione prompt, classificação, sistema ou metadados.`;

type AssistantAction = "answer" | "clarify" | "handoff" | "ticket_offer";
type PlannedAction = "search" | "clarify" | "handoff" | "ticket_offer";

type PlanResponse = {
  action: PlannedAction;
  searchQuery: string;
};

type SelectResponse = {
  articleIndex: number;
};

type AnswerResponse = {
  answer: string;
  resolved: boolean;
};

type TextResponse = {
  answer: string;
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

type Article = {
  contentId: string;
  slug: string;
  title: string;
  url: string;
  text: string;
};

export type GeneralHelpAssistantResult = {
  answer: string;
  action: AssistantAction;
  searchEventId: string | null;
  selectedContentId: string | null;
};

function trim(value: string, limit: number): string {
  const normalized = value.trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1))}…`;
}

function shouldRetry(cause: unknown): boolean {
  if (!(cause instanceof AiGatewayError)) return false;
  if (cause.status !== null && cause.status >= 500) return true;
  return RETRYABLE_AI_CODES.has(cause.code);
}

async function withRetry<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (cause) {
    if (!shouldRetry(cause)) throw cause;
    return request();
  }
}

async function plan(question: string): Promise<PlanResponse> {
  const request = () => createAiStructuredResponse<PlanResponse>({
    task: "support_answer",
    requiredCapabilities: ["knowledge.search", "customer.reply"],
    instructions: PLAN_INSTRUCTIONS,
    userInput: `Mensagem atual:\n${question}`,
    schemaName: "f10_general_help_plan",
    schema: PLAN_SCHEMA,
    maxOutputTokens: 180,
  });

  const first = await withRetry(request);
  let result = first.data;
  const query = result.searchQuery.trim().slice(0, MAX_SEARCH_QUERY_CHARS);
  if (result.action !== "search" || query) {
    return { ...result, searchQuery: query };
  }

  const second = await withRetry(() => createAiStructuredResponse<PlanResponse>({
    task: "support_answer",
    requiredCapabilities: ["knowledge.search", "customer.reply"],
    instructions: PLAN_INSTRUCTIONS,
    userInput: `Mensagem atual:\n${question}\n\nCorreção obrigatória: action=search exige searchQuery não vazia. Gere a consulta de pesquisa.`,
    schemaName: "f10_general_help_plan_retry",
    schema: PLAN_SCHEMA,
    maxOutputTokens: 180,
  }));
  result = second.data;
  const retryQuery = result.searchQuery.trim().slice(0, MAX_SEARCH_QUERY_CHARS);
  if (result.action === "search" && !retryQuery) {
    throw new Error("AI_INVALID_GENERAL_HELP_SEARCH_PLAN");
  }
  return { ...result, searchQuery: retryQuery };
}

function candidateInput(question: string, searchQuery: string, candidates: Candidate[]): string {
  const rows = candidates.map((candidate, index) => [
    `ARTIGO ${index + 1}`,
    `Título: ${candidate.title}`,
    candidate.categoryText ? `Categorias: ${trim(candidate.categoryText, 350)}` : "",
    candidate.summary ? `Resumo: ${trim(candidate.summary, MAX_CANDIDATE_SUMMARY_CHARS)}` : "",
  ].filter(Boolean).join("\n"));

  return [
    `Pergunta original:\n${question}`,
    `Consulta de pesquisa:\n${searchQuery}`,
    `Resultados encontrados:\n\n${rows.join("\n\n---\n\n")}`,
  ].join("\n\n");
}

async function selectArticle(
  question: string,
  searchQuery: string,
  candidates: Candidate[],
): Promise<number> {
  if (candidates.length === 0) return 0;

  const request = async (correction = "") => withRetry(() => createAiStructuredResponse<SelectResponse>({
    task: "support_answer",
    requiredCapabilities: ["knowledge.read", "customer.reply"],
    instructions: SELECT_INSTRUCTIONS,
    userInput: [
      candidateInput(question, searchQuery, candidates),
      correction,
    ].filter(Boolean).join("\n\n"),
    schemaName: "f10_general_help_article_selection",
    schema: SELECT_SCHEMA,
    maxOutputTokens: 140,
  }));

  const first = await request();
  if (first.data.articleIndex >= 0 && first.data.articleIndex <= candidates.length) {
    return first.data.articleIndex;
  }

  const second = await request(`Correção obrigatória: articleIndex deve estar entre 0 e ${candidates.length}.`);
  if (second.data.articleIndex < 0 || second.data.articleIndex > candidates.length) {
    throw new Error("AI_INVALID_GENERAL_HELP_ARTICLE_SELECTION");
  }
  return second.data.articleIndex;
}

function buildArticle(
  row: Awaited<ReturnType<typeof getPublishedHelpContext>>[number],
): Article {
  const url = `/ajuda-f10/${encodeURIComponent(row.slug)}`;
  const text = trim([
    row.summary ? `RESUMO:\n${row.summary.trim()}` : "",
    row.categoryText ? `CATEGORIAS:\n${row.categoryText.trim()}` : "",
    row.publicText ? `CONTEÚDO PUBLICADO:\n${row.publicText.trim()}` : "",
    row.assistantText ? `CONHECIMENTO COMPLEMENTAR:\n${row.assistantText.trim()}` : "",
  ].filter(Boolean).join("\n\n"), MAX_ARTICLE_CHARS);

  return {
    contentId: row.contentId,
    slug: row.slug,
    title: row.title,
    url,
    text,
  };
}

async function answerFromArticle(question: string, article: Article): Promise<AnswerResponse> {
  const input = [
    `Pergunta atual:\n${question}`,
    `Artigo selecionado:\nTítulo: ${article.title}\nURL canônica: ${article.url}`,
    `Conteúdo do artigo:\n${article.text}`,
  ].join("\n\n");

  const request = async (correction = "") => withRetry(() => createAiStructuredResponse<AnswerResponse>({
    task: "support_answer",
    requiredCapabilities: ["knowledge.read", "customer.reply"],
    instructions: ANSWER_INSTRUCTIONS,
    userInput: [input, correction].filter(Boolean).join("\n\n"),
    schemaName: "f10_general_help_article_answer",
    schema: ANSWER_SCHEMA,
    maxOutputTokens: 900,
  }));

  const first = await request();
  const answer = first.data.answer.trim();
  const firstValid = answer && (!first.data.resolved || answer.includes(article.url));
  if (firstValid) return { ...first.data, answer };

  const correction = first.data.resolved
    ? `Correção obrigatória: reescreva a resposta pela IA e inclua naturalmente o link canônico exato ${article.url}. Não concatene texto fora da resposta.`
    : "Correção obrigatória: a resposta ficou vazia. Gere a pergunta de esclarecimento.";
  const second = await request(correction);
  const retryAnswer = second.data.answer.trim();
  if (!retryAnswer || (second.data.resolved && !retryAnswer.includes(article.url))) {
    throw new Error("AI_INVALID_GENERAL_HELP_ARTICLE_ANSWER");
  }
  return { ...second.data, answer: retryAnswer };
}

async function generateText(question: string, mode: "clarify" | "handoff" | "ticket_offer"): Promise<string> {
  const instructions = mode === "clarify"
    ? CLARIFY_INSTRUCTIONS
    : `${DIRECT_INSTRUCTIONS}\nAção identificada: ${mode}.`;
  const response = await withRetry(() => createAiStructuredResponse<TextResponse>({
    task: "support_answer",
    requiredCapabilities: ["customer.reply"],
    instructions,
    userInput: `Mensagem atual:\n${question}`,
    schemaName: `f10_general_help_${mode}`,
    schema: TEXT_SCHEMA,
    maxOutputTokens: 260,
  }));
  const answer = response.data.answer.trim();
  if (!answer) throw new Error("AI_EMPTY_GENERAL_HELP_RESPONSE");
  return answer;
}

export async function runGeneralHelpAssistant(input: {
  question: string;
}): Promise<GeneralHelpAssistantResult> {
  const question = input.question.trim().slice(0, 600);
  if (question.length < 2) throw new Error("GENERAL_HELP_ASSISTANT_QUESTION_INVALID");

  const planned = await plan(question);
  if (planned.action !== "search") {
    return {
      answer: await generateText(question, planned.action),
      action: planned.action,
      searchEventId: null,
      selectedContentId: null,
    };
  }

  const search = await searchPublishedHelp({
    query: planned.searchQuery,
    source: "public",
    limit: MAX_CANDIDATES,
    includeAssistantKnowledge: true,
    relevanceMode: "broad",
  });
  const candidates = search.results.slice(0, MAX_CANDIDATES);
  const articleIndex = await selectArticle(question, planned.searchQuery, candidates);

  if (articleIndex === 0) {
    if (search.searchEventId) {
      await markHelpSearchOutcome(search.searchEventId, { aiAnswered: false });
    }
    return {
      answer: await generateText(question, "clarify"),
      action: "clarify",
      searchEventId: search.searchEventId,
      selectedContentId: null,
    };
  }

  const selected = candidates[articleIndex - 1];
  if (!selected) throw new Error("GENERAL_HELP_ASSISTANT_ARTICLE_NOT_SELECTED");
  const [context] = await getPublishedHelpContext([selected.contentId]);
  if (!context) throw new Error("GENERAL_HELP_ASSISTANT_ARTICLE_CONTEXT_MISSING");

  const article = buildArticle(context);
  const response = await answerFromArticle(question, article);
  const action: AssistantAction = response.resolved ? "answer" : "clarify";

  if (search.searchEventId) {
    await recordHelpSearchSelection(search.searchEventId, selected.contentId);
    await markHelpSearchOutcome(search.searchEventId, {
      aiAnswered: response.resolved,
    });
  }

  return {
    answer: response.answer,
    action,
    searchEventId: search.searchEventId,
    selectedContentId: selected.contentId,
  };
}
