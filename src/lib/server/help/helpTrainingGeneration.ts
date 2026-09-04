import { and, eq } from "drizzle-orm";
import { createAiStructuredResponse, type AiStructuredResponse } from "$lib/server/ai/aiGateway";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingPathCategories,
  helpTrainingPaths,
  helpTrainingStepMedia,
  helpTrainingSteps,
  type HelpTrainingInteractionMode,
  type HelpTrainingSourceContent,
} from "$lib/server/db/helpTrainingSchema";
import {
  helpAssets,
} from "$lib/server/db/structuredHelpSchema";
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
    interactionMode: HelpTrainingInteractionMode;
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


function visualStepIds(content: PublishedStructuredHelp): Set<string> {
  return new Set(
    content.steps
      .filter((step) => Boolean(stepImageAsset(content, step.id)))
      .map((step) => step.id),
  );
}

function publicText(content: PublishedStructuredHelp): string {
  return content.steps.map((step, index) => {
    const image = stepImageAsset(content, step.id);
    const blocks = step.blocks.map((block) => {
      if (block.blockType === "text" || block.blockType === "notice") return block.textContent;
      if (block.blockType === "image") return block.asset?.altText ? `[Imagem: ${block.asset.altText}]` : "[Imagem]";
      if (block.blockType === "link") return block.linkLabel ? `[Link: ${block.linkLabel}]` : "";
      return "";
    }).filter(Boolean).join("\n");
    return [
      `PASSO ${index + 1} | id=${step.id} | imagem=${image ? "SIM" : "NÃO"}`,
      step.title,
      step.description,
      blocks,
    ].filter(Boolean).join("\n");
  }).join("\n\n");
}

function timelineText(timeline: TranscriptTimelineSegment[]): string {
  if (timeline.length === 0) return "Sem linha do tempo disponível.";
  return timeline
    .map((segment) => `[${segment.start.toFixed(1)}-${segment.end.toFixed(1)}] ${segment.text}`)
    .join("\n")
    .slice(0, 90_000);
}

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "audience", "welcomeMessage", "steps"],
  properties: {
    title: { type: "string", minLength: 4, maxLength: 160 },
    audience: { type: "string", maxLength: 160 },
    welcomeMessage: { type: "string", minLength: 4, maxLength: 800 },
    steps: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "sourceStepId",
          "title",
          "question",
          "instruction",
          "expectedResult",
          "successMessage",
          "primaryActionLabel",
          "interactionMode",
          "estimatedSeconds",
          "videoStartSeconds",
        ],
        properties: {
          sourceStepId: { type: "string", minLength: 1, maxLength: 80 },
          title: { type: "string", minLength: 3, maxLength: 180 },
          question: { type: "string", minLength: 3, maxLength: 300 },
          instruction: { type: "string", minLength: 3, maxLength: 3000 },
          expectedResult: { type: "string", maxLength: 1500 },
          successMessage: { type: "string", maxLength: 500 },
          primaryActionLabel: { type: "string", minLength: 2, maxLength: 80 },
          interactionMode: { type: "string", enum: ["presentation", "action"] },
          estimatedSeconds: { type: "integer", minimum: 5, maximum: 900 },
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
  const allowedVisualStepIds = visualStepIds(content);
  if (allowedVisualStepIds.size === 0) throw new Error("TRAINING_SOURCE_CONTENT_IMAGES_REQUIRED");

  const timeline = await sourceTimeline(content);
  const startedAt = Date.now();
  let provider = "";
  let model = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let fallbackUsed = false;

  let response: AiStructuredResponse<GeneratedTrainingPlan>;
  try {
    response = await createAiStructuredResponse<GeneratedTrainingPlan>({
      task: "training_generation",
      requiredCapabilities: ["knowledge.read", "training.draft"],
      schemaName: "f10_training_from_published_content",
      schema: PLAN_SCHEMA,
      maxOutputTokens: 3500,
      timeoutMs: 90_000,
    instructions: [
      "Você cria Trilhas F10 somente a partir do conteúdo publicado fornecido.",
      "A trilha é uma sequência prática para a pessoa executar o procedimento no F10 enquanto consulta uma guia flutuante.",
      "Não invente menus, botões, regras, exceções ou resultados.",
      "Cada etapa deve apontar para um sourceStepId existente exatamente como recebido e que esteja marcado com imagem=SIM.",
      "Toda etapa da trilha é um slide visual: nunca gere introdução, conclusão ou ação sem uma imagem publicada associada.",
      "Prefira uma ação essencial por slide e evite fragmentação excessiva.",
      "A instruction será exibida em uma janela pequena ao lado da imagem. Escreva uma orientação curta, didática e visualmente organizada em Markdown.",
      "Use **negrito** para a ação principal e nomes importantes; use `código` para menus, botões, abas, campos e valores que a pessoa deve localizar no F10.",
      "Quando houver mais de uma interação, use lista com marcadores ou passos numerados. Evite parágrafo longo.",
      "Emoji é permitido apenas quando realmente ajuda a leitura, no máximo um por slide, por exemplo 👉 para ação e ⚠️ para atenção.",
      "Não repita o título inteiro dentro da instruction e não escreva texto genérico ou vazio.",
      "Se houver linha do tempo do vídeo, videoStartSeconds deve apontar para o início do trecho essencial daquela ação, de preferência alguns segundos antes da demonstração ficar visível.",
      "Não crie cortes de vídeo. O vídeo sempre será reproduzido integralmente a partir de videoStartSeconds.",
      "Se não houver linha do tempo útil, use videoStartSeconds=0.",
      "Use interactionMode=action quando a pessoa precisa executar algo no F10 e presentation somente quando basta observar ou compreender.",
      "primaryActionLabel deve ser curto: use 'Continuar' para os slides.",
    ].join("\n"),
    userInput: [
      `CONTEÚDO: ${content.title}`,
      content.summary,
      content.quickGuide ? `RESUMO RÁPIDO:\n${content.quickGuide}` : "",
      "PASSOS PUBLICADOS:",
      publicText(content),
      "LINHA DO TEMPO DO VÍDEO:",
      timelineText(timeline),
    ].filter(Boolean).join("\n\n"),
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
        timelineSegments: timeline.length,
      },
    }).catch(() => undefined);
    throw cause;
  }

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
      stepCount: response.data.steps.length,
      timelineSegments: timeline.length,
      fallbackUsed,
    },
  }).catch(() => undefined);

  const allowedStepIds = visualStepIds(content);
  const normalizedSteps = response.data.steps
    .filter((step) =>
      allowedStepIds.has(step.sourceStepId)
      && step.instruction.trim().length >= 12
    )
    .map((step) => ({
      ...step,
      title: step.title.trim().slice(0, 180),
      question: step.question.trim().slice(0, 300),
      instruction: step.instruction.trim().slice(0, 3000),
      expectedResult: step.expectedResult.trim().slice(0, 1500),
      successMessage: step.successMessage.trim().slice(0, 500),
      primaryActionLabel: "Continuar",
      estimatedSeconds: Math.min(Math.max(Math.round(step.estimatedSeconds), 5), 900),
      videoStartSeconds: content.featuredVideo
        ? Math.min(Math.max(Math.round(step.videoStartSeconds), 0), 86400)
        : 0,
    }));
  if (normalizedSteps.length === 0) throw new Error("TRAINING_GENERATION_EMPTY");
  if (normalizedSteps.some((step) => !stepImageAsset(content, step.sourceStepId))) {
    throw new Error("TRAINING_GENERATION_IMAGE_REQUIRED");
  }

  return {
    title: response.data.title.trim().slice(0, 160) || content.title,
    audience: response.data.audience.trim().slice(0, 160),
    welcomeMessage: response.data.welcomeMessage.trim().slice(0, 800),
    steps: normalizedSteps,
  };
}

function stepImageAsset(content: PublishedStructuredHelp, sourceStepId: string) {
  return content.steps
    .find((step) => step.id === sourceStepId)
    ?.blocks.find((block) => block.blockType === "image" && block.asset?.assetType === "image")
    ?.asset ?? null;
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
    if (!image) throw new Error("TRAINING_GENERATION_IMAGE_REQUIRED");
    await tx.insert(helpTrainingStepMedia).values({
      stepId: created.id,
      mediaType: "image",
      assetId: image.id,
      sourceUrl: null,
      altText: image.altText,
      sortOrder: 10,
    });

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
