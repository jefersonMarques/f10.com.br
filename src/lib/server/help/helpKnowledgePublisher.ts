import { eq } from "drizzle-orm";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { readHelpImageAnnotationsFromMetadata } from "$lib/help/helpImageAnnotations";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import { helpContents } from "$lib/server/db/structuredHelpSchema";
import { cleanupObsoleteImportedHelpAssets } from "$lib/server/help/helpImportedAssetCleanup";
import {
  compileHelpKnowledgeDocument,
  compileHelpPublicSnapshot,
  compileHelpVersionSnapshot,
  validateHelpKnowledgePublication,
} from "$lib/server/help/helpKnowledgeCompiler";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";
import { saveHelpContentVersion } from "$lib/server/help/helpVersionRepository";

export async function publishHelpKnowledgeContent(
  actorUserId: string,
  contentId: string,
): Promise<void> {
  const content = await getStructuredHelpContent(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");
  if (content.categories.some((category) => category.slug === UNCATEGORIZED_HELP_CATEGORY_SLUG)) {
    throw new Error("CONTENT_REAL_CATEGORY_REQUIRED");
  }

  validateHelpKnowledgePublication(content);

  const annotationsByBlockId = new Map(
    content.steps.flatMap((step) =>
      step.blocks.map((block) => [
        block.id,
        readHelpImageAnnotationsFromMetadata(block.metadata),
      ] as const),
    ),
  );
  const publishedAt = new Date();
  const compiledPublicSnapshot = compileHelpPublicSnapshot(content);
  const publicSnapshot = {
    ...compiledPublicSnapshot,
    quickGuide: content.quickGuide,
    steps: compiledPublicSnapshot.steps.map((step) => ({
      ...step,
      blocks: step.blocks.map((block) => ({
        ...block,
        annotations: annotationsByBlockId.get(block.id) ?? [],
      })),
    })),
  };
  const knowledge = compileHelpKnowledgeDocument(content);
  if (content.quickGuide.trim()) {
    const quickGuide = content.quickGuide.trim();
    knowledge.fragments.splice(1, 0, {
      id: `quick-guide:${content.id}`,
      targetType: "article",
      stepId: null,
      blockId: null,
      anchor: "help-quick-guide",
      publicText: quickGuide,
      assistantKnowledge: "",
      searchText: quickGuide,
    });
  }
  const snapshot = { public: publicSnapshot, knowledge };
  const db = getDatabase();

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

  const compiledVersionSnapshot = compileHelpVersionSnapshot(content, publishedAt);
  await saveHelpContentVersion(
    "content",
    contentId,
    {
      ...compiledVersionSnapshot,
      quickGuide: content.quickGuide,
      steps: compiledVersionSnapshot.steps.map((step) => ({
        ...step,
        blocks: step.blocks.map((block) => ({
          ...block,
          annotations: annotationsByBlockId.get(block.id) ?? [],
        })),
      })),
    },
    actorUserId,
  );

  await recordAuditEvent({
    actorUserId,
    action: "help.content.published",
    entityType: "help_content",
    entityId: contentId,
    metadata: {
      stepCount: content.steps.length,
      categoryCount: content.categories.length,
      hasFeaturedVideo: Boolean(content.featuredVideo),
      hasQuickGuide: Boolean(content.quickGuide.trim()),
      imageAnnotationCount: Array.from(annotationsByBlockId.values()).reduce(
        (total, annotations) => total + annotations.length,
        0,
      ),
      knowledgeVersion: snapshot.knowledge.version,
      knowledgeFragmentCount: snapshot.knowledge.fragments.length,
    },
  });

  await cleanupObsoleteImportedHelpAssets(contentId).catch(() => undefined);
}
