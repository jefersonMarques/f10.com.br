import { and, asc, eq, inArray, max } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import {
  helpAssets,
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
  | "link";

export type StructuredHelpContentInput = {
  title: string;
  slug: string;
  summary: string;
  category: string;
  aiGeneralKnowledge: string;
};

export type StructuredHelpStepInput = {
  title: string;
  description: string;
  aiKnowledge: string;
};

export type StructuredHelpBlockInput = {
  blockType: StructuredHelpBlockType;
  textContent: string;
  sourceUrl: string;
  altText: string;
  transcript: string;
  aiSummary: string;
  linkUrl: string;
  linkLabel: string;
  noticeVariant: string;
};

export type StructuredHelpFeaturedVideoInput = {
  sourceUrl: string;
  altText: string;
  transcript: string;
  aiSummary: string;
};

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
      category: helpContents.category,
      status: helpContents.status,
      publishedAt: helpContents.publishedAt,
      updatedAt: helpContents.updatedAt,
    })
    .from(helpContents)
    .orderBy(asc(helpContents.title));

  const stepRows = await db
    .select({ contentId: helpContentSteps.contentId })
    .from(helpContentSteps);
  const stepCount = new Map<string, number>();

  for (const step of stepRows) {
    stepCount.set(step.contentId, (stepCount.get(step.contentId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    ...row,
    stepCount: stepCount.get(row.id) ?? 0,
  }));
}

export async function getStructuredHelpContent(contentId: string) {
  const db = getDatabase();
  const content = await getContentRow(contentId);
  if (!content) return null;

  const [steps, publication, featuredRows] = await Promise.all([
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
      [
        ...allBlocks.map((block) => block.assetId),
        featuredAssetId,
      ].filter((assetId): assetId is string => Boolean(assetId)),
    ),
  );
  const assetsById = new Map<string, typeof helpAssets.$inferSelect>();

  if (assetIds.length > 0) {
    const assets = await db
      .select()
      .from(helpAssets)
      .where(inArray(helpAssets.id, assetIds));
    for (const asset of assets) assetsById.set(asset.id, asset);
  }

  const legacyVideoCount = allBlocks.filter(
    (block) =>
      block.blockType === "video" &&
      (!featuredAssetId || block.assetId !== featuredAssetId),
  ).length;

  return {
    ...content,
    featuredVideo: featuredAssetId
      ? (assetsById.get(featuredAssetId) ?? null)
      : null,
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
    transcript: asset.transcript,
    aiSummary: asset.aiSummary,
  };
}

async function buildVersionSnapshot(contentId: string) {
  const content = await getStructuredHelpContent(contentId);
  if (!content) return null;

  return {
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    category: content.category,
    aiGeneralKnowledge: content.aiGeneralKnowledge,
    featuredVideo: serializeAsset(content.featuredVideo),
    status: content.status,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    steps: content.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      aiKnowledge: step.aiKnowledge,
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

  const content = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(helpContents)
      .values({
        slug,
        title: input.title.trim(),
        summary: input.summary.trim(),
        category: input.category.trim(),
        aiGeneralKnowledge: input.aiGeneralKnowledge.trim(),
        status: "draft",
        createdBy: actorUserId,
        updatedBy: actorUserId,
      })
      .returning({ id: helpContents.id, slug: helpContents.slug });

    if (!created) throw new Error("CONTENT_NOT_CREATED");

    await tx.insert(helpContentSteps).values({
      contentId: created.id,
      title: "Passo 1",
      description: "",
      aiKnowledge: "",
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
    metadata: { slug: content.slug },
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

  await getDatabase()
    .update(helpContents)
    .set({
      slug,
      title: input.title.trim(),
      summary: input.summary.trim(),
      category: input.category.trim(),
      aiGeneralKnowledge: input.aiGeneralKnowledge.trim(),
      status: "draft",
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(helpContents.id, contentId));

  await saveStructuredContentVersion(contentId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.content.updated",
    entityType: "help_content",
    entityId: contentId,
    metadata: { slug, previousStatus: content.status },
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
    if (assetId) {
      await tx
        .update(helpAssets)
        .set({
          assetType: "video",
          sourceUrl: input.sourceUrl.trim(),
          altText: input.altText.trim(),
          transcript: input.transcript.trim(),
          aiSummary: input.aiSummary.trim(),
          updatedAt: new Date(),
        })
        .where(eq(helpAssets.id, assetId));
    } else {
      const [createdAsset] = await tx
        .insert(helpAssets)
        .values({
          contentId,
          assetType: "video",
          sourceUrl: input.sourceUrl.trim(),
          altText: input.altText.trim(),
          transcript: input.transcript.trim(),
          aiSummary: input.aiSummary.trim(),
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
        .filter(
          (block) =>
            block.assetId === featured.assetId,
        )
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
      aiKnowledge: "",
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
      aiKnowledge: input.aiKnowledge.trim(),
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
    if (!input.linkUrl.trim() || !input.linkLabel.trim()) {
      throw new Error("BLOCK_LINK_REQUIRED");
    }
    return;
  }

  if (!input.sourceUrl.trim()) throw new Error("BLOCK_MEDIA_URL_REQUIRED");
}

async function createAssetForBlock(
  actorUserId: string,
  contentId: string,
  input: StructuredHelpBlockInput,
): Promise<string | null> {
  if (input.blockType !== "image" && input.blockType !== "video") return null;

  const [asset] = await getDatabase()
    .insert(helpAssets)
    .values({
      contentId,
      assetType: input.blockType,
      sourceUrl: input.sourceUrl.trim(),
      altText: input.altText.trim(),
      transcript: input.transcript.trim(),
      aiSummary: input.aiSummary.trim(),
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
    linkLabel: input.blockType === "link" ? input.linkLabel.trim() : null,
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
  if (input.blockType === "image" || input.blockType === "video") {
    if (assetId) {
      await db
        .update(helpAssets)
        .set({
          assetType: input.blockType,
          sourceUrl: input.sourceUrl.trim(),
          altText: input.altText.trim(),
          transcript: input.transcript.trim(),
          aiSummary: input.aiSummary.trim(),
          updatedAt: new Date(),
        })
        .where(eq(helpAssets.id, assetId));
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
      linkLabel: input.blockType === "link" ? input.linkLabel.trim() : null,
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
    if (block.assetId) {
      await tx.delete(helpAssets).where(eq(helpAssets.id, block.assetId));
    }
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
      category: content.category,
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
    ai: {
      generalKnowledge: content.aiGeneralKnowledge,
      featuredVideoKnowledge: content.featuredVideo
        ? {
            assetId: content.featuredVideo.id,
            transcript: content.featuredVideo.transcript,
            summary: content.featuredVideo.aiSummary,
          }
        : null,
      steps: content.steps.map((step) => ({
        id: step.id,
        title: step.title,
        knowledge: step.aiKnowledge,
        mediaKnowledge: step.blocks
          .filter((block) => block.asset)
          .map((block) => ({
            blockId: block.id,
            transcript: block.asset?.transcript ?? "",
            summary: block.asset?.aiSummary ?? "",
          })),
      })),
    },
  };
}

function validateForPublication(
  content: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>,
): void {
  if (content.legacyVideoCount > 0) throw new Error("LEGACY_VIDEO_REVIEW_REQUIRED");
  if (content.steps.length === 0) throw new Error("CONTENT_STEP_REQUIRED");

  for (const step of content.steps) {
    if (!step.title.trim()) throw new Error("STEP_TITLE_REQUIRED");
    if (step.blocks.length === 0) throw new Error("STEP_BLOCK_REQUIRED");

    const meaningfulBlocks = step.blocks.filter((block) => {
      if (block.blockType === "text" || block.blockType === "notice") {
        return Boolean(block.textContent.trim());
      }
      if (block.blockType === "link") {
        return Boolean(block.linkUrl && block.linkLabel);
      }
      return Boolean(block.asset?.sourceUrl || block.asset?.storageKey);
    });

    if (meaningfulBlocks.length === 0) throw new Error("STEP_BLOCK_REQUIRED");

    const hasOnlyMedia = step.blocks.every(
      (block) => block.blockType === "image",
    );
    if (hasOnlyMedia) {
      const mediaHasKnowledge = step.blocks.some(
        (block) =>
          Boolean(block.asset?.transcript.trim()) ||
          Boolean(block.asset?.aiSummary.trim()),
      );
      if (!step.aiKnowledge.trim() && !mediaHasKnowledge) {
        throw new Error("MEDIA_AI_KNOWLEDGE_REQUIRED");
      }
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
        set: {
          snapshot,
          publishedBy: actorUserId,
          publishedAt,
        },
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
      hasFeaturedVideo: Boolean(content.featuredVideo),
    },
  });
}
