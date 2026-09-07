import { eq } from "drizzle-orm";
import { AiGatewayError, createAiStructuredResponse, type AiStructuredResponse } from "$lib/server/ai/aiGateway";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingPathCategories,
  helpTrainingPathItems,
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
    videoEndSeconds: number;
  }>;
};

const TRAINING_GENERATION_CONCURRENCY = 2;

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
    videoEndSeconds: number;
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
        required: ["sourceStepId", "videoStartSeconds", "videoEndSeconds"],
        properties: {
          sourceStepId: { type: "string", minLength: 1, maxLength: 80 },
          videoStartSeconds: { type: "integer", minimum: 0, maximum: 86400 },
          videoEndSeconds: { type: "integer", minimum: 0, maximum: 86400 },
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
  let retryUsed = false;
  const requestPlan = () => createAiStructuredResponse<GeneratedTimelinePlan>({
      task: "training_generation",
      requiredCapabilities: ["knowledge.read", "training.draft"],
      schemaName: "f10_training_video_timeline",
      schema: TIMELINE_SCHEMA,
      maxOutputTokens: 4_000,
      timeoutMs: 90_000,
      instructions: [
        "Você recebe um conteúdo F10 já publicado e a transcrição temporal do vídeo que originou esse conteúdo.",
        "A estrutura da trilha NÃO deve ser recriada: cada etapa publicada será exatamente um slide, na mesma ordem.",
        "Sua única responsabilidade é localizar no vídeo o intervalo exato que corresponde a cada etapa publicada.",
        "Retorne um item para cada sourceStepId recebido. Não remova, não una e não crie etapas.",
        "videoStartSeconds deve marcar o segundo em que começa a explicação ou demonstração específica daquela etapa.",
        "videoEndSeconds deve marcar o segundo em que termina a explicação ou demonstração daquela etapa, antes de o vídeo entrar no assunto do próximo slide.",
        "Não adicione folga grande antes ou depois. O objetivo é reproduzir somente o trecho útil daquela etapa.",
        "videoEndSeconds deve ser maior que videoStartSeconds quando houver evidência suficiente.",
        "Quando não houver evidência suficiente para uma etapa, use 0 para início e fim.",
        "Não crie cortes nem novos arquivos; o player usa o vídeo original e apenas inicia e pausa nesses pontos.",
      ].join("\n"),
      userInput: [
        `CONTEÚDO PUBLICADO: ${content.title}`,
        "ETAPAS PUBLICADAS:",
        stepsForAi(content),
        "LINHA DO TEMPO DO VÍDEO:",
        timelineText(timeline),
      ].join("\n\n"),
    });

  try {
    try {
      response = await requestPlan();
    } catch (cause) {
      if (
        cause instanceof AiGatewayError
        && (cause.code === "AI_EMPTY_RESPONSE" || cause.code === "AI_OUTPUT_INCOMPLETE")
      ) {
        retryUsed = true;
        response = await requestPlan();
      } else {
        throw cause;
      }
    }

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
  const rangeByStepId = new Map(
    response.data.steps
      .filter((step) => allowedStepIds.has(step.sourceStepId))
      .map((step) => {
        const start = Math.min(Math.max(Math.round(step.videoStartSeconds), 0), 86400);
        const rawEnd = Math.min(Math.max(Math.round(step.videoEndSeconds), 0), 86400);
        const end = rawEnd > start ? rawEnd : 0;
        return [step.sourceStepId, { start, end }] as const;
      }),
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
    videoStartSeconds: rangeByStepId.get(step.id)?.start ?? 0,
    videoEndSeconds: rangeByStepId.get(step.id)?.end ?? 0,
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
      retryUsed,
    },
  }).catch(() => undefined);

  return {
    title: content.title.trim().slice(0, 160),
    audience: "",
    welcomeMessage: (content.summary || content.quickGuide || "Siga cada etapa com o F10 aberto.").trim().slice(0, 800),
    steps,
  };
}

async function generatePlans(
  actorUserId: string,
  contents: PublishedStructuredHelp[],
): Promise<GeneratedTrainingPlan[]> {
  if (contents.length === 0) return [];

  const plans: GeneratedTrainingPlan[] = new Array(contents.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(TRAINING_GENERATION_CONCURRENCY, contents.length) },
    async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= contents.length) return;

        const content = contents[index];
        if (!content) throw new Error("TRAINING_SOURCE_CONTENT_NOT_PUBLISHED");
        plans[index] = await generatePlan(actorUserId, content);
      }
    },
  );

  await Promise.all(workers);
  return plans;
}

async function insertGeneratedSteps(
  tx: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  pathId: string,
  pathItemId: string,
  content: PublishedStructuredHelp,
  plan: GeneratedTrainingPlan,
  sortOffset: number,
): Promise<number> {
  for (const [index, step] of plan.steps.entries()) {
    const [created] = await tx
      .insert(helpTrainingSteps)
      .values({
        pathId,
        pathItemId,
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
        videoEndSeconds: step.videoEndSeconds,
        sortOrder: sortOffset + (index + 1) * 10,
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

  return plan.steps.length;
}

async function replaceCategories(
  tx: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  pathId: string,
  contents: PublishedStructuredHelp[],
): Promise<void> {
  await tx.delete(helpTrainingPathCategories).where(eq(helpTrainingPathCategories.pathId, pathId));
  const categories = Array.from(
    new Map(
      contents
        .flatMap((content) => content.categories)
        .map((category) => [category.id, category] as const),
    ).values(),
  );
  if (categories.length === 0) return;
  await tx.insert(helpTrainingPathCategories).values(
    categories.map((category, index) => ({
      pathId,
      categoryId: category.id,
      sortOrder: (index + 1) * 10,
    })),
  );
}

async function resolveTrainingSlug(title: string): Promise<string> {
  const baseSlug = normalizeTrainingSlug(title);
  if (!baseSlug) throw new Error("INVALID_TRAINING_PATH");

  const db = getDatabase();
  for (let suffix = 1; suffix <= 99; suffix += 1) {
    const candidate = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const [existing] = await db
      .select({ id: helpTrainingPaths.id })
      .from(helpTrainingPaths)
      .where(eq(helpTrainingPaths.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }

  throw new Error("TRAINING_SLUG_UNAVAILABLE");
}

export async function generateHelpTrainingFromPublishedContents(
  actorUserId: string,
  contentIds: string[],
  requestedTitle = "",
) {
  const uniqueContentIds = Array.from(new Set(contentIds.map((value) => value.trim()).filter(Boolean)));
  if (uniqueContentIds.length === 0) throw new Error("TRAINING_SOURCE_CONTENT_NOT_PUBLISHED");
  if (uniqueContentIds.length > 20) throw new Error("TRAINING_SOURCE_CONTENT_LIMIT");

  const contents: PublishedStructuredHelp[] = [];
  for (const contentId of uniqueContentIds) {
    const content = await getPublishedStructuredHelpById(contentId);
    if (!content) throw new Error("TRAINING_SOURCE_CONTENT_NOT_PUBLISHED");
    contents.push(content);
  }

  const plans = await generatePlans(actorUserId, contents);

  const multiContent = contents.length > 1;
  const title = multiContent
    ? requestedTitle.trim().slice(0, 160)
    : plans[0]?.title.trim().slice(0, 160) || contents[0]?.title.trim().slice(0, 160) || "";
  if (title.length < 4) throw new Error("INVALID_TRAINING_PATH");

  const slug = await resolveTrainingSlug(title);
  const primaryContent = contents[0];
  const primaryPlan = plans[0];
  if (!primaryContent || !primaryPlan) throw new Error("TRAINING_SOURCE_CONTENT_NOT_PUBLISHED");

  const db = getDatabase();
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(helpTrainingPaths)
      .values({
        slug,
        title,
        audience: multiContent ? "" : primaryPlan.audience,
        description: multiContent
          ? `Trilha com ${contents.length} conteúdos publicados.`
          : `Gerada a partir do conteúdo publicado “${primaryContent.title}”.`,
        welcomeMessage: multiContent
          ? `Percorra os ${contents.length} módulos desta trilha na ordem indicada.`
          : primaryPlan.welcomeMessage,
        sourceContentId: primaryContent.contentId,
        sourcePublishedAt: primaryContent.publishedAt,
        sourcePublicationSnapshot: sourceSnapshot(primaryContent),
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning({ id: helpTrainingPaths.id, slug: helpTrainingPaths.slug });

    const path = rows[0];
    if (!path) throw new Error("TRAINING_PATH_NOT_CREATED");

    let globalStepOffset = 0;
    for (const [index, content] of contents.entries()) {
      const plan = plans[index];
      if (!plan) throw new Error("TRAINING_GENERATION_EMPTY");
      const [pathItem] = await tx
        .insert(helpTrainingPathItems)
        .values({
          pathId: path.id,
          sourceContentId: content.contentId,
          sourcePublishedAt: content.publishedAt,
          sourcePublicationSnapshot: sourceSnapshot(content),
          sortOrder: (index + 1) * 10,
        })
        .returning({ id: helpTrainingPathItems.id });
      if (!pathItem) throw new Error("TRAINING_PATH_ITEM_NOT_CREATED");

      const insertedCount = await insertGeneratedSteps(
        tx,
        path.id,
        pathItem.id,
        content,
        plan,
        globalStepOffset,
      );
      globalStepOffset += insertedCount * 10;
    }

    await replaceCategories(tx, path.id, contents);
    return rows;
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.training.generated",
    entityType: "help_training_path",
    entityId: created.id,
    metadata: {
      sourceContentIds: contents.map((content) => content.contentId),
      moduleCount: contents.length,
      stepCount: plans.reduce((sum, plan) => sum + plan.steps.length, 0),
    },
  });

  return created;
}

export async function generateHelpTrainingFromPublishedContent(
  actorUserId: string,
  contentId: string,
) {
  return generateHelpTrainingFromPublishedContents(actorUserId, [contentId]);
}

export async function regenerateHelpTrainingFromPublishedContent(
  actorUserId: string,
  pathId: string,
) {
  const db = getDatabase();
  const [path] = await db
    .select({
      id: helpTrainingPaths.id,
      status: helpTrainingPaths.status,
    })
    .from(helpTrainingPaths)
    .where(eq(helpTrainingPaths.id, pathId))
    .limit(1);

  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.status === "archived") throw new Error("TRAINING_PATH_ARCHIVED");

  const items = await db
    .select()
    .from(helpTrainingPathItems)
    .where(eq(helpTrainingPathItems.pathId, pathId))
    .orderBy(helpTrainingPathItems.sortOrder);
  if (items.length === 0) throw new Error("TRAINING_PATH_ITEM_REQUIRED");

  const contents: PublishedStructuredHelp[] = [];
  for (const item of items) {
    const content = await getPublishedStructuredHelpById(item.sourceContentId);
    if (!content) throw new Error("TRAINING_SOURCE_CONTENT_NOT_PUBLISHED");
    contents.push(content);
  }
  const plans = await generatePlans(actorUserId, contents);

  const primaryContent = contents[0];
  const primaryPlan = plans[0];
  if (!primaryContent || !primaryPlan) throw new Error("TRAINING_SOURCE_CONTENT_NOT_PUBLISHED");

  await db.transaction(async (tx) => {
    await tx.delete(helpTrainingSteps).where(eq(helpTrainingSteps.pathId, pathId));
    await replaceCategories(tx, pathId, contents);

    let globalStepOffset = 0;
    for (const [index, item] of items.entries()) {
      const content = contents[index];
      const plan = plans[index];
      if (!content || !plan) throw new Error("TRAINING_GENERATION_EMPTY");

      await tx
        .update(helpTrainingPathItems)
        .set({
          sourcePublishedAt: content.publishedAt,
          sourcePublicationSnapshot: sourceSnapshot(content),
          updatedAt: new Date(),
        })
        .where(eq(helpTrainingPathItems.id, item.id));

      const insertedCount = await insertGeneratedSteps(
        tx,
        pathId,
        item.id,
        content,
        plan,
        globalStepOffset,
      );
      globalStepOffset += insertedCount * 10;
    }

    await tx
      .update(helpTrainingPaths)
      .set({
        ...(items.length === 1
          ? { title: primaryPlan.title, welcomeMessage: primaryPlan.welcomeMessage }
          : {}),
        sourceContentId: primaryContent.contentId,
        sourcePublishedAt: primaryContent.publishedAt,
        sourcePublicationSnapshot: sourceSnapshot(primaryContent),
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
      sourceContentIds: contents.map((content) => content.contentId),
      moduleCount: contents.length,
      stepCount: plans.reduce((sum, plan) => sum + plan.steps.length, 0),
    },
  });
}
