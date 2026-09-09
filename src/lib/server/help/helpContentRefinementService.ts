import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { createAiStructuredResponse } from "$lib/server/ai/aiGateway";
import { getDatabase } from "$lib/server/db";
import {
  helpAssets,
  helpContentFeaturedVideos,
} from "$lib/server/db/structuredHelpSchema";
import { recordHelpAiUsage } from "$lib/server/help/helpAiUsageRepository";
import {
  addHelpGeneratedReviewCandidates,
  listHelpScreenshotReviewGroups,
} from "$lib/server/help/helpScreenshotReviewRepository";
import {
  getStructuredHelpContent,
  replaceStructuredHelpStepWithParts,
  type StructuredHelpStepSplitPart,
} from "$lib/server/help/structuredHelpRepository";
import {
  generateHelpVideoFrameCandidates,
  type ScreenshotCaptureMode,
} from "$lib/server/help/helpVideoImportAutomationV4";
import { getAssetObject } from "$lib/server/storage/assetStorage";

type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

type SplitAiResponse = {
  shouldSplit: boolean;
  parts: StructuredHelpStepSplitPart[];
};

export type HelpStepSplitSuggestion = SplitAiResponse & {
  sourceSignature: string;
};

export type HelpScreenshotGenerationMode = "auto" | "before" | "after";

function normalizeTimeline(value: unknown): TranscriptSegment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const start = Number(row.start);
    const end = Number(row.end);
    const text = typeof row.text === "string" ? row.text.trim() : "";
    return Number.isFinite(start) && Number.isFinite(end) && end > start && text
      ? [{ start: Math.max(0, start), end, text: text.slice(0, 1_000) }]
      : [];
  });
}

function stepSignature(
  step: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>["steps"][number],
): string {
  const source = {
    id: step.id,
    title: step.title,
    description: step.description,
    assistantKnowledge: step.assistantKnowledge,
    updatedAt: step.updatedAt,
    blocks: step.blocks.map((block) => ({
      id: block.id,
      blockType: block.blockType,
      textContent: block.textContent,
      linkUrl: block.linkUrl,
      linkLabel: block.linkLabel,
      noticeVariant: block.noticeVariant,
      assetId: block.assetId,
      updatedAt: block.updatedAt,
    })),
  };
  return createHash("sha256").update(JSON.stringify(source)).digest("hex");
}

function blockSource(
  step: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>["steps"][number],
): string {
  return step.blocks
    .map((block) => {
      if (block.blockType === "text") return `Texto: ${block.textContent}`;
      if (block.blockType === "notice") {
        return `Aviso (${block.noticeVariant || "info"}): ${block.textContent}`;
      }
      if (block.blockType === "link") {
        return `Link: ${block.linkLabel || ""} ${block.linkUrl || ""}`;
      }
      if (block.blockType === "image") {
        return `Imagem: ${block.asset?.altText || block.asset?.assistantDescription || "screenshot"}`;
      }
      if (block.blockType === "file") {
        return `Arquivo: ${block.linkLabel || block.asset?.originalName || "arquivo"}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function splitSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["shouldSplit", "parts"],
    properties: {
      shouldSplit: { type: "boolean" },
      parts: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "description", "instruction"],
          properties: {
            title: { type: "string", minLength: 2, maxLength: 180 },
            description: { type: "string", maxLength: 2_000 },
            instruction: { type: "string", minLength: 1, maxLength: 50_000 },
          },
        },
      },
    },
  };
}

export async function suggestHelpStepSplit(
  actorUserId: string,
  contentId: string,
  stepId: string,
): Promise<HelpStepSplitSuggestion> {
  const content = await getStructuredHelpContent(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");
  const index = content.steps.findIndex((step) => step.id === stepId);
  const step = content.steps[index];
  if (!step) throw new Error("STEP_NOT_FOUND");

  const startedAt = Date.now();
  const response = await createAiStructuredResponse<SplitAiResponse>({
    task: "content_edit",
    requiredCapabilities: ["content.draft"],
    instructions: [
      "Você refina etapas de artigos operacionais da Base de Conhecimento F10.",
      "Use somente o conteúdo fornecido. Não invente telas, campos, regras ou ações.",
      "Quebre a etapa somente quando existirem duas ou mais ações ou estados visuais que ficariam mais claros como etapas independentes.",
      "Cada parte deve ser curta, executável e compreensível isoladamente.",
      "Preserve obrigatoriedades, condições, exceções, avisos e sequência.",
      "Use Markdown seguro apenas em instruction: **negrito**, *itálico*, `código`, listas.",
      "Não duplique informação entre as partes.",
      "Se a etapa já estiver objetiva, retorne shouldSplit=false e uma única parte equivalente.",
    ].join("\n"),
    userInput: [
      `ARTIGO: ${content.title}`,
      `ETAPA ANTERIOR: ${content.steps[index - 1]?.title || "nenhuma"}`,
      `ETAPA ATUAL: ${step.title}`,
      step.description ? `DESCRIÇÃO: ${step.description}` : "",
      blockSource(step),
      `ETAPA SEGUINTE: ${content.steps[index + 1]?.title || "nenhuma"}`,
    ].filter(Boolean).join("\n\n"),
    schemaName: "f10_help_step_split",
    schema: splitSchema(),
    maxOutputTokens: 6_000,
    timeoutMs: 120_000,
  });

  await recordHelpAiUsage({
    actorUserId,
    operation: "content_step_split",
    provider: response.provider,
    model: response.model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    latencyMs: Date.now() - startedAt,
    metadata: { contentId, stepId, suggestedParts: response.data.parts.length },
  }).catch(() => undefined);

  const parts = response.data.parts
    .map((part) => ({
      title: part.title.trim().slice(0, 180),
      description: part.description.trim().slice(0, 2_000),
      instruction: part.instruction.trim().slice(0, 50_000),
    }))
    .filter((part) => part.title.length >= 2 && part.instruction.length > 0)
    .slice(0, 8);

  return {
    shouldSplit: Boolean(response.data.shouldSplit && parts.length >= 2),
    parts,
    sourceSignature: stepSignature(step),
  };
}

export async function applyHelpStepSplit(input: {
  actorUserId: string;
  contentId: string;
  stepId: string;
  sourceSignature: string;
  parts: StructuredHelpStepSplitPart[];
}) {
  const content = await getStructuredHelpContent(input.contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  const step = content.steps.find((item) => item.id === input.stepId);
  if (!step) throw new Error("STEP_NOT_FOUND");
  if (stepSignature(step) !== input.sourceSignature) {
    throw new Error("STEP_SPLIT_SOURCE_CHANGED");
  }
  await replaceStructuredHelpStepWithParts(
    input.actorUserId,
    input.contentId,
    input.stepId,
    input.parts,
  );
  return getStructuredHelpContent(input.contentId);
}

async function featuredVideoSource(contentId: string) {
  const [row] = await getDatabase()
    .select({
      storageKey: helpAssets.storageKey,
      metadata: helpAssets.metadata,
    })
    .from(helpContentFeaturedVideos)
    .innerJoin(helpAssets, eq(helpAssets.id, helpContentFeaturedVideos.assetId))
    .where(eq(helpContentFeaturedVideos.contentId, contentId))
    .limit(1);
  if (!row?.storageKey) throw new Error("HELP_VIDEO_LOCAL_COPY_REQUIRED");
  const timeline = normalizeTimeline(row.metadata?.transcriptTimeline);
  if (timeline.length === 0) throw new Error("HELP_VIDEO_TIMELINE_REQUIRED");
  return { storageKey: row.storageKey, timeline };
}

function normalizedWords(value: string): Set<string> {
  const stop = new Set([
    "para", "com", "uma", "que", "por", "dos", "das", "de", "do", "da", "em",
    "no", "na", "nos", "nas", "ao", "aos", "e", "ou", "o", "a", "os", "as",
  ]);
  return new Set(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3 && !stop.has(word)),
  );
}

function timelineExcerpt(
  timeline: TranscriptSegment[],
  sourceText: string,
  baseTime: number | null,
): TranscriptSegment[] {
  if (baseTime !== null) {
    const nearby = timeline.filter(
      (segment) => segment.end >= baseTime - 50 && segment.start <= baseTime + 50,
    );
    if (nearby.length > 0) return nearby.slice(0, 80);
  }

  const words = normalizedWords(sourceText);
  let bestIndex = 0;
  let bestScore = -1;
  for (const [index, segment] of timeline.entries()) {
    const segmentWords = normalizedWords(segment.text);
    let score = 0;
    for (const word of words) if (segmentWords.has(word)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return timeline.slice(Math.max(0, bestIndex - 15), bestIndex + 16);
}

function screenshotWindowSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["startSeconds", "endSeconds", "capture"],
    properties: {
      startSeconds: { type: "number", minimum: 0 },
      endSeconds: { type: "number", minimum: 0 },
      capture: { type: "string", enum: ["before", "after"] },
    },
  };
}

async function automaticScreenshotWindow(input: {
  actorUserId: string;
  contentId: string;
  stepId: string;
  sourceText: string;
  timeline: TranscriptSegment[];
  baseTime: number | null;
}): Promise<{ startSeconds: number; endSeconds: number; capture: ScreenshotCaptureMode }> {
  const excerpt = timelineExcerpt(input.timeline, input.sourceText, input.baseTime);
  const startedAt = Date.now();
  const response = await createAiStructuredResponse<{
    startSeconds: number;
    endSeconds: number;
    capture: ScreenshotCaptureMode;
  }>({
    task: "content_edit",
    requiredCapabilities: ["content.draft"],
    instructions: [
      "Escolha uma janela curta do vídeo para gerar novos screenshots desta etapa.",
      "Use somente a timeline fornecida.",
      "A janela deve ter entre 4 e 10 segundos, nunca mais de 12.",
      "Use capture=before para mostrar onde clicar e capture=after para mostrar o estado após a ação.",
      "Prefira um intervalo diferente do screenshot atual quando houver uma referência de tempo.",
    ].join("\n"),
    userInput: [
      `ETAPA: ${input.sourceText}`,
      input.baseTime !== null ? `SCREENSHOT ATUAL PRÓXIMO DE: ${input.baseTime.toFixed(2)}s` : "",
      "TIMELINE:",
      ...excerpt.map((segment) =>
        `[${segment.start.toFixed(2)}-${segment.end.toFixed(2)}] ${segment.text}`
      ),
    ].filter(Boolean).join("\n"),
    schemaName: "f10_help_screenshot_window",
    schema: screenshotWindowSchema(),
    maxOutputTokens: 800,
    timeoutMs: 60_000,
  });

  await recordHelpAiUsage({
    actorUserId: input.actorUserId,
    operation: "content_screenshot_window",
    provider: response.provider,
    model: response.model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    latencyMs: Date.now() - startedAt,
    metadata: { contentId: input.contentId, stepId: input.stepId },
  }).catch(() => undefined);

  return response.data;
}

export async function generateAdditionalHelpScreenshotCandidates(input: {
  actorUserId: string;
  contentId: string;
  blockId: string;
  mode: HelpScreenshotGenerationMode;
}) {
  const content = await getStructuredHelpContent(input.contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

  const step = content.steps.find((item) =>
    item.blocks.some((block) => block.id === input.blockId && block.blockType === "image")
  );
  if (!step) throw new Error("IMAGE_BLOCK_NOT_FOUND");

  const { storageKey, timeline } = await featuredVideoSource(input.contentId);
  const groups = await listHelpScreenshotReviewGroups(input.contentId);
  const group = groups.find((item) => item.blockId === input.blockId);
  const selectedCandidate =
    group?.candidates.find((candidate) => candidate.assetId === group.draftSelectedAssetId)
    ?? group?.candidates.find((candidate) => candidate.recommended)
    ?? group?.candidates.find((candidate) => candidate.timeSeconds !== null)
    ?? null;
  const baseTime = selectedCandidate?.timeSeconds ?? null;
  const durationSeconds = Math.max(...timeline.map((segment) => segment.end));
  const sourceText = [step.title, step.description, blockSource(step)].filter(Boolean).join("\n");

  let window: {
    startSeconds: number;
    endSeconds: number;
    capture: ScreenshotCaptureMode;
  };
  if (input.mode === "before" && baseTime !== null) {
    window = {
      startSeconds: Math.max(0, baseTime - 9),
      endSeconds: Math.max(2, baseTime - 1),
      capture: "before",
    };
  } else if (input.mode === "after" && baseTime !== null) {
    window = {
      startSeconds: Math.min(durationSeconds - 2, baseTime + 1),
      endSeconds: Math.min(durationSeconds, baseTime + 9),
      capture: "after",
    };
  } else {
    window = await automaticScreenshotWindow({
      actorUserId: input.actorUserId,
      contentId: input.contentId,
      stepId: step.id,
      sourceText,
      timeline,
      baseTime,
    });
  }

  const startSeconds = Math.max(0, Math.min(Number(window.startSeconds) || 0, durationSeconds));
  const endSeconds = Math.max(
    startSeconds + 2,
    Math.min(Number(window.endSeconds) || startSeconds + 8, durationSeconds),
  );
  const response = await getAssetObject(storageKey);
  const videoBytes = new Uint8Array(await response.arrayBuffer());
  const generated = await generateHelpVideoFrameCandidates({
    videoBytes,
    startSeconds,
    endSeconds,
    capture: window.capture,
    durationSeconds,
  });
  if (generated.length === 0) throw new Error("HELP_VIDEO_NO_SCREENSHOTS_SELECTED");

  return addHelpGeneratedReviewCandidates({
    actorUserId: input.actorUserId,
    contentId: input.contentId,
    blockId: input.blockId,
    altText: step.title,
    assistantDescription: step.description || step.title,
    candidates: generated.map((candidate) => ({
      timeSeconds: candidate.timeSeconds,
      bytes: candidate.bytes,
    })),
  });
}
