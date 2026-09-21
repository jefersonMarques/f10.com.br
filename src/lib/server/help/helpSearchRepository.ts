import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpSearchDocuments,
  helpSearchEvents,
  helpSearchResults,
} from "$lib/server/db/helpSearchSchema";

export type HelpSearchSource =
  | "public"
  | "operations"
  | "chat_ai"
  | "support_agent";

export type HelpSearchInput = {
  query: string;
  source: HelpSearchSource;
  actorUserId?: string | null;
  customerContactId?: string | null;
  limit?: number;
  includeAssistantKnowledge?: boolean;
  contentId?: string | null;
  categoryId?: string | null;
  relevanceMode?: "strict" | "broad";
};

export type PublishedHelpContext = {
  contentId: string;
  slug: string;
  title: string;
  summary: string;
  categoryText: string;
  publicText: string;
  assistantText: string;
  publishedAt: Date;
};

const SEARCH_STOP_WORDS = new Set([
  "a",
  "ao",
  "aos",
  "as",
  "como",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "eu",
  "faco",
  "fazer",
  "me",
  "na",
  "nas",
  "no",
  "nos",
  "o",
  "onde",
  "os",
  "ou",
  "para",
  "por",
  "porque",
  "pra",
  "qual",
  "quais",
  "que",
  "um",
  "uma",
  "assunto",
  "anterior",
  "resposta",
  "continuacao",
]);

const GENERIC_SEARCH_TERMS = new Set([
  "abrir",
  "acessar",
  "adicionar",
  "ajuda",
  "ajudar",
  "alterar",
  "botao",
  "cadastrar",
  "cadastro",
  "campo",
  "configurar",
  "configuracao",
  "criar",
  "editar",
  "excluir",
  "f10",
  "favor",
  "gostaria",
  "incluir",
  "menu",
  "opcao",
  "pode",
  "poderia",
  "preciso",
  "quero",
  "remover",
  "salvar",
  "sistema",
  "suporte",
  "tela",
]);

export function normalizeHelpSearchQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\be[\s-]*mail\b/g, "email")
    .replace(/\?/g, " ? ")
    .replace(/[^a-z0-9?\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function compactRepeatedVowels(value: string): string {
  return value.replace(/([aeiou])\1+/g, "$1");
}

function termVariants(rawTerm: string): string[] {
  const term = compactRepeatedVowels(rawTerm);
  const variants = new Set([term]);
  if (/^cri(?:o|a|e)$/.test(term)) variants.add("criar");
  return Array.from(variants);
}

function meaningfulSearchTerms(value: string): string[] {
  return Array.from(new Set(
    normalizeHelpSearchQuery(value)
      .replace(/\?/g, " ")
      .split(" ")
      .filter((term) => term.length >= 3 && !SEARCH_STOP_WORDS.has(term)),
  ));
}

function searchableHasTerm(words: string[], wordSet: Set<string>, rawTerm: string): boolean {
  return termVariants(rawTerm).some((term) => {
    if (wordSet.has(term)) return true;
    if (term.length > 4 && term.endsWith("s") && wordSet.has(term.slice(0, -1))) return true;
    if (term.length < 6) return false;
    const stem = term.slice(0, 6);
    return words.some((word) => word.length >= 6 && word.startsWith(stem));
  });
}

function relevantSearchResult(
  query: string,
  row: {
    title: string;
    summary: string;
    categoryText: string;
    searchAliases: string;
    publicText: string;
    assistantText: string;
  },
  mode: "strict" | "broad",
): boolean {
  const terms = meaningfulSearchTerms(query);
  if (terms.length <= 1) return true;

  const searchable = normalizeHelpSearchQuery([
    row.title,
    row.summary,
    row.categoryText,
    row.searchAliases,
    row.publicText,
    row.assistantText,
  ].join(" "));
  const words = searchable.split(" ").filter(Boolean);
  const wordSet = new Set(words);
  const matchedTerms = terms.filter((term) => searchableHasTerm(words, wordSet, term));

  if (matchedTerms.length >= 2) return true;
  if (mode === "strict") return false;
  return matchedTerms.some((term) => term.length >= 3 && !GENERIC_SEARCH_TERMS.has(term));
}

function searchQueryText(query: string): string {
  const terms = meaningfulSearchTerms(query).flatMap(termVariants);
  return terms.length > 0 ? Array.from(new Set(terms)).join(" OR ") : query;
}

export async function searchPublishedHelp(input: HelpSearchInput) {
  const db = getDatabase();
  const query = input.query.trim().slice(0, 500);
  const normalizedQuery = normalizeHelpSearchQuery(query);
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20);
  const candidateLimit = Math.min(Math.max(limit * 3, limit), 50);
  const includeAssistantKnowledge = input.includeAssistantKnowledge ?? true;
  const relevanceMode = input.relevanceMode ?? "strict";

  if (!normalizedQuery) {
    return { searchEventId: null, results: [] };
  }

  const searchableText = includeAssistantKnowledge
    ? sql`concat_ws(' ', ${helpSearchDocuments.title}, ${helpSearchDocuments.summary}, ${helpSearchDocuments.categoryText}, ${helpSearchDocuments.publicText}, ${helpSearchDocuments.searchAliases}, ${helpSearchDocuments.assistantText})`
    : sql`concat_ws(' ', ${helpSearchDocuments.title}, ${helpSearchDocuments.summary}, ${helpSearchDocuments.categoryText}, ${helpSearchDocuments.publicText}, ${helpSearchDocuments.searchAliases})`;
  const searchVector = sql`to_tsvector('portuguese', ${searchableText})`;
  const queryText = searchQueryText(query);
  const searchQuery = sql`websearch_to_tsquery('portuguese', ${queryText})`;
  const score = sql<number>`(
    ts_rank_cd(${searchVector}, ${searchQuery}) * 2
    + greatest(
        similarity(${helpSearchDocuments.title}, ${query}),
        similarity(${helpSearchDocuments.summary}, ${query}),
        similarity(${helpSearchDocuments.categoryText}, ${query}),
        similarity(${helpSearchDocuments.searchAliases}, ${query})
      )
  )`;

  const searchPredicate = sql`(
    ${searchVector} @@ ${searchQuery}
    OR ${helpSearchDocuments.title} % ${query}
    OR ${helpSearchDocuments.summary} % ${query}
    OR ${helpSearchDocuments.categoryText} % ${query}
    OR ${helpSearchDocuments.searchAliases} % ${query}
  )`;
  const contentPredicate = input.contentId
    ? eq(helpSearchDocuments.contentId, input.contentId)
    : undefined;
  const categoryPredicate = input.categoryId
    ? sql`EXISTS (
        SELECT 1
        FROM help_content_categories hcc
        WHERE hcc.content_id = ${helpSearchDocuments.contentId}
          AND hcc.category_id = ${input.categoryId}
      )`
    : undefined;

  const candidates = await db
    .select({
      contentId: helpSearchDocuments.contentId,
      slug: helpSearchDocuments.slug,
      title: helpSearchDocuments.title,
      summary: helpSearchDocuments.summary,
      categoryText: helpSearchDocuments.categoryText,
      searchAliases: helpSearchDocuments.searchAliases,
      publicText: helpSearchDocuments.publicText,
      assistantText: helpSearchDocuments.assistantText,
      publishedAt: helpSearchDocuments.publishedAt,
      score,
    })
    .from(helpSearchDocuments)
    .where(and(searchPredicate, contentPredicate, categoryPredicate))
    .orderBy(desc(score))
    .limit(candidateLimit);

  const rows = candidates
    .filter((row) => relevantSearchResult(query, row, relevanceMode))
    .slice(0, limit);

  const [searchEvent] = await db
    .insert(helpSearchEvents)
    .values({
      actorUserId: input.actorUserId ?? null,
      customerContactId: input.customerContactId ?? null,
      source: input.source,
      query,
      normalizedQuery,
      resultCount: rows.length,
    })
    .returning({ id: helpSearchEvents.id });

  if (!searchEvent) throw new Error("SEARCH_EVENT_NOT_CREATED");

  if (rows.length > 0) {
    await db.insert(helpSearchResults).values(
      rows.map((row, index) => ({
        searchEventId: searchEvent.id,
        contentId: row.contentId,
        rank: index + 1,
        score: Number(row.score ?? 0),
        titleSnapshot: row.title,
      })),
    );
  }

  return {
    searchEventId: searchEvent.id,
    results: rows.map((row, index) => ({
      contentId: row.contentId,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      categoryText: row.categoryText,
      publishedAt: row.publishedAt,
      score: Number(row.score ?? 0),
      rank: index + 1,
    })),
  };
}

export async function getPublishedHelpContext(
  contentIds: string[],
): Promise<PublishedHelpContext[]> {
  const orderedIds = Array.from(new Set(contentIds));
  if (orderedIds.length === 0) return [];

  const rows = await getDatabase()
    .select({
      contentId: helpSearchDocuments.contentId,
      slug: helpSearchDocuments.slug,
      title: helpSearchDocuments.title,
      summary: helpSearchDocuments.summary,
      categoryText: helpSearchDocuments.categoryText,
      publicText: helpSearchDocuments.publicText,
      assistantText: helpSearchDocuments.assistantText,
      publishedAt: helpSearchDocuments.publishedAt,
    })
    .from(helpSearchDocuments)
    .where(inArray(helpSearchDocuments.contentId, orderedIds));

  const byId = new Map(rows.map((row) => [row.contentId, row]));
  return orderedIds.flatMap((contentId) => {
    const row = byId.get(contentId);
    return row ? [row] : [];
  });
}

export async function recordHelpSearchSelection(
  searchEventId: string,
  contentId: string,
): Promise<void> {
  const db = getDatabase();
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(helpSearchEvents)
      .set({ selectedContentId: contentId, updatedAt: now })
      .where(eq(helpSearchEvents.id, searchEventId));

    await tx
      .update(helpSearchResults)
      .set({ clickedAt: now })
      .where(
        and(
          eq(helpSearchResults.searchEventId, searchEventId),
          eq(helpSearchResults.contentId, contentId),
        ),
      );
  });
}

export async function markHelpSearchOutcome(
  searchEventId: string,
  outcome: {
    aiAnswered?: boolean;
    escalated?: boolean;
    ticketId?: string | null;
  },
): Promise<void> {
  await getDatabase()
    .update(helpSearchEvents)
    .set({
      ...(outcome.aiAnswered === undefined ? {} : { aiAnswered: outcome.aiAnswered }),
      ...(outcome.escalated === undefined ? {} : { escalated: outcome.escalated }),
      ...(outcome.ticketId === undefined ? {} : { ticketId: outcome.ticketId }),
      updatedAt: new Date(),
    })
    .where(eq(helpSearchEvents.id, searchEventId));
}
