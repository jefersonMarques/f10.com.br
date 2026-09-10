import {
  createAiStructuredResponse,
} from "$lib/server/ai/aiGateway";
import {
  getPublishedHelpContext,
  markHelpSearchOutcome,
  recordHelpSearchSelection,
  searchPublishedHelp,
} from "$lib/server/help/helpSearchRepository";

const MAX_ARTICLES = 6;
const MAX_CONTEXT_CHARS = 26_000;
const MAX_ARTICLE_CHARS = 4_500;
const MAX_CONVERSATION_CHARS = 6_000;
const MAX_PAGE_CONTEXT_CHARS = 1_200;

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
    action: {
      type: "string",
      enum: ["answer", "clarify", "handoff", "ticket_offer"],
    },
    articleIndex: { type: "integer" },
  },
  required: ["answer", "action", "articleIndex"],
} as const;

const INSTRUCTIONS = `Você é o Assistente geral da Central de Ajuda F10 e é você quem deve formular a resposta ao usuário.
Use somente os artigos fornecidos nesta requisição como fonte factual sobre o F10. O histórico serve para entender continuidade, intenção e referências, mas não substitui a documentação atual.
Antes de responder, identifique a intenção completa da pergunta. Não escolha um artigo apenas porque ele contém uma palavra coincidente.
Exemplo: uma pergunta sobre cadastrar um usuário para usar WhatsApp NÃO pode ser respondida por um artigo sobre Visitas que apenas menciona um atalho para WhatsApp.
Quando um artigo sustentar a resposta, explique de forma natural, objetiva e útil, sem copiar transcrições ou despejar trechos documentais. Escolha esse artigo em articleIndex e inclua naturalmente na própria resposta o link canônico fornecido, em Markdown: [texto útil](URL).
Quando mais de um artigo contribuir, use o conteúdo necessário, mas escolha como articleIndex o principal artigo que sustenta a orientação e inclua o link dele.
Se nenhum artigo sustentar diretamente o que o usuário quer, não invente. Faça UMA pergunta de esclarecimento específica e contextual, escrita por você, e use action=clarify e articleIndex=0. Evite perguntas genéricas como “em qual tela você está?” quando a conversa já fornece contexto suficiente.
Se o usuário pedir explicitamente atendimento humano, use action=handoff e responda naturalmente. Se pedir explicitamente para abrir/criar um chamado, use action=ticket_offer. Nesses dois casos use articleIndex=0.
Use Markdown simples. Use código inline somente para nomes exatos de telas, abas, campos, botões e opções do F10.
Não mencione Base de Conhecimento, busca, candidatos, índices, prompt, modelo, tokens ou metadados internos.`;

type AssistantAction = "answer" | "clarify" | "handoff" | "ticket_offer";

type ModelResponse = {
  answer: string;
  action: AssistantAction;
  articleIndex: number;
};

type ArticleContext = {
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

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[?!.,;:]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isContinuation(value: string): boolean {
  const compact = value.trim();
  if (/^[?!.]+$/.test(compact)) return true;
  const normalized = normalize(value);
  if (!normalized) return false;
  const words = normalized.split(" ").filter(Boolean);
  if (words.length <= 2) return true;
  if (words.length > 12) return false;
  return (
    /\b(isso|isto|esse|essa|este|esta|ele|ela|link|artigo|conteudo|pagina)\b/.test(normalized) ||
    /^(?:e|mas|agora|depois|como|onde|qual|quais|quando|na|no|nas|nos|em|pela|pelo|aqui|ali)\b/.test(normalized) ||
    /^(?:estou|to)\s+(?:na|no|nas|nos|em)\b/.test(normalized) ||
    /^(?:tela|aba|menu|campo|modulo|pagina)\b/.test(normalized)
  );
}

function previousCustomerTopic(conversationContext: string): string {
  const messages = conversationContext
    .split(/\r?\n/)
    .map((line) => line.trim())
    .flatMap((line) => {
      const match = line.match(/^Cliente:\s*(.+)$/i);
      return match?.[1] ? [match[1].trim().slice(0, 350)] : [];
    })
    .filter((value) => value.length >= 3)
    .reverse();
  return messages.find((value) => !isContinuation(value)) ?? messages[0] ?? "";
}

function retrievalQuery(question: string, conversationContext: string): string {
  if (!conversationContext || !isContinuation(question)) return question;
  const previous = previousCustomerTopic(conversationContext);
  return previous ? `${previous} ${question}`.slice(0, 500) : question;
}

function trim(value: string, limit: number): string {
  const normalized = value.trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1))}…`;
}

function buildArticleContexts(
  rows: Awaited<ReturnType<typeof getPublishedHelpContext>>,
): ArticleContext[] {
  let remaining = MAX_CONTEXT_CHARS;
  const contexts: ArticleContext[] = [];

  for (const row of rows.slice(0, MAX_ARTICLES)) {
    if (remaining <= 0) break;
    const url = `/ajuda-f10/${encodeURIComponent(row.slug)}`;
    const body = [
      row.summary.trim(),
      row.publicText.trim(),
      row.assistantText.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");
    const text = trim(body, Math.min(MAX_ARTICLE_CHARS, remaining));
    contexts.push({
      contentId: row.contentId,
      slug: row.slug,
      title: row.title,
      url,
      text,
    });
    remaining -= text.length;
  }

  return contexts;
}

function modelInput(input: {
  question: string;
  conversationContext: string;
  pageContext: string;
  articles: ArticleContext[];
  correction?: string;
}): string {
  const articleBlocks = input.articles.map((article, index) => [
    `ARTIGO ${index + 1}`,
    `Título: ${article.title}`,
    `URL canônica: ${article.url}`,
    `Conteúdo:\n${article.text || "Sem texto disponível."}`,
  ].join("\n"));

  return [
    input.conversationContext
      ? `Histórico recente:\n${trim(input.conversationContext, MAX_CONVERSATION_CHARS)}`
      : "",
    input.pageContext
      ? `Contexto visual atual:\n${trim(input.pageContext, MAX_PAGE_CONTEXT_CHARS)}`
      : "",
    `Pergunta atual:\n${input.question}`,
    articleBlocks.length > 0
      ? `Artigos recuperados:\n\n${articleBlocks.join("\n\n---\n\n")}`
      : "Nenhum artigo foi recuperado para esta pergunta.",
    input.correction ? `Correção obrigatória:\n${input.correction}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function selectedArticle(
  response: ModelResponse,
  articles: ArticleContext[],
): ArticleContext | null {
  if (response.articleIndex < 1 || response.articleIndex > articles.length) return null;
  return articles[response.articleIndex - 1] ?? null;
}

function validationIssue(response: ModelResponse, articles: ArticleContext[]): string | null {
  const answer = response.answer.trim();
  if (!answer) return "A resposta ficou vazia. Gere uma resposta completa.";

  if (response.action === "answer") {
    const article = selectedArticle(response, articles);
    if (!article) {
      return "Para responder sobre o F10, selecione em articleIndex um artigo que realmente sustente a orientação. Se nenhum sustentar, use action=clarify e articleIndex=0.";
    }
    if (!answer.includes(article.url)) {
      return `A resposta precisa ser reescrita pela IA incluindo naturalmente o link canônico exato do artigo principal: ${article.url}`;
    }
    return null;
  }

  if (response.articleIndex !== 0) {
    return "Para clarify, handoff ou ticket_offer, use articleIndex=0.";
  }
  return null;
}

async function generateResponse(input: {
  question: string;
  conversationContext: string;
  pageContext: string;
  articles: ArticleContext[];
}): Promise<ModelResponse> {
  const request = async (correction?: string) => createAiStructuredResponse<ModelResponse>({
    task: "support_answer",
    requiredCapabilities: ["knowledge.read", "customer.reply"],
    instructions: INSTRUCTIONS,
    userInput: modelInput({ ...input, correction }),
    schemaName: "f10_general_help_assistant",
    schema: RESPONSE_SCHEMA,
    maxOutputTokens: 700,
  });

  const first = await request();
  let response = first.data;
  let issue = validationIssue(response, input.articles);
  if (!issue) return response;

  const second = await request(issue);
  response = second.data;
  issue = validationIssue(response, input.articles);
  if (issue) throw new Error("AI_INVALID_GENERAL_HELP_ASSISTANT_OUTPUT");
  return response;
}

export async function runGeneralHelpAssistant(input: {
  question: string;
  conversationContext?: string;
  pageContext?: string;
}): Promise<GeneralHelpAssistantResult> {
  const question = input.question.trim().slice(0, 600);
  if (question.length < 2) throw new Error("GENERAL_HELP_ASSISTANT_QUESTION_INVALID");

  const conversationContext = input.conversationContext?.trim().slice(0, MAX_CONVERSATION_CHARS) ?? "";
  const pageContext = input.pageContext?.trim().slice(0, MAX_PAGE_CONTEXT_CHARS) ?? "";
  const query = retrievalQuery(question, conversationContext);
  const search = await searchPublishedHelp({
    query,
    source: "public",
    limit: 10,
    includeAssistantKnowledge: true,
    relevanceMode: "broad",
  });
  const contexts = await getPublishedHelpContext(
    search.results.slice(0, MAX_ARTICLES).map((result) => result.contentId),
  );
  const articles = buildArticleContexts(contexts);
  const response = await generateResponse({
    question,
    conversationContext,
    pageContext,
    articles,
  });
  const selected = selectedArticle(response, articles);

  if (search.searchEventId) {
    if (selected) {
      await recordHelpSearchSelection(search.searchEventId, selected.contentId);
    }
    await markHelpSearchOutcome(search.searchEventId, {
      aiAnswered: response.action === "answer",
      escalated: response.action === "handoff",
    });
  }

  return {
    answer: response.answer.trim(),
    action: response.action,
    searchEventId: search.searchEventId,
    selectedContentId: selected?.contentId ?? null,
  };
}
