import { eq } from "drizzle-orm";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import { helpContents } from "$lib/server/db/structuredHelpSchema";
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

  const publishedAt = new Date();
  const snapshot = {
    public: compileHelpPublicSnapshot(content),
    knowledge: compileHelpKnowledgeDocument(content),
  };
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

  await saveHelpContentVersion(
    "content",
    contentId,
    compileHelpVersionSnapshot(content, publishedAt),
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
      knowledgeVersion: snapshot.knowledge.version,
      knowledgeFragmentCount: snapshot.knowledge.fragments.length,
    },
  });
}
