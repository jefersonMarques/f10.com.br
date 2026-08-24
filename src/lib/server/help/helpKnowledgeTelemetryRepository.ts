import { desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpKnowledgeRuns,
  type HelpKnowledgeSourceSnapshot,
} from "$lib/server/db/helpKnowledgeSchema";
import { normalizeHelpSearchQuery, type HelpSearchSource } from "$lib/server/help/helpSearchRepository";

export type HelpKnowledgeTelemetryResolution =
  | "answered"
  | "navigate"
  | "found_elsewhere"
  | "not_found"
  | "failed";

export type RecordHelpKnowledgeRunInput = {
  source: HelpSearchSource;
  scope: "global" | "article";
  actorUserId?: string | null;
  customerContactId?: string | null;
  searchEventId?: string | null;
  question: string;
  contextSlug?: string;
  resolution: HelpKnowledgeTelemetryResolution;
  target?: {
    contentId: string;
    slug: string;
    targetType: string;
  } | null;
  sources?: HelpKnowledgeSourceSnapshot[];
  model?: string | null;
  providerResponseId?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  latencyMs: number;
  failureCode?: string | null;
};

export async function recordHelpKnowledgeRun(
  input: RecordHelpKnowledgeRunInput,
): Promise<void> {
  const question = input.question.trim().slice(0, 600);
  if (!question) return;

  await getDatabase().insert(helpKnowledgeRuns).values({
    source: input.source,
    scope: input.scope,
    actorUserId: input.actorUserId ?? null,
    customerContactId: input.customerContactId ?? null,
    searchEventId: input.searchEventId ?? null,
    question,
    normalizedQuery: normalizeHelpSearchQuery(question),
    contextSlug: (input.contextSlug ?? "").trim().slice(0, 160),
    resolution: input.resolution,
    targetContentId: input.target?.contentId ?? null,
    targetSlug: input.target?.slug ?? "",
    targetType: input.target?.targetType ?? "",
    sourceSnapshot: input.sources ?? [],
    model: input.model ?? null,
    providerResponseId: input.providerResponseId ?? null,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    failureCode: input.failureCode ?? null,
  });
}

export async function getHelpKnowledgeInsights() {
  const db = getDatabase();

  const [summaryRows, gapRows, elsewhereRows, recentRuns] = await Promise.all([
    db
      .select({
        runs: sql<number>`count(*)::integer`,
        answered: sql<number>`count(*) filter (where ${helpKnowledgeRuns.resolution} in ('answered', 'navigate'))::integer`,
        navigations: sql<number>`count(*) filter (where ${helpKnowledgeRuns.resolution} = 'navigate')::integer`,
        foundElsewhere: sql<number>`count(*) filter (where ${helpKnowledgeRuns.resolution} = 'found_elsewhere')::integer`,
        notFound: sql<number>`count(*) filter (where ${helpKnowledgeRuns.resolution} = 'not_found')::integer`,
        failed: sql<number>`count(*) filter (where ${helpKnowledgeRuns.resolution} = 'failed')::integer`,
        averageLatencyMs: sql<number>`coalesce(avg(${helpKnowledgeRuns.latencyMs}), 0)::integer`,
        inputTokens: sql<number>`coalesce(sum(${helpKnowledgeRuns.inputTokens}), 0)::integer`,
        outputTokens: sql<number>`coalesce(sum(${helpKnowledgeRuns.outputTokens}), 0)::integer`,
      })
      .from(helpKnowledgeRuns),
    db
      .select({
        normalizedQuery: helpKnowledgeRuns.normalizedQuery,
        sampleQuestion: sql<string>`max(${helpKnowledgeRuns.question})`,
        attempts: sql<number>`count(*)::integer`,
        articleAttempts: sql<number>`count(*) filter (where ${helpKnowledgeRuns.scope} = 'article')::integer`,
        lastAskedAt: sql<Date>`max(${helpKnowledgeRuns.createdAt})`,
      })
      .from(helpKnowledgeRuns)
      .where(eq(helpKnowledgeRuns.resolution, "not_found"))
      .groupBy(helpKnowledgeRuns.normalizedQuery)
      .orderBy(desc(sql`count(*)`), desc(sql`max(${helpKnowledgeRuns.createdAt})`))
      .limit(30),
    db
      .select({
        contextSlug: helpKnowledgeRuns.contextSlug,
        targetContentId: helpKnowledgeRuns.targetContentId,
        targetSlug: helpKnowledgeRuns.targetSlug,
        sampleQuestion: sql<string>`max(${helpKnowledgeRuns.question})`,
        attempts: sql<number>`count(*)::integer`,
        lastAskedAt: sql<Date>`max(${helpKnowledgeRuns.createdAt})`,
      })
      .from(helpKnowledgeRuns)
      .where(eq(helpKnowledgeRuns.resolution, "found_elsewhere"))
      .groupBy(
        helpKnowledgeRuns.contextSlug,
        helpKnowledgeRuns.targetContentId,
        helpKnowledgeRuns.targetSlug,
      )
      .orderBy(desc(sql`count(*)`), desc(sql`max(${helpKnowledgeRuns.createdAt})`))
      .limit(20),
    db
      .select({
        id: helpKnowledgeRuns.id,
        source: helpKnowledgeRuns.source,
        scope: helpKnowledgeRuns.scope,
        question: helpKnowledgeRuns.question,
        contextSlug: helpKnowledgeRuns.contextSlug,
        resolution: helpKnowledgeRuns.resolution,
        targetContentId: helpKnowledgeRuns.targetContentId,
        targetSlug: helpKnowledgeRuns.targetSlug,
        targetType: helpKnowledgeRuns.targetType,
        model: helpKnowledgeRuns.model,
        inputTokens: helpKnowledgeRuns.inputTokens,
        outputTokens: helpKnowledgeRuns.outputTokens,
        latencyMs: helpKnowledgeRuns.latencyMs,
        failureCode: helpKnowledgeRuns.failureCode,
        createdAt: helpKnowledgeRuns.createdAt,
      })
      .from(helpKnowledgeRuns)
      .orderBy(desc(helpKnowledgeRuns.createdAt))
      .limit(30),
  ]);

  const summary = summaryRows[0] ?? {
    runs: 0,
    answered: 0,
    navigations: 0,
    foundElsewhere: 0,
    notFound: 0,
    failed: 0,
    averageLatencyMs: 0,
    inputTokens: 0,
    outputTokens: 0,
  };

  return {
    summary: Object.fromEntries(
      Object.entries(summary).map(([key, value]) => [key, Number(value ?? 0)]),
    ) as {
      runs: number;
      answered: number;
      navigations: number;
      foundElsewhere: number;
      notFound: number;
      failed: number;
      averageLatencyMs: number;
      inputTokens: number;
      outputTokens: number;
    },
    gaps: gapRows.map((row) => ({
      ...row,
      attempts: Number(row.attempts ?? 0),
      articleAttempts: Number(row.articleAttempts ?? 0),
    })),
    foundElsewhere: elsewhereRows.map((row) => ({
      ...row,
      attempts: Number(row.attempts ?? 0),
    })),
    recentRuns,
  };
}
