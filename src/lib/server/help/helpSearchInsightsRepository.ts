import { desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpSearchEvents,
  helpSearchResults,
} from "$lib/server/db/helpSearchSchema";
import { getHelpKnowledgeInsights } from "$lib/server/help/helpKnowledgeTelemetryRepository";

export async function getHelpSearchInsights() {
  const db = getDatabase();

  const [
    summaryRows,
    topQueries,
    noResultQueries,
    clickedContents,
    escalatedQueries,
    knowledge,
  ] = await Promise.all([
    db
      .select({
        searches: sql<number>`count(*)::integer`,
        withoutResults: sql<number>`count(*) filter (where ${helpSearchEvents.resultCount} = 0)::integer`,
        selections: sql<number>`count(*) filter (where ${helpSearchEvents.selectedContentId} is not null)::integer`,
        aiAnswers: sql<number>`count(*) filter (where ${helpSearchEvents.aiAnswered} = true)::integer`,
        escalations: sql<number>`count(*) filter (where ${helpSearchEvents.escalated} = true)::integer`,
      })
      .from(helpSearchEvents),
    db
      .select({
        normalizedQuery: helpSearchEvents.normalizedQuery,
        sampleQuery: sql<string>`max(${helpSearchEvents.query})`,
        searches: sql<number>`count(*)::integer`,
        withoutResults: sql<number>`count(*) filter (where ${helpSearchEvents.resultCount} = 0)::integer`,
        lastSearchedAt: sql<Date>`max(${helpSearchEvents.createdAt})`,
      })
      .from(helpSearchEvents)
      .groupBy(helpSearchEvents.normalizedQuery)
      .orderBy(desc(sql`count(*)`))
      .limit(20),
    db
      .select({
        normalizedQuery: helpSearchEvents.normalizedQuery,
        sampleQuery: sql<string>`max(${helpSearchEvents.query})`,
        searches: sql<number>`count(*)::integer`,
        lastSearchedAt: sql<Date>`max(${helpSearchEvents.createdAt})`,
      })
      .from(helpSearchEvents)
      .where(eq(helpSearchEvents.resultCount, 0))
      .groupBy(helpSearchEvents.normalizedQuery)
      .orderBy(desc(sql`count(*)`))
      .limit(20),
    db
      .select({
        contentId: helpSearchResults.contentId,
        title: sql<string>`max(${helpSearchResults.titleSnapshot})`,
        impressions: sql<number>`count(*)::integer`,
        clicks: sql<number>`count(*) filter (where ${helpSearchResults.clickedAt} is not null)::integer`,
      })
      .from(helpSearchResults)
      .groupBy(helpSearchResults.contentId)
      .orderBy(desc(sql`count(*) filter (where ${helpSearchResults.clickedAt} is not null)`))
      .limit(20),
    db
      .select({
        id: helpSearchEvents.id,
        query: helpSearchEvents.query,
        normalizedQuery: helpSearchEvents.normalizedQuery,
        source: helpSearchEvents.source,
        resultCount: helpSearchEvents.resultCount,
        selectedContentId: helpSearchEvents.selectedContentId,
        ticketId: helpSearchEvents.ticketId,
        createdAt: helpSearchEvents.createdAt,
      })
      .from(helpSearchEvents)
      .where(eq(helpSearchEvents.escalated, true))
      .orderBy(desc(helpSearchEvents.createdAt))
      .limit(30),
    getHelpKnowledgeInsights(),
  ]);

  const summary = summaryRows[0] ?? {
    searches: 0,
    withoutResults: 0,
    selections: 0,
    aiAnswers: 0,
    escalations: 0,
  };

  return {
    summary: {
      searches: Number(summary.searches ?? 0),
      withoutResults: Number(summary.withoutResults ?? 0),
      selections: Number(summary.selections ?? 0),
      aiAnswers: Number(summary.aiAnswers ?? 0),
      escalations: Number(summary.escalations ?? 0),
    },
    topQueries: topQueries.map((row) => ({
      ...row,
      searches: Number(row.searches ?? 0),
      withoutResults: Number(row.withoutResults ?? 0),
    })),
    noResultQueries: noResultQueries.map((row) => ({
      ...row,
      searches: Number(row.searches ?? 0),
    })),
    clickedContents: clickedContents.map((row) => ({
      ...row,
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
    })),
    escalatedQueries,
    knowledge,
  };
}
