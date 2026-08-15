import { and, desc, eq, sql } from "drizzle-orm";
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
};

export function normalizeHelpSearchQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 500);
}

export async function searchPublishedHelp(input: HelpSearchInput) {
  const db = getDatabase();
  const query = input.query.trim().slice(0, 500);
  const normalizedQuery = normalizeHelpSearchQuery(query);
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20);
  const includeAiKnowledge = input.source !== "public";

  if (!normalizedQuery) {
    return { searchEventId: null, results: [] };
  }

  const searchableText = includeAiKnowledge
    ? sql`concat_ws(' ', ${helpSearchDocuments.title}, ${helpSearchDocuments.summary}, ${helpSearchDocuments.publicText}, ${helpSearchDocuments.aiText})`
    : sql`concat_ws(' ', ${helpSearchDocuments.title}, ${helpSearchDocuments.summary}, ${helpSearchDocuments.publicText})`;
  const searchVector = sql`to_tsvector('portuguese', ${searchableText})`;
  const searchQuery = sql`websearch_to_tsquery('portuguese', ${query})`;
  const score = sql<number>`(
    ts_rank_cd(${searchVector}, ${searchQuery}) * 2
    + greatest(
        similarity(${helpSearchDocuments.title}, ${query}),
        similarity(${helpSearchDocuments.summary}, ${query})
      )
  )`;

  const rows = await db
    .select({
      contentId: helpSearchDocuments.contentId,
      slug: helpSearchDocuments.slug,
      title: helpSearchDocuments.title,
      summary: helpSearchDocuments.summary,
      category: helpSearchDocuments.category,
      publishedAt: helpSearchDocuments.publishedAt,
      score,
    })
    .from(helpSearchDocuments)
    .where(
      sql`${searchVector} @@ ${searchQuery}
        OR ${helpSearchDocuments.title} % ${query}
        OR ${helpSearchDocuments.summary} % ${query}`,
    )
    .orderBy(desc(score))
    .limit(limit);

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
      ...row,
      score: Number(row.score ?? 0),
      rank: index + 1,
    })),
  };
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
  const db = getDatabase();

  await db
    .update(helpSearchEvents)
    .set({
      ...(outcome.aiAnswered === undefined
        ? {}
        : { aiAnswered: outcome.aiAnswered }),
      ...(outcome.escalated === undefined
        ? {}
        : { escalated: outcome.escalated }),
      ...(outcome.ticketId === undefined ? {} : { ticketId: outcome.ticketId }),
      updatedAt: new Date(),
    })
    .where(eq(helpSearchEvents.id, searchEventId));
}
