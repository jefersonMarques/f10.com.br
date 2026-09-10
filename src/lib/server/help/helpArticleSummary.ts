import { and, eq, sql } from "drizzle-orm";
import {
  AiGatewayError,
  createAiStructuredResponse,
} from "$lib/server/ai/aiGateway";
import type { AiCapability, AiProviderCode, AiTaskCode } from "$lib/server/ai/aiTypes";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import { parseHelpKnowledgeDocument } from "$lib/server/help/helpKnowledgeCompiler";
import type { HelpKnowledgeResult } from "$lib/server/help/helpKnowledgeEngine";
import type { HelpSearchSource } from "$lib/server/help/helpSearchRepository";

const MAX_SUMMARY_CONTEXT_CHARS = 48_000;
const MAX_SUMMARY_OUTPUT_TOKENS = 1_600;
const MAX_SUMMARY_ANSWER_CHARS = 6_000;
const RETRIABLE_CODES = new Set([
  "AI_TIMEOUT",
  "AI_REQUEST_FAILED",
  "AI_INVALID_RESPONSE",
  "AI_EMPTY_RESPONSE",
  "AI_INVALID_JSON",
]);

const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    answer: { type: "string" },
  },
  required: ["answer"],
} as const;

const SUMMARY_INSTRUCTIONS = `Você resume integralmente um único artigo publicado da Central de Ajuda F10.
Responda em português do Brasil, de forma objetiva e útil.
Todos os trechos recebidos pertencem ao mesmo artigo e estão na ordem publicada.
Cubra o objetivo, a sequência principal, decisões, pré-requisitos e alertas relevantes sem transformar a resposta em uma transcrição do artigo.
Não omita etapas importantes só porque a pergunta é curta.
Use Markdown simples. Em procedimentos, prefira passos numerados; use listas com "-" para conjuntos de itens.
Use código inline somente para nomes exatos de telas, abas, campos, botões e opções da interface.
Não use HTML, tabelas nem blocos de código.
Não invente nenhuma informação que não esteja nos trechos fornecidos.`;

type SummaryAnswer = { answer: string };

type PublicationRow = {
  entityId: string;
  snapshot: Record<string, unknown>;
};

export function isHelpArticleSummaryRequest(question: string): boolean {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    /\b(?:resum\w*|sintetiz\w*)\b/.test(normalized) &&
    /\b(?:artigo|conteudo|pagina|procedimento|tudo|todo|inteiro|completo)\b/.test(normalized)
  );
}

function aiTaskFor(source: HelpSearchSource): AiTaskCode {
  return source === "public" ? "help_public_answer" : "support_answer";
}

function requiredCapabilitiesFor(source: HelpSearchSource): AiCapability[] {
  return source === "public"
    ? ["knowledge.search", "knowledge.read", "public.reply"]
    : ["knowledge.search", "knowledge.read", "customer.reply"];
}

function shouldRetry(cause: unknown): boolean {
  if (!(cause instanceof AiGatewayError)) return false;
  if (cause.status !== null && cause.status >= 500) return true;
  return RETRIABLE_CODES.has(cause.code);
}

async function getPublicationBySlug(slug: string): Promise<PublicationRow | null> {
  const [row] = await getDatabase()
    .select({ entityId: helpPublications.entityId, snapshot: helpPublications.snapshot })
    .from(helpPublications)
    .where(
      and(
        eq(helpPublications.entityType, "content"),
        sql`${helpPublications.snapshot}->'knowledge'->>'slug' = ${slug}`,
      ),
    )
    .limit(1);
  return row ?? null;
}

function buildArticleContext(row: PublicationRow) {
  const document = parseHelpKnowledgeDocument(row.snapshot.knowledge);
  if (!document || document.contentId !== row.entityId) {
    throw new Error("HELP_KNOWLEDGE_DOCUMENT_MISSING");
  }

  let remaining = MAX_SUMMARY_CONTEXT_CHARS;
  const sections: string[] = [];

  for (const fragment of document.fragments) {
    if (remaining <= 0) break;
    const section = [
      fragment.publicText.trim(),
      fragment.assistantKnowledge.trim(),
    ]
      .filter(Boolean)
      .join("\n");
    if (!section) continue;

    const trimmed = section.length <= remaining
      ? section
      : `${section.slice(0, Math.max(0, remaining - 1))}…`;
    sections.push(trimmed);
    remaining -= trimmed.length;
  }

  return { document, context: sections.join("\n\n---\n\n") };
}

async function runSummaryModel(input: {
  question: string;
  source: HelpSearchSource;
  context: string;
}) {
  const request = () => createAiStructuredResponse<SummaryAnswer>({
    task: aiTaskFor(input.source),
    requiredCapabilities: requiredCapabilitiesFor(input.source),
    instructions: SUMMARY_INSTRUCTIONS,
    userInput: `Pedido do usuário:\n${input.question.trim()}\n\nArtigo completo:\n${input.context}`,
    schemaName: "f10_help_article_summary",
    schema: SUMMARY_SCHEMA,
    maxOutputTokens: MAX_SUMMARY_OUTPUT_TOKENS,
  });

  try {
    return await request();
  } catch (cause) {
    if (!shouldRetry(cause)) throw cause;
    return request();
  }
}

export async function summarizeHelpArticle(input: {
  question: string;
  slug: string;
  source: HelpSearchSource;
}): Promise<HelpKnowledgeResult> {
  const row = await getPublicationBySlug(input.slug);
  if (!row) throw new Error("HELP_ARTICLE_NOT_FOUND");

  const { document, context } = buildArticleContext(row);
  if (!context) throw new Error("HELP_KNOWLEDGE_DOCUMENT_MISSING");

  const response = await runSummaryModel({
    question: input.question,
    source: input.source,
    context,
  });
  const answer = response.data.answer.trim().slice(0, MAX_SUMMARY_ANSWER_CHARS);
  if (!answer) throw new AiGatewayError("AI_EMPTY_RESPONSE", response.provider);

  return {
    resolution: "answered",
    resolved: true,
    answer,
    target: {
      contentId: document.contentId,
      slug: document.slug,
      title: document.title,
      targetType: "article",
      stepId: null,
      blockId: null,
      anchor: null,
    },
    searchEventId: null,
    retrievalQuery: input.question.trim(),
    sources: [
      {
        contentId: document.contentId,
        slug: document.slug,
        title: document.title,
        rank: 1,
        score: 1,
      },
    ],
    provider: response.provider as AiProviderCode,
    fallbackUsed: response.fallbackUsed,
    model: response.model,
    providerResponseId: response.responseId,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };
}
