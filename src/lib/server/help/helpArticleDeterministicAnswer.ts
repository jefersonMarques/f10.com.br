import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import {
  parseHelpKnowledgeDocument,
  type HelpKnowledgeCompiledFragment,
} from "$lib/server/help/helpKnowledgeCompiler";
import {
  normalizeHelpSearchQuery,
} from "$lib/server/help/helpSearchRepository";
import type {
  HelpKnowledgeResult,
  HelpKnowledgeTarget,
} from "$lib/server/help/helpKnowledgeEngine";

type DeterministicArticleAnswerInput = {
  question: string;
  slug: string;
};

type BinaryIntent = "activate" | "deactivate";

const GREETING_PATTERN = /^(oi|ola|bom dia|boa tarde|boa noite|e ai|opa)[!. ]*$/i;

function normalize(value: string): string {
  return normalizeHelpSearchQuery(value)
    .replace(/\?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function binaryIntent(question: string): BinaryIntent | null {
  const value = normalize(question);
  if (!/\b(usuario|acesso|login)\b/.test(value)) return null;
  if (/\b(desativ\w*|inativ\w*|bloque\w*|desabilit\w*)\b/.test(value)) return "deactivate";
  if (/\b(ativ\w*|habilit\w*|liber\w*)\b/.test(value)) return "activate";
  return null;
}

function targetFor(
  contentId: string,
  slug: string,
  title: string,
  fragment: HelpKnowledgeCompiledFragment,
): HelpKnowledgeTarget {
  return {
    contentId,
    slug,
    title,
    targetType: fragment.targetType,
    stepId: fragment.stepId,
    blockId: fragment.blockId,
    anchor: fragment.anchor,
  };
}

function fragmentText(fragment: HelpKnowledgeCompiledFragment): string {
  return [fragment.publicText, fragment.assistantKnowledge, fragment.searchText]
    .filter(Boolean)
    .join("\n");
}

function binaryEvidenceScore(fragment: HelpKnowledgeCompiledFragment): number {
  const text = normalize(fragmentText(fragment));
  if (!/\busuario\b/.test(text) || !/\bativo\b/.test(text)) return 0;

  let score = fragment.targetType === "block" ? 30 : fragment.targetType === "step" ? 20 : 5;
  if (/\busuario ativo\b/.test(text)) score += 50;
  if (/\b(marc\w*|selecion\w*|check\w*)\b/.test(text)) score += 25;
  if (/\b(ativ\w*|habilit\w*|liber\w*|acesso|login)\b/.test(text)) score += 20;
  return score;
}

function findBinaryEvidence(
  fragments: HelpKnowledgeCompiledFragment[],
): HelpKnowledgeCompiledFragment | null {
  const [best] = fragments
    .map((fragment) => ({ fragment, score: binaryEvidenceScore(fragment) }))
    .filter((item) => item.score >= 75)
    .sort((left, right) => right.score - left.score);
  return best?.fragment ?? null;
}

function result(input: {
  answer: string;
  slug: string;
  contentId: string;
  title: string;
  target: HelpKnowledgeCompiledFragment | null;
  retrievalQuery: string;
}): HelpKnowledgeResult {
  const target = input.target
    ? targetFor(input.contentId, input.slug, input.title, input.target)
    : null;
  return {
    resolution: "answered",
    resolved: true,
    answer: input.answer,
    target,
    searchEventId: null,
    retrievalQuery: input.retrievalQuery,
    sources: target
      ? [{
          contentId: input.contentId,
          slug: input.slug,
          title: input.title,
          rank: 1,
          score: 100,
        }]
      : [],
    model: null,
    providerResponseId: null,
    inputTokens: null,
    outputTokens: null,
  };
}

export async function tryAnswerHelpArticleDeterministically(
  input: DeterministicArticleAnswerInput,
): Promise<HelpKnowledgeResult | null> {
  const question = input.question.trim();
  const normalizedQuestion = normalize(question);

  if (GREETING_PATTERN.test(normalizedQuestion)) {
    return result({
      answer: "Olá. Posso ajudar com dúvidas sobre este artigo. O que você quer fazer?",
      slug: input.slug,
      contentId: "",
      title: "",
      target: null,
      retrievalQuery: question,
    });
  }

  const intent = binaryIntent(question);
  if (!intent) return null;

  const [row] = await getDatabase()
    .select({
      entityId: helpPublications.entityId,
      snapshot: helpPublications.snapshot,
    })
    .from(helpPublications)
    .where(
      and(
        eq(helpPublications.entityType, "content"),
        sql`${helpPublications.snapshot}->'knowledge'->>'slug' = ${input.slug}`,
      ),
    )
    .limit(1);
  if (!row) return null;

  const document = parseHelpKnowledgeDocument(row.snapshot.knowledge);
  if (!document || document.contentId !== row.entityId) return null;

  const evidence = findBinaryEvidence(document.fragments);
  if (!evidence) return null;

  return result({
    answer:
      intent === "deactivate"
        ? "Para desativar ou bloquear o acesso do usuário, desmarque “Usuário Ativo”. O artigo usa esse mesmo controle para definir se o usuário está ativo."
        : "Para ativar ou liberar o acesso do usuário, marque “Usuário Ativo”.",
    slug: document.slug,
    contentId: document.contentId,
    title: document.title,
    target: evidence,
    retrievalQuery: question,
  });
}
