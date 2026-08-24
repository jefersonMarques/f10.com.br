import { desc, isNotNull, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpAiUsageRuns } from "$lib/server/db/helpAiUsageSchema";
import { helpKnowledgeRuns } from "$lib/server/db/helpKnowledgeSchema";

export type HelpAiUsageStatus = "success" | "failed";

export type RecordHelpAiUsageInput = {
  actorUserId?: string | null;
  operation: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  audioSeconds?: number | null;
  latencyMs: number;
  status?: HelpAiUsageStatus;
  failureCode?: string | null;
  metadata?: Record<string, unknown>;
};

type TextPrice = {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
};

const TEXT_PRICES: Array<{ matches: (model: string) => boolean; price: TextPrice }> = [
  {
    matches: (model) => model === "gpt-5-mini" || model.startsWith("gpt-5-mini-"),
    price: { inputPerMillionUsd: 0.25, outputPerMillionUsd: 2 },
  },
  {
    matches: (model) => model === "gpt-5" || model.startsWith("gpt-5-"),
    price: { inputPerMillionUsd: 1.25, outputPerMillionUsd: 10 },
  },
];

const WHISPER_USD_PER_MINUTE = 0.006;

export function estimateHelpTextCostUsdMicros(
  model: string,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number | null {
  const price = TEXT_PRICES.find((item) => item.matches(model.trim().toLowerCase()))?.price;
  if (!price) return null;
  const input = Math.max(0, Number(inputTokens ?? 0));
  const output = Math.max(0, Number(outputTokens ?? 0));
  return Math.round(
    input * price.inputPerMillionUsd + output * price.outputPerMillionUsd,
  );
}

export function estimateHelpAudioCostUsdMicros(
  model: string,
  audioSeconds: number | null | undefined,
): number | null {
  if (model.trim().toLowerCase() !== "whisper-1") return null;
  const seconds = Math.max(0, Number(audioSeconds ?? 0));
  return Math.round((seconds / 60) * WHISPER_USD_PER_MINUTE * 1_000_000);
}

function estimateUsageCostUsdMicros(input: RecordHelpAiUsageInput): number {
  const audioCost = estimateHelpAudioCostUsdMicros(input.model, input.audioSeconds);
  if (audioCost !== null) return audioCost;
  return estimateHelpTextCostUsdMicros(input.model, input.inputTokens, input.outputTokens) ?? 0;
}

export async function recordHelpAiUsage(input: RecordHelpAiUsageInput): Promise<void> {
  await getDatabase().insert(helpAiUsageRuns).values({
    actorUserId: input.actorUserId ?? null,
    operation: input.operation.trim().slice(0, 120),
    provider: "openai",
    model: input.model.trim().slice(0, 120),
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    audioSeconds:
      input.audioSeconds === null || input.audioSeconds === undefined
        ? null
        : Math.max(0, Math.round(input.audioSeconds)),
    estimatedCostUsdMicros: estimateUsageCostUsdMicros(input),
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    status: input.status ?? "success",
    failureCode: input.failureCode?.trim().slice(0, 180) || null,
    metadata: input.metadata ?? {},
  });
}

export async function getHelpAiUsageInsights() {
  const db = getDatabase();
  const [usageSummaryRows, usageByOperationRows, recentUsage, knowledgeByModelRows] = await Promise.all([
    db
      .select({
        runs: sql<number>`count(*)::integer`,
        failed: sql<number>`count(*) filter (where ${helpAiUsageRuns.status} = 'failed')::integer`,
        inputTokens: sql<number>`coalesce(sum(${helpAiUsageRuns.inputTokens}), 0)::integer`,
        outputTokens: sql<number>`coalesce(sum(${helpAiUsageRuns.outputTokens}), 0)::integer`,
        audioSeconds: sql<number>`coalesce(sum(${helpAiUsageRuns.audioSeconds}), 0)::integer`,
        costUsdMicros: sql<number>`coalesce(sum(${helpAiUsageRuns.estimatedCostUsdMicros}), 0)::bigint`,
      })
      .from(helpAiUsageRuns),
    db
      .select({
        operation: helpAiUsageRuns.operation,
        model: helpAiUsageRuns.model,
        runs: sql<number>`count(*)::integer`,
        inputTokens: sql<number>`coalesce(sum(${helpAiUsageRuns.inputTokens}), 0)::integer`,
        outputTokens: sql<number>`coalesce(sum(${helpAiUsageRuns.outputTokens}), 0)::integer`,
        audioSeconds: sql<number>`coalesce(sum(${helpAiUsageRuns.audioSeconds}), 0)::integer`,
        costUsdMicros: sql<number>`coalesce(sum(${helpAiUsageRuns.estimatedCostUsdMicros}), 0)::bigint`,
      })
      .from(helpAiUsageRuns)
      .groupBy(helpAiUsageRuns.operation, helpAiUsageRuns.model)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        id: helpAiUsageRuns.id,
        operation: helpAiUsageRuns.operation,
        model: helpAiUsageRuns.model,
        inputTokens: helpAiUsageRuns.inputTokens,
        outputTokens: helpAiUsageRuns.outputTokens,
        audioSeconds: helpAiUsageRuns.audioSeconds,
        costUsdMicros: helpAiUsageRuns.estimatedCostUsdMicros,
        latencyMs: helpAiUsageRuns.latencyMs,
        status: helpAiUsageRuns.status,
        failureCode: helpAiUsageRuns.failureCode,
        createdAt: helpAiUsageRuns.createdAt,
      })
      .from(helpAiUsageRuns)
      .orderBy(desc(helpAiUsageRuns.createdAt))
      .limit(30),
    db
      .select({
        model: helpKnowledgeRuns.model,
        runs: sql<number>`count(*)::integer`,
        failed: sql<number>`count(*) filter (where ${helpKnowledgeRuns.failureCode} is not null)::integer`,
        inputTokens: sql<number>`coalesce(sum(${helpKnowledgeRuns.inputTokens}), 0)::integer`,
        outputTokens: sql<number>`coalesce(sum(${helpKnowledgeRuns.outputTokens}), 0)::integer`,
      })
      .from(helpKnowledgeRuns)
      .where(isNotNull(helpKnowledgeRuns.model))
      .groupBy(helpKnowledgeRuns.model),
  ]);

  const usageSummary = usageSummaryRows[0] ?? {
    runs: 0,
    failed: 0,
    inputTokens: 0,
    outputTokens: 0,
    audioSeconds: 0,
    costUsdMicros: 0,
  };

  let assistantRuns = 0;
  let assistantFailedRuns = 0;
  let assistantInputTokens = 0;
  let assistantOutputTokens = 0;
  let assistantCostUsdMicros = 0;
  let assistantCostUnknownRuns = 0;
  for (const row of knowledgeByModelRows) {
    const runs = Number(row.runs ?? 0);
    const inputTokens = Number(row.inputTokens ?? 0);
    const outputTokens = Number(row.outputTokens ?? 0);
    assistantRuns += runs;
    assistantFailedRuns += Number(row.failed ?? 0);
    assistantInputTokens += inputTokens;
    assistantOutputTokens += outputTokens;
    const cost = row.model
      ? estimateHelpTextCostUsdMicros(row.model, inputTokens, outputTokens)
      : null;
    if (cost === null) assistantCostUnknownRuns += runs;
    else assistantCostUsdMicros += cost;
  }

  const automationRuns = Number(usageSummary.runs ?? 0);
  const automationInputTokens = Number(usageSummary.inputTokens ?? 0);
  const automationOutputTokens = Number(usageSummary.outputTokens ?? 0);
  const automationCostUsdMicros = Number(usageSummary.costUsdMicros ?? 0);

  return {
    summary: {
      runs: assistantRuns + automationRuns,
      assistantRuns,
      automationRuns,
      failed: assistantFailedRuns + Number(usageSummary.failed ?? 0),
      inputTokens: assistantInputTokens + automationInputTokens,
      outputTokens: assistantOutputTokens + automationOutputTokens,
      audioSeconds: Number(usageSummary.audioSeconds ?? 0),
      estimatedCostUsdMicros: assistantCostUsdMicros + automationCostUsdMicros,
      costUnknownRuns: assistantCostUnknownRuns,
    },
    byOperation: [
      {
        operation: "help_assistant",
        model: "modelos do assistente",
        runs: assistantRuns,
        inputTokens: assistantInputTokens,
        outputTokens: assistantOutputTokens,
        audioSeconds: 0,
        costUsdMicros: assistantCostUsdMicros,
      },
      ...usageByOperationRows.map((row) => ({
        operation: row.operation,
        model: row.model,
        runs: Number(row.runs ?? 0),
        inputTokens: Number(row.inputTokens ?? 0),
        outputTokens: Number(row.outputTokens ?? 0),
        audioSeconds: Number(row.audioSeconds ?? 0),
        costUsdMicros: Number(row.costUsdMicros ?? 0),
      })),
    ],
    recent: recentUsage.map((row) => ({
      ...row,
      costUsdMicros: Number(row.costUsdMicros ?? 0),
    })),
  };
}
