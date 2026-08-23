import { and, asc, eq, inArray, max } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import {
  helpAssets,
  helpCategories,
  helpContentCategories,
  helpContentFeaturedVideos,
  helpContentSteps,
  helpContents,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { normalizeHelpSlug } from "$lib/server/help/helpArticleRepository";
import { saveHelpContentVersion } from "$lib/server/help/helpVersionRepository";

export type StructuredHelpBlockType =
  | "text"
  | "image"
  | "video"
  | "notice"
  | "link"
  | "file";

export type StructuredHelpContentCategoryInput = {
  categoryId: string;
  destinationUrl: string;
  sortOrder?: number;
};

export type StructuredHelpContentInput = {
  title: string;
  slug: string;
  summary: string;
  searchAliases: string[];
  assistantKnowledge: string;
  internalSupportNotes: string;
  categories: StructuredHelpContentCategoryInput[];
};

export type StructuredHelpStepInput = {
  title: string;
  description: string;
  assistantKnowledge: string;
};

export type StructuredHelpBlockInput = {
  blockType: StructuredHelpBlockType;
  textContent: string;
  sourceUrl: string;
  altText: string;
  assistantDescription: string;
  subtitles: string;
  assistantSummary: string;
  extractedText: string;
  linkUrl: string;
  linkLabel: string;
  noticeVariant: string;
};

export type StructuredHelpFeaturedVideoInput = {
  sourceUrl: string;
  altText: string;
  subtitles: string;
  assistantSummary: string;
};

function normalizeAliases(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length >= 2)
        .slice(0, 80),
    ),
  );
}

function uniqueCategoryInputs(
  categories: StructuredHelpContentCategoryInput[],
): StructuredHelpContentCategoryInput[] {
  const result = new Map<string, StructuredHelpContentCategoryInput>();
  for (const category of categories) {
    if (!category.categoryId) continue;
    result.set(category.categoryId, {
      categoryId: category.categoryId,
      destinationUrl: category.destinationUrl.trim().slice(0, 1000),
      sortOrder: Number.isFinite(category.sortOrder) ? Math.max(0, Math.round(category.sortOrder ?? 10)) : 10,
    });
  }
  return Array.from(result.values());
}

async function assertActiveCategories(
  categories: StructuredHelpContentCategoryInput[],
): Promise<StructuredHelpContentCategoryInput[]> {
  const normalized = uniqueCategoryInputs(categories);
  if (normalized.length === 0) throw new Error("CONTENT_CATEGORY_REQUIRED");

  const ids = normalized.map((category) => category.categoryId);
  const rows = await getDatabase()
    .select({ id: helpCategories.id })
    .from(helpCategories)
    .where(and(inArray(helpCategories.id, ids), eq(helpCategories.active, true)));
  if (rows.length !== ids.length) throw new Error("CONTENT_CATEGORY_INVALID");
  return normalized;
}

async function replaceContentCategories(
  tx: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  contentId: string,
  categories: StructuredHelpContentCategoryInput[],
): Promise<void> {
  await tx.delete(helpContentCategories).where(eq(helpContentCategories.contentId, contentId));
  if (categories.length === 0) return;
  await tx.insert(helpContentCategories).values(
    categories.map((category) => ({
      contentId,
      categoryId: category.categoryId,
      destinationUrl: category.destinationUrl,
      sortOrder: category.sortOrder ?? 10,
    })),
  );
}

async function getContentRow(contentId: string) {
  const [content] = await getDatabase()
    .select()
    .from(helpContents)
    .where(eq(helpContents.id, contentId))
    .limit(1);
  return content ?? null;
}

async function getStepRow(stepId: string) {
  const [step] = await getDatabase()
    .select()
    .from(helpContentSteps)
    .where(eq(helpContentSteps.id, stepId))
    .limit(1);
  return step ?? null;
}

async function getBlockRow(blockId: string) {
  const [block] = await getDatabase()
    .select()
    .from(helpStepBlocks)
    .where(eq(helpStepBlocks.id, blockId))
    .limit(1);
  return block ?? null;
}

async function getContentVideoBlocks(contentId: string) {
  const db = getDatabase();
  const steps = await db
    .select({ id: helpContentSteps.id })
    .from(helpContentSteps)
    .where(eq(helpContentSteps.contentId, contentId));
  const stepIds = steps.map((step) => step.id);
  if (stepIds.length === 0) return [];
  return db
    .select()
    .from(helpStepBlocks)
    .where(inArray(helpStepBlocks.stepId, stepIds))
    .then((blocks) => blocks.filter((block) => block.blockType === "video"));
}

export async function listStructuredHelpContents() {
  const db = getDatabase();
  const rows = await db
    .select({
      id: helpContents.id,
      slug: helpContents.slug,
      title: helpContents.title,
      summary: helpContents.summary,
      status: helpContents.status,
      publishedAt: helpContents.publishedAt,
      updatedAt: helpContents.updatedAt,
    })
    .from(helpContents)
    .orderBy(asc(helpContents.title));

  const [stepRows, categoryRows] = await Promise.all([
    db.select({ contentId: helpContentSteps.contentId }).from(helpContentSteps),
    db
      .select({
        contentId: helpContentCategories.contentId,
        id: helpCategories.id,
        name: helpCategories.name,
        slug: helpCategories.slug,
      })
      .from(helpContentCategories)
      .innerJoin(helpCategories, eq(helpContentCategories.categoryId, helpCategories.id))
      .orderBy(asc(helpCategories.sortOrder), asc(helpCategories.name)),
  ]);

  const stepCount = new Map<string, number>();
  for (const step of stepRows) {
    stepCount.set(step.contentId, (stepCount.get(step.contentId) ?? 0) + 1);
  }

  const categoriesByContent = new Map<string, Array<{ id: string; name: string; slug: string }>>();
  for (const category of categoryRows) {
    const current = categoriesByContent.get(category.contentId) ?? [];
    current.push({ id: category.id, name: category.name, slug: category.slug });
    categoriesByContent.set(category.contentId, current);
  }

  return rows.map((row) => ({
    ...row,
    stepCount: stepCount.get(row.id) ?? 0,
    categories: categoriesByContent.get(row.id) ?? [],
  }));
}

export async function getStructuredHelpContent(contentId: string) {
  const db = getDatabase();
  const content = await getContentRow(contentId);
  if (!content) return null;

  const [steps, publication, featuredRows, categories] = await Promise.all([
    db
      .select()
      .from(helpContentSteps)
      .where(eq(helpContentSteps.contentId, contentId))
      .orderBy(asc(helpContentSteps.sortOrder)),
    db
      .select({ publishedAt: helpPublications.publishedAt })
      .from(helpPublications)
      .where(
        and(
          eq(helpPublications.entityType, "content"),
          eq(helpPublications.entityId, contentId),
        ),
      )
      .limit(1),
    db
      .select({ assetId: helpContentFeaturedVideos.assetId })
      .from(helpContentFeaturedVideos)
      .where(eq(helpContentFeaturedVideos.contentId, contentId))
      .limit(1),
    db
      .select({
        id: helpCategories.id,
        slug: helpCategories.slug,
        name: helpCategories.name,
        description: helpCategories.description,
        icon: helpCategories.icon,
        active: helpCategories.active,
        defaultDestinationUrl: helpCategories.destinationUrl,
        destinationUrl: helpContentCategories.destinationUrl,
        sortOrder: helpContentCategories.sortOrder,
      })
      .from(helpContentCategories)
      .innerJoin(helpCategories, eq(helpContentCategories.categoryId, helpCategories.id))
      .where(eq(helpContentCategories.contentId, contentId))
      .orderBy(asc(helpContentCategories.sortOrder), asc(helpCategories.name)),
  ]);

  const stepIds = steps.map((step) => step.id);
  const blocksByStep = new Map<string, Array<typeof helpStepBlocks.$inferSelect>>();

  if (stepIds.length > 0) {
    const blocks = await db
      .select()
      .from(helpStepBlocks)
      .where(inArray(helpStepBlocks.stepId, stepIds))
      .orderBy(asc(helpStepBlocks.sortOrder));
    for (const block of blocks) {
      const current = blocksByStep.get(block.stepId) ?? [];
      current.push(block);
      blocksByStep.set(block.stepId, current);
    }
  }

  const featuredAssetId = featuredRows[0]?.assetId ?? null;
  const allBlocks = Array.from(blocksByStep.values()).flat();
  const assetIds = Array.from(
    new Set(
      [...allBlocks.map((block) => block.assetId), featuredAssetId].filter(
        (assetId): assetId is string => Boolean(assetId),
      ),
    ),
  );
  const assetsById = new Map<string, typeof helpAssets.$inferSelect>();

  if (assetIds.length > 0) {
    const assets = await db.select().from(helpAssets).where(inArray(helpAssets.id, assetIds));
    for (const asset of assets) assetsById.set(asset.id, asset);
  }

  const legacyVideoCount = allBlocks.filter(
    (block) =>
      block.blockType === "video" &&
      (!featuredAssetId || block.assetId !== featuredAssetId),
  ).length;

  return {
    ...content,
    categories: categories.map((category) => ({
      ...category,
      effectiveDestinationUrl: category.destinationUrl || category.defaultDestinationUrl,
    })),
    featuredVideo: featuredAssetId ? (assetsById.get(featuredAssetId) ?? null) : null,
    legacyVideoCount,
    hasPublishedVersion: publication.length > 0,
    publishedVersionAt: publication[0]?.publishedAt ?? null,
    steps: steps.map((step) => ({
      ...step,
      blocks: (blocksByStep.get(step.id) ?? [])
        .filter(
          (block) =>
            !(
              block.blockType === "video" &&
              featuredAssetId &&
              block.assetId === featuredAssetId
            ),
        )
        .map((block) => ({
          ...block,
          asset: block.assetId ? (assetsById.get(block.assetId) ?? null) : null,
        })),
    })),
  };
}

function serializeAsset(asset: typeof helpAssets.$inferSelect | null) {
  if (!asset) return null;
  return {
    id: asset.id,
    assetType: asset.assetType,
    sourceUrl: asset.sourceUrl,
    storageKey: asset.storageKey,
    altText: asset.altText,
    assistantDescription: asset.assistantDescription,
    subtitles: asset.subtitles,
    assistantSummary: asset.assistantSummary,
    extractedText: asset.extractedText,
  };
}

async function buildVersionSnapshot(contentId: string) {
  const content = await getStructuredHelpContent(contentId);
  if (!content) return null;

  return {
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    searchAliases: content.searchAliases,
    assistantKnowledge: content.assistantKnowledge,
    internalSupportNotes: content.internalSupportNotes,
    categories: content.categories,
    featuredVideo: serializeAsset(content.featuredVideo),
    status: content.status,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    steps: content.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      assistantKnowledge: step.assistantKnowledge,
      sortOrder: step.sortOrder,
      blocks: step.blocks.map((block) => ({
        id: block.id,
        blockType: block.blockType,
        textContent: block.textContent,
        linkUrl: block.linkUrl,
        linkLabel: block.linkLabel,
        noticeVariant: block.noticeVariant,
        sortOrder: block.sortOrder,
        asset: serializeAsset(block.asset),
      })),
    })),
  };
}

async function saveStructuredContentVersion(
  contentId: string,
  actorUserId: string,
): Promise<void> {
  const snapshot = await buildVersionSnapshot(contentId);
  if (!snapshot) return;
  await saveHelpContentVersion("content", contentId, snapshot, actorUserId);
}

async function markContentDraft(contentId: string, actorUserId: string) {
  await getDatabase()
    .update(helpContents)
    .set({
      status: "draft",
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(helpContents.id, contentId));
}

export async function createStructuredHelpContent(
  actorUserId: string,
  input: StructuredHelpContentInput,
) {
  const db = getDatabase();
  const slug = normalizeHelpSlug(input.slug || input.title);
  if (!slug) throw new Error("INVALID_SLUG");
  const categories = await assertActiveCategories(input.categories);

  const content = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(helpContents)
      .values({
        slug,
        title: input.title.trim(),
        summary: input.summary.trim(),
        searchAliases: normalizeAliases(input.searchAliases),
        assistantKnowledge: input.assistantKnowledge.trim(),
        internalSupportNotes: input.internalSupportNotes.trim(),
        status: "draft",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning({ id: helpContents.id, slug: helpContents.slug });
    if (!created) throw new Error("CONTENT_NOT_CREATED");

    await replaceContentCategories(tx, created.id, categories);
    await tx.insert(helpContentSteps).values({
      contentId: created.id,
      title: "Passo 1",
      description: "",
      assistantKnowledge: "",
      sortOrder: 10,
    });
    return created;
  });

  await saveStructuredContentVersion(content.id, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.content.created",
    entityType: "help_content",
    entityId: content.id,
    metadata: { slug: content.slug, categoryCount: categories.length },
  });
  return content;
}

export async function updateStructuredHelpContent(
  actorUserId: string,
  contentId: string,
  input: StructuredHelpContentInput,
): Promise<void> {
  const content = await getContentRow(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

  const slug = normalizeHelpSlug(input.slug || input.title);
  if (!slug) throw new Error("INVALID_SLUG");
  const categories = await assertActiveCategories(input.categories);
  const db = getDatabase();

  await db.transaction(async (tx) => {
    await tx
      .update(helpContents)
      .set({
        slug,
        title: input.title.trim(),
        summary: input.summary.trim(),
        searchAliases: normalizeAliases(input.searchAliases),
        assistantKnowledge: input.assistantKnowledge.trim(),
        internalSupportNotes: input.internalSupportNotes.trim(),
        status: "draft",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(helpContents.id, contentId));
    await replaceContentCategories(tx, contentId, categories);
  });

  await saveStructuredContentVersion(contentId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.content.updated",
    entityType: "help_content",
    entityId: contentId,
    metadata: { slug, previousStatus: content.status, categoryCount: categories.length },
  });
}

export async function upsertStructuredHelpFeaturedVideo(
  actorUserId: string,
  contentId: string,
  input: StructuredHelpFeaturedVideoInput,
): Promise<void> {
  const db = getDatabase();
  const content = await getContentRow(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");
  if (!input.sourceUrl.trim()) throw new Error("FEATURED_VIDEO_URL_REQUIRED");

  const [currentFeatured] = await db
    .select({ assetId: helpContentFeaturedVideos.assetId })
    .from(helpContentFeaturedVideos)
    .where(eq(helpContentFeaturedVideos.contentId, contentId))
    .limit(1);

  let assetId = currentFeatured?.assetId ?? null;
  if (!assetId) {
    const legacyVideos = await getContentVideoBlocks(contentId);
    if (legacyVideos.length > 1) throw new Error("MULTIPLE_LEGACY_VIDEOS");
    assetId = legacyVideos[0]?.assetId ?? null;
  }

  await db.transaction(async (tx) => {
    const values = {
      assetType: "video" as const,
      sourceUrl: input.sourceUrl.trim(),
      altText: input.altText.trim(),
      subtitles: input.subtitles.trim(),
      assistantSummary: input.assistantSummary.trim(),
      assistantDescription: "",
      extractedText: "",
      updatedAt: new Date(),
    };

    if (assetId) {
      await tx.update(helpAssets).set(values).where(eq(helpAssets.id, assetId));
    } else {
      const [createdAsset] = await tx
        .insert(helpAssets)
        .values({
          contentId,
          ...values,
          createdBy: actorUserId,
        })
        .returning({ id: helpAssets.id });
      assetId = createdAsset?.id ?? null;
    }

    if (!assetId) throw new Error("FEATURED_VIDEO_NOT_CREATED");
    await tx
      .insert(helpContentFeaturedVideos)
      .values({ contentId, assetId })
      .onConflictDoUpdate({
        target: helpContentFeaturedVideos.contentId,
        set: { assetId, updatedAt: new Date() },
      });
  });

  await markContentDraft(contentId, actorUserId);
  await saveStructuredContentVersion(contentId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.content.featured_video.updated",
    entityType: "help_content",
    entityId: contentId,
    metadata: { assetId },
  });
}

export async function deleteStructuredHelpFeaturedVideo(
  actorUserId: string,
  contentId: string,
): Promise<void> {
  const db = getDatabase();
  const content = await getContentRow(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

  const [featured] = await db
    .select({ assetId: helpContentFeaturedVideos.assetId })
    .from(helpContentFeaturedVideos)
    .where(eq(helpContentFeaturedVideos.contentId, contentId))
    .limit(1);
  if (!featured) return;

  const stepRows = await db
    .select({ id: helpContentSteps.id })
    .from(helpContentSteps)
    .where(eq(helpContentSteps.contentId, contentId));
  const stepIds = stepRows.map((step) => step.id);

  await db.transaction(async (tx) => {
    if (stepIds.length > 0) {
      const mirrors = await tx
        .select({ id: helpStepBlocks.id, assetId: helpStepBlocks.assetId })
        .from(helpStepBlocks)
        .where(inArray(helpStepBlocks.stepId, stepIds));
      const mirrorIds = mirrors
        .filter((block) => block.assetId === featured.assetId)
        .map((block) => block.id);
      if (mirrorIds.length > 0) {
        await tx.delete(helpStepBlocks).where(inArray(helpStepBlocks.id, mirrorIds));
      }
    }
    await tx
      .delete(helpContentFeaturedVideos)
      .where(eq(helpContentFeaturedVideos.contentId, contentId));
    await tx.delete(helpAssets).where(eq(helpAssets.id, featured.assetId));
  });

  await markContentDraft(contentId, actorUserId);
  await saveStructuredContentVersion(contentId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.content.featured_video.deleted",
    entityType: "help_content",
    entityId: contentId,
    metadata: { assetId: featured.assetId },
  });
}

export async function addStructuredHelpStep(
  actorUserId: string,
  contentId: string,
): Promise<string> {
  const db = getDatabase();
  const content = await getContentRow(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

  const [{ value: currentMax }] = await db
    .select({ value: max(helpContentSteps.sortOrder) })
    .from(helpContentSteps)
    .where(eq(helpContentSteps.contentId, contentId));
  const sortOrder = Number(currentMax ?? 0) + 10;
  const stepNumber = Math.max(1, Math.round(sortOrder / 10));

  const [step] = await db
    .insert(helpContentSteps)
    .values({
      contentId,
      title: `Passo ${stepNumber}`,
      description: "",
      assistantKnowledge: "",
      sortOrder,
    })
    .returning({ id: helpContentSteps.id });
  if (!step) throw new Error("STEP_NOT_CREATED");

  await markContentDraft(contentId, actorUserId);
  await saveStructuredContentVersion(contentId, actorUserId);
  return step.id;
}

export async function updateStructuredHelpStep(
  actorUserId: string,
  contentId: string,
  stepId: string,
  input: StructuredHelpStepInput,
): Promise<void> {
  const step = await getStepRow(stepId);
  if (!step || step.contentId !== contentId) throw new Error("STEP_NOT_FOUND");

  await getDatabase()
    .update(helpContentSteps)
    .set({
      title: input.title.trim(),
      description: input.description.trim(),
      assistantKnowledge: input.assistantKnowledge.trim(),
      updatedAt: new Date(),
    })
    .where(eq(helpContentSteps.id, stepId));

  await markContentDraft(contentId, actorUserId);
  await saveStructuredContentVersion(contentId, actorUserId);
}

export async function deleteStructuredHelpStep(
  actorUserId: string,
  contentId: string,
  stepId: string,
): Promise<void> {
  const db = getDatabase();
  const steps = await db
    .select({ id: helpContentSteps.id })
    .from(helpContentSteps)
    .where(eq(helpContentSteps.contentId, contentId));
  if (steps.length <= 1) throw new Error("LAST_STEP_REQUIRED");
  if (!steps.some((step) => step.id === stepId)) throw new Error("STEP_NOT_FOUND");

  await db.delete(helpContentSteps).where(eq(helpContentSteps.id, stepId));
  await markContentDraft(contentId, actorUserId);
  await saveStructuredContentVersion(contentId, actorUserId);
}

function validateBlockInput(input: StructuredHelpBlockInput): void {
  if (input.blockType === "text" || input.blockType === "notice") {
    if (!input.textContent.trim()) throw new Error("BLOCK_TEXT_REQUIRED");
    return;
  }
  if (input.blockType === "link") {
    if (!input.linkUrl.trim() || !input.linkLabel.trim()) throw new Error("BLOCK_LINK_REQUIRED");
    return;
  }
  if (input.blockType === "file") {
    if (!input.sourceUrl.trim() && !input.extractedText.trim()) throw new Error("BLOCK_FILE_REQUIRED");
    return;
  }
  if (!input.sourceUrl.trim()) throw new Error("BLOCK_MEDIA_URL_REQUIRED");
}

async function createAssetForBlock(
  actorUserId: string,
  contentId: string,
  input: StructuredHelpBlockInput,
): Promise<string | null> {
  if (input.blockType !== "image" && input.blockType !== "video" && input.blockType !== "file") {
    return null;
  }

  const [asset] = await getDatabase()
    .insert(helpAssets)
    .values({
      contentId,
      assetType: input.blockType,
      sourceUrl: input.sourceUrl.trim() || null,
      altText: input.altText.trim(),
      assistantDescription: input.assistantDescription.trim(),
      subtitles: input.subtitles.trim(),
      assistantSummary: input.assistantSummary.trim(),
      extractedText: input.extractedText.trim(),
      createdBy: actorUserId,
    })
    .returning({ id: helpAssets.id });
  if (!asset) throw new Error("ASSET_NOT_CREATED");
  return asset.id;
}

export async function addStructuredHelpBlock(
  actorUserId: string,
  contentId: string,
  stepId: string,
  input: StructuredHelpBlockInput,
): Promise<void> {
  if (input.blockType === "video") throw new Error("VIDEO_BLOCK_NOT_ALLOWED");
  validateBlockInput(input);

  const db = getDatabase();
  const step = await getStepRow(stepId);
  if (!step || step.contentId !== contentId) throw new Error("STEP_NOT_FOUND");

  const [{ value: currentMax }] = await db
    .select({ value: max(helpStepBlocks.sortOrder) })
    .from(helpStepBlocks)
    .where(eq(helpStepBlocks.stepId, stepId));
  const sortOrder = Number(currentMax ?? 0) + 10;
  const assetId = await createAssetForBlock(actorUserId, contentId, input);

  await db.insert(helpStepBlocks).values({
    stepId,
    blockType: input.blockType,
    textContent: input.textContent.trim(),
    assetId,
    linkUrl: input.blockType === "link" ? input.linkUrl.trim() : null,
    linkLabel:
      input.blockType === "link" || input.blockType === "file"
        ? input.linkLabel.trim() || null
        : null,
    noticeVariant:
      input.blockType === "notice" ? input.noticeVariant.trim() || "info" : null,
    sortOrder,
  });

  await markContentDraft(contentId, actorUserId);
  await saveStructuredContentVersion(contentId, actorUserId);
}

export async function updateStructuredHelpBlock(
  actorUserId: string,
  contentId: string,
  blockId: string,
  input: StructuredHelpBlockInput,
): Promise<void> {
  const db = getDatabase();
  const block = await getBlockRow(blockId);
  if (!block) throw new Error("BLOCK_NOT_FOUND");
  const step = await getStepRow(block.stepId);
  if (!step || step.contentId !== contentId) throw new Error("BLOCK_NOT_FOUND");
  if (input.blockType === "video" && block.blockType !== "video") {
    throw new Error("VIDEO_BLOCK_NOT_ALLOWED");
  }
  validateBlockInput(input);

  let assetId = block.assetId;
  if (input.blockType === "image" || input.blockType === "video" || input.blockType === "file") {
    const values = {
      assetType: input.blockType,
      sourceUrl: input.sourceUrl.trim() || null,
      altText: input.altText.trim(),
      assistantDescription: input.assistantDescription.trim(),
      subtitles: input.subtitles.trim(),
      assistantSummary: input.assistantSummary.trim(),
      extractedText: input.extractedText.trim(),
      updatedAt: new Date(),
    };
    if (assetId) {
      await db.update(helpAssets).set(values).where(eq(helpAssets.id, assetId));
    } else {
      assetId = await createAssetForBlock(actorUserId, contentId, input);
    }
  } else {
    assetId = null;
  }

  await db
    .update(helpStepBlocks)
    .set({
      blockType: input.blockType,
      textContent: input.textContent.trim(),
      assetId,
      linkUrl: input.blockType === "link" ? input.linkUrl.trim() : null,
      linkLabel:
        input.blockType === "link" || input.blockType === "file"
          ? input.linkLabel.trim() || null
          : null,
      noticeVariant:
        input.blockType === "notice" ? input.noticeVariant.trim() || "info" : null,
      updatedAt: new Date(),
    })
    .where(eq(helpStepBlocks.id, blockId));

  await markContentDraft(contentId, actorUserId);
  await saveStructuredContentVersion(contentId, actorUserId);
}

export async function deleteStructuredHelpBlock(
  actorUserId: string,
  contentId: string,
  blockId: string,
): Promise<void> {
  const db = getDatabase();
  const block = await getBlockRow(blockId);
  if (!block) throw new Error("BLOCK_NOT_FOUND");
  const step = await getStepRow(block.stepId);
  if (!step || step.contentId !== contentId) throw new Error("BLOCK_NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx.delete(helpStepBlocks).where(eq(helpStepBlocks.id, blockId));
    if (block.assetId) await tx.delete(helpAssets).where(eq(helpAssets.id, block.assetId));
  });

  await markContentDraft(contentId, actorUserId);
  await saveStructuredContentVersion(contentId, actorUserId);
}

function buildPublicationSnapshot(
  content: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>,
) {
  return {
    public: {
      slug: content.slug,
      title: content.title,
      summary: content.summary,
      categories: content.categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        icon: category.icon,
        destinationUrl: category.effectiveDestinationUrl,
      })),
      featuredVideo: content.featuredVideo
        ? {
            id: content.featuredVideo.id,
            assetType: content.featuredVideo.assetType,
            sourceUrl: content.featuredVideo.sourceUrl,
            storageKey: content.featuredVideo.storageKey,
            altText: content.featuredVideo.altText,
          }
        : null,
      steps: content.steps.map((step) => ({
        id: step.id,
        title: step.title,
        description: step.description,
        sortOrder: step.sortOrder,
        blocks: step.blocks.map((block) => ({
          id: block.id,
          blockType: block.blockType,
          textContent: block.textContent,
          linkUrl: block.linkUrl,
          linkLabel: block.linkLabel,
          noticeVariant: block.noticeVariant,
          sortOrder: block.sortOrder,
          asset: block.asset
            ? {
                id: block.asset.id,
                assetType: block.asset.assetType,
                sourceUrl: block.asset.sourceUrl,
                storageKey: block.asset.storageKey,
                altText: block.asset.altText,
              }
            : null,
        })),
      })),
    },
    assistant: {
      searchAliases: content.searchAliases,
      knowledge: content.assistantKnowledge,
      featuredVideo: content.featuredVideo
        ? {
            assetId: content.featuredVideo.id,
            subtitles: content.featuredVideo.subtitles,
            summary: content.featuredVideo.assistantSummary,
          }
        : null,
      steps: content.steps.map((step) => ({
        id: step.id,
        title: step.title,
        knowledge: step.assistantKnowledge,
        media: step.blocks
          .filter((block) => block.asset)
          .map((block) => ({
            blockId: block.id,
            assistantDescription: block.asset?.assistantDescription ?? "",
            assistantSummary: block.asset?.assistantSummary ?? "",
            extractedText: block.asset?.extractedText ?? "",
          })),
      })),
    },
  };
}

function validateForPublication(
  content: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>,
): void {
  if (content.categories.length === 0 || content.categories.some((category) => !category.active)) {
    throw new Error("CONTENT_CATEGORY_REQUIRED");
  }
  if (content.legacyVideoCount > 0) throw new Error("LEGACY_VIDEO_REVIEW_REQUIRED");
  if (content.featuredVideo && !content.featuredVideo.subtitles.trim()) {
    throw new Error("FEATURED_VIDEO_SUBTITLES_REQUIRED");
  }
  if (content.steps.length === 0) throw new Error("CONTENT_STEP_REQUIRED");

  for (const step of content.steps) {
    if (!step.title.trim()) throw new Error("STEP_TITLE_REQUIRED");
    if (step.blocks.length === 0) throw new Error("STEP_BLOCK_REQUIRED");

    const meaningfulBlocks = step.blocks.filter((block) => {
      if (block.blockType === "text" || block.blockType === "notice") {
        return Boolean(block.textContent.trim());
      }
      if (block.blockType === "link") return Boolean(block.linkUrl && block.linkLabel);
      return Boolean(block.asset?.sourceUrl || block.asset?.storageKey || block.asset?.extractedText);
    });
    if (meaningfulBlocks.length === 0) throw new Error("STEP_BLOCK_REQUIRED");

    const images = step.blocks.filter((block) => block.blockType === "image");
    const hasOnlyImages = images.length > 0 && images.length === step.blocks.length;
    if (
      hasOnlyImages &&
      images.some(
        (block) =>
          !block.asset?.altText.trim() && !block.asset?.assistantDescription.trim(),
      )
    ) {
      throw new Error("IMAGE_DESCRIPTION_REQUIRED");
    }
  }
}

export async function publishStructuredHelpContent(
  actorUserId: string,
  contentId: string,
): Promise<void> {
  const db = getDatabase();
  const content = await getStructuredHelpContent(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

  validateForPublication(content);
  const snapshot = buildPublicationSnapshot(content);
  const publishedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(helpContents)
      .set({
        status: "published",
        publishedAt,
        updatedBy: actorUserId,
        updatedAt: publishedAt,
      })
      .where(eq(helpContents.id, contentId));

    await tx
      .insert(helpPublications)
      .values({
        entityType: "content",
        entityId: contentId,
        snapshot,
        publishedBy: actorUserId,
        publishedAt,
      })
      .onConflictDoUpdate({
        target: [helpPublications.entityType, helpPublications.entityId],
        set: { snapshot, publishedBy: actorUserId, publishedAt },
      });
  });

  await saveStructuredContentVersion(contentId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.content.published",
    entityType: "help_content",
    entityId: contentId,
    metadata: {
      stepCount: content.steps.length,
      categoryCount: content.categories.length,
      hasFeaturedVideo: Boolean(content.featuredVideo),
    },
  });
}
