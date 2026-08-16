import { and, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpContentVersions } from "$lib/server/db/schema";
import { helpPublications } from "$lib/server/db/helpPublications";
import { helpSearchDocuments } from "$lib/server/db/helpSearchSchema";
import { helpContents } from "$lib/server/db/structuredHelpSchema";

async function getContent(contentId: string) {
  const [content] = await getDatabase()
    .select({
      id: helpContents.id,
      slug: helpContents.slug,
      title: helpContents.title,
      status: helpContents.status,
      publishedAt: helpContents.publishedAt,
    })
    .from(helpContents)
    .where(eq(helpContents.id, contentId))
    .limit(1);

  return content ?? null;
}

async function hasPublication(contentId: string): Promise<boolean> {
  const [publication] = await getDatabase()
    .select({ entityId: helpPublications.entityId })
    .from(helpPublications)
    .where(
      and(
        eq(helpPublications.entityType, "content"),
        eq(helpPublications.entityId, contentId),
      ),
    )
    .limit(1);

  return Boolean(publication);
}

export async function discardStructuredHelpContent(
  actorUserId: string,
  contentId: string,
): Promise<void> {
  const db = getDatabase();
  const content = await getContent(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");

  if (content.publishedAt || (await hasPublication(contentId))) {
    throw new Error("CONTENT_ALREADY_PUBLISHED");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(helpContentVersions)
      .where(
        and(
          eq(helpContentVersions.entityType, "content"),
          eq(helpContentVersions.entityId, contentId),
        ),
      );
    await tx.delete(helpContents).where(eq(helpContents.id, contentId));
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.content.discarded",
    entityType: "help_content",
    entityId: contentId,
    metadata: { slug: content.slug, title: content.title },
  });
}

export async function archiveStructuredHelpContent(
  actorUserId: string,
  contentId: string,
): Promise<void> {
  const db = getDatabase();
  const content = await getContent(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") return;

  const published = content.publishedAt || (await hasPublication(contentId));
  if (!published) throw new Error("CONTENT_NEVER_PUBLISHED");

  const archivedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .delete(helpPublications)
      .where(
        and(
          eq(helpPublications.entityType, "content"),
          eq(helpPublications.entityId, contentId),
        ),
      );

    await tx
      .delete(helpSearchDocuments)
      .where(eq(helpSearchDocuments.contentId, contentId));

    await tx
      .update(helpContents)
      .set({
        status: "archived",
        updatedBy: actorUserId,
        updatedAt: archivedAt,
      })
      .where(eq(helpContents.id, contentId));
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.content.archived",
    entityType: "help_content",
    entityId: contentId,
    metadata: {
      slug: content.slug,
      title: content.title,
      previousStatus: content.status,
      publishedAt: content.publishedAt?.toISOString() ?? null,
    },
  });
}
