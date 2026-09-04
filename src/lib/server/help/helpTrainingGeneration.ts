import { eq } from "drizzle-orm";
import { createAiStructuredResponse, type AiStructuredResponse } from "$lib/server/ai/aiGateway";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingPathCategories,
  helpTrainingPaths,
  helpTrainingStepMedia,
  helpTrainingSteps,
  type HelpTrainingSourceContent,
} from "$lib/server/db/helpTrainingSchema";
import { helpAssets } from "$lib/server/db/structuredHelpSchema";
import { recordHelpAiUsage } from "$lib/server/help/helpAiUsageRepository";
import {
  getPublishedStructuredHelpById,
  type PublishedStructuredHelp,
} from "$lib/server/help/publicStructuredHelpRepository";
import { normalizeTrainingSlug } from "$lib/server/help/helpTrainingRepository";

type TranscriptTimelineSegment = {
  start: number;
  end: number;
  text: string;
};

type GeneratedTimelinePlan = {
  steps: Array<{
    sourceStepId: string;
    videoStartSeconds: number;
  }>;
};

type GeneratedTrainingPlan = {
  title: string;
  audience: string;
  welcomeMessage: string;
  steps: Array<{
    sourceStepId: string;
    title: string;
    question: string;
    instruction: string;
    expectedResult: string;
    successMessage: string;
    primaryActionLabel: string;
    interactionMode: "presentation";
    estimatedSeconds: number;
    videoStartSeconds: number;
  }>;
};

function sourceSnapshot(content: PublishedStructuredHelp): HelpTrainingSourceContent {
  return {
    contentId: content.contentId,
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    quickGuide: content.quickGuide,
    categories: content.categories,
    featuredVideo: content.featuredVideo,
    steps: content.steps,
    publishedAt: content.publishedAt.toISOString(),
  };
}

function readTimeline(value: unknown): TranscriptTimelineSegment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const start = Number(record.start);
    const end = Number(record.end);
    const text = typeof record.text === "string" ? record.text.trim() : "";
    return Number.isFinite(start) && Number.isFinite(end) && end > start && text
      ? [{ start: Math.max(0, start), end, text }]
      : [];
  }).slice(0, 2000);
}

async function sourceTimeline(content: PublishedStructuredHelp): Promise<TranscriptTimelineSegment[]> {
  if (!content.featuredVideo) return [];
  const [asset] = await getDatabase()
    .select({ metadata: helpAssets.metadata })
    .from(helpAssets)
    .where(eq(helpAssets.id, content.featuredVideo.id))
    .limit(1);
  const metadata = asset?.metadata && typeof asset.metadata === "object"
    ? asset.metadata as Record<string, unknown>
    : {};
  return readTimeline(metadata.transcriptTimeline);
}

function timelineText(timeline: TranscriptTimelineSegment[]): string {
  if (timeline.length === 0) return "Sem linha do tempo disponível.";
  return timeline
    .map((segment) => `[${segment.start.toFixed(1)}-${segment.end.toFixed(1)}] ${segment.text}`)
    .join("\n")
    .slice(0, 90_000);
}

function stepImageAsset(content: PublishedStructuredHelp, sourceStepId: string) {
  return content.steps
    .find((step) => step.id === sourceStepId)
    ?.blocks.find((block) => block.blockType === "image" && block.asset?.assetType === "image")
    ?.asset ?? null;
}

function blockToTrainingMarkdown(
  block: PublishedStructuredHelp["steps"][number]["blocks"][number],
): string {
  if (block.blockType === "text") return block.textContent.trim();

  if (block.blockType === "notice") {
    const prefix = block.noticeVariant === "warning" || block.noticeVariant === "danger"
      ? "⚠️ "
      : "💡 ";
    return block.textContent
      .trim()
      .split("\n")
      .map((line, index) => `> ${index === 0 ? prefix : ""}${line}`)
      .join("\n");
  }

  if (block.blockType === "link" && block.linkLabel) {
    return block.linkUrl
      ? `**${block.linkLabel}**\n\n${block.linkUrl}`
      : `**${block.linkLabel}**`;
  }

  if (block.blockType === "file" && block.asset?.altText) {
    return `**Material:** ${block.asset.altText}`;
  }

  return "";
}

function sourceInstruction(step: PublishedStructuredHelp["steps"][number]): string {
  const sections = [
    step.description.trim(),
    ...step.blocks.map(blockToTrainingMarkdown),
  ].filter(Boolean);

  if (sections.length > 0) return sections.join("\n\n").slice(0, 5000);
  return `Observe **${step.title.trim()}** e siga para a próxima etapa quando estiver pronto.`;
}

function stepsForAi(content: PublishedStructuredHelp): string {
  return content.steps.map((step, index) => {
    return [
      `ETAPA ${index + 1} | sourceStepId=${step.id}`,
      `TÍTULO: ${step.title}`,
      `CONTEÚDO:\n${sourceInstruction(step)}`,
    ].join("\n");
  }).join("\n\n");
}

const TIMELINE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["steps"],
  properties: {
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 80,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["sourceStepId", "videoStartSeconds"],
        properties: {
          sourceStepId: { type: "string", minLength: 1, maxLength: 80 },
          videoStartSeconds: { type: "integer", minimum: 0, maximum: 86400 },
        },
      },
    },
  },
} as const;

async function generatePlan(
  actorUserId: string,
  content: PublishedStructuredHelp,
): Promise<GeneratedTrainingPlan> {
  if (!content.featuredVideo) throw new Error("TRAINING_SOURCE_CONTENT_VIDEO_REQUIRED");
  if (content.steps.length === 0) throw new Error("TRAINING_SOURCE_CONTENT_STEPS_REQUIRED");

  const timeline = await sourceTimeline(content);
  const startedAt = Date.now();
  let provider = "";
  let model = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let fallbackUsed = false;

  let response: AiStructuredResponse<GeneratedTimelinePlan>;
  try {
    response = await createAiStructuredResponse<GeneratedTimelinePlan>({
      task: "training_generation",
      requiredCapabilities: ["knowledge.read", "training.draft"],
      schemaName: "f10_training_video_timeline",
      schema: TIMELINE_SCHEMA,
      maxOutputTokens: 1800,
      timeoutMs: 90_000,
      instructions: [
        "Você recebe um conteúdo F10 já publicado e a transcrição temporal do vídeo que originou esse conteúdo.",
        "A estrutura da trilha NÃO deve ser recriada: cada etapa publicada será exatamente um slide, na mesma ordem.",
        "Sua única responsabilidade é localizar no vídeo o início mais útil para demonstrar cada etapa.",
        "Retorne um item para cada sourceStepId recebido. Não remova, não una e não crie etapas.",
        "videoStartSeconds deve apontar alguns segundos antes da demonstração visual relevante começar.",
        "Quando não houver evidência suficiente na transcrição, use 0.",
        "Não crie cortes; o player reproduz o vídeo original a partir do timestamp.",
      ].join("\n"),
      userInput: [
        `CONTEÚDO PUBLICADO: ${content.title}`,
        "ETAPAS PUBLICADAS:",
        stepsForAi(content),
        "LINHA DO TEMPO DO VÍDEO:",
        timelineText(timeline),
      ].join("\n\n"),
    });

    provider = response.provider;
    model = response.model;
    inputTokens = response.inputTokens;
    outputTokens = response.outputTokens;
    fallbackUsed = response.fallbackUsed;
  } catch (cause) {
    await recordHelpAiUsage({
      actorUserId,
      operation: "training_generation",
      provider: provider || undefined,
      model: model || "ai-gateway",
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - startedAt,
      status: "failed",
      failureCode: cause instanceof Error ? cause.message : "TRAINING_GENERATION_FAILED",
      metadata: {
        contentId: content.contentId,
        sourcePublishedAt: content.publishedAt.toISOString(),
        sourceStepCount: content.steps.length,
        timelineSegments: timeline.length,
      },
    }).catch(() => undefined);
    throw cause;
  }

  const allowedStepIds = new Set(content.steps.map((step) => step.id));
  const timestampByStepId = new Map(
    response.data.steps
      .filter((step) => allowedStepIds.has(step.sourceStepId))
      .map((step) => [
        step.sourceStepId,
        Math.min(Math.max(Math.round(step.videoStartSeconds), 0), 86400),
      ]),
  );

  const steps = content.steps.map((step) => ({
    sourceStepId: step.id,
    title: step.title.trim().slice(0, 180),
    question: step.title.trim().slice(0, 300),
    instruction: sourceInstruction(step),
    expectedResult: "",
    successMessage: "",
    primaryActionLabel: "Continuar",
    interactionMode: "presentation" as const,
    estimatedSeconds: 45,
    videoStartSeconds: timestampByStepId.get(step.id) ?? 0,
  }));

  await recordHelpAiUsage({
    actorUserId,
    operation: "training_generation",
    provider,
    model,
    inputTokens,
    outputTokens,
    latencyMs: Date.now() - startedAt,
    metadata: {
      contentId: content.contentId,
      sourcePublishedAt: content.publishedAt.toISOString(),
      sourceStepCount: content.steps.length,
      generatedStepCount: steps.length,
      timelineSegments: timeline.length,
      fallbackUsed,
    },
  }).catch(() => undefined);

  return {
    title: content.title.trim().slice(0, 160),
    audience: "",
    welcomeMessage: (content.summary || content.quickGuide || "Siga cada etapa com o F10 aberto.").trim().slice(0, 800),
    steps,
  };
}

async function insertGeneratedSteps(
  tx: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  pathId: string,
  content: PublishedStructuredHelp,
  plan: GeneratedTrainingPlan,
): Promise<void> {
  for (const [index, step] of plan.steps.entries()) {
    const [created] = await tx
      .insert(helpTrainingSteps)
      .values({
        pathId,
        sourceContentStepId: step.sourceStepId,
        title: step.title,
        question: step.question,
        instruction: step.instruction,
        expectedResult: step.expectedResult,
        successMessage: step.successMessage,
        primaryActionLabel: step.primaryActionLabel,
        interactionMode: step.interactionMode,
        estimatedSeconds: step.estimatedSeconds,
        videoStartSeconds: step.videoStartSeconds,
        sortOrder: (index + 1) * 10,
      })
      .returning({ id: helpTrainingSteps.id });
    if (!created) throw new Error("TRAINING_STEP_NOT_CREATED");

    const image = stepImageAsset(content, step.sourceStepId);
    if (image) {
      await tx.insert(helpTrainingStepMedia).values({
        stepId: created.id,
        mediaType: "image",
        assetId: image.id,
        sourceUrl: null,
        altText: image.altText,
        sortOrder: 10,
      });
    }

    const video = content.featuredVideo;
    if (video?.storageKey) {
      await tx.insert(helpTrainingStepMedia).values({
        stepId: created.id,
        mediaType: "video",
        assetId: video.id,
        sourceUrl: `asset:${video.id}`,
        altText: video.altText,
        sortOrder: 20,
      });
    } else if (video?.sourceUrl) {
      await tx.insert(helpTrainingStepMedia).values({
        stepId: created.id,
        mediaType: "video",
        assetId: null,
        sourceUrl: video.sourceUrl,
        altText: video.altText,
        sortOrder: 20,
      });
    }
  }
}

async function replaceCategories(
  tx: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  pathId: string,
  content: PublishedStructuredHelp,
): Promise<void> {
  await tx.delete(helpTrainingPathCategories).where(eq(helpTrainingPathCategories.pathId, pathId));
  if (content.categories.length === 0) return;
  await tx.insert(helpTrainingPathCategories).values(
    content.categories.map((category, index) => ({
      pathId,
      categoryId: category.id,
      sortOrder: (index + 1) * 10,
    })),
  );
}

export async function generateHelpTrainingFromPublishedContent(
  actorUserId: string,
  contentId: string,
) {
  const content = await getPublishedStructuredHelpById(contentId);
  if (!content) throw new Error("TRAINING_SOURCE_CONTENT_NOT_PUBLISHED");
  const plan = await generatePlan(actorUserId, content);
  const slug = normalizeTrainingSlug(plan.title || content.title);
  if (!slug) throw new Error("INVALID_TRAINING_PATH");

  const db = getDatabase();
  const snapshot = sourceSnapshot(content);
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(helpTrainingPaths)
      .values({
        slug,
        title: plan.title,
        audience: plan.audience,
        description: `Gerada a partir do conteúdo publicado “${content.title}”.`,
        welcomeMessage: plan.welcomeMessage,
        sourceContentId: content.contentId,
        sourcePublishedAt: content.publishedAt,
        sourcePublicationSnapshot: snapshot,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning({ id: helpTrainingPaths.id, slug: helpTrainingPaths.slug });

    const path = rows[0];
    if (!path) throw new Error("TRAINING_PATH_NOT_CREATED");
    await replaceCategories(tx, path.id, content);
    await insertGeneratedSteps(tx, path.id, content, plan);
    return rows;
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.training.generated",
    entityType: "help_training_path",
    entityId: created.id,
    metadata: {
      sourceContentId: content.contentId,
      sourcePublishedAt: content.publishedAt.toISOString(),
      stepCount: plan.steps.length,
    },
  });

  return created;
}

export async function regenerateHelpTrainingFromPublishedContent(
  actorUserId: string,
  pathId: string,
) {
  const db = getDatabase();
  const [path] = await db
    .select({
      id: helpTrainingPaths.id,
      sourceContentId: helpTrainingPaths.sourceContentId,
      status: helpTrainingPaths.status,
    })
    .from(helpTrainingPaths)
    .where(eq(helpTrainingPaths.id, pathId))
    .limit(1);

  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.status === "archived") throw new Error("TRAINING_PATH_ARCHIVED");

  const content = await getPublishedStructuredHelpById(path.sourceContentId);
  if (!content) throw new Error("TRAINING_SOURCE_CONTENT_NOT_PUBLISHED");

  const plan = await generatePlan(actorUserId, content);
  const snapshot = sourceSnapshot(content);

  await db.transaction(async (tx) => {
    await tx.delete(helpTrainingSteps).where(eq(helpTrainingSteps.pathId, pathId));
    await replaceCategories(tx, pathId, content);
    await insertGeneratedSteps(tx, pathId, content, plan);
    await tx
      .update(helpTrainingPaths)
      .set({
        title: plan.title,
        welcomeMessage: plan.welcomeMessage,
        sourcePublishedAt: content.publishedAt,
        sourcePublicationSnapshot: snapshot,
        status: "draft",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(helpTrainingPaths.id, pathId));
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.training.regenerated",
    entityType: "help_training_path",
    entityId: pathId,
    metadata: {
      sourceContentId: content.contentId,
      sourcePublishedAt: content.publishedAt.toISOString(),
      stepCount: plan.steps.length,
    },
  });
}
