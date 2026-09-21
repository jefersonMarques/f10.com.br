import { asc, sql } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpContents } from "$lib/server/db/structuredHelpSchema";
import { getPublicHelpCollectionBySlug } from "$lib/server/help/helpCollectionRepository";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

export type HelpArticleSequenceItem = {
  contentId: string;
  sortOrder: number;
};

export type PublicHelpArticleNavigationItem = {
  contentId: string;
  slug: string;
  title: string;
};

export type PublicHelpArticleNavigation = {
  context: "global" | "collection";
  collection: { slug: string; title: string } | null;
  previous: PublicHelpArticleNavigationItem | null;
  next: PublicHelpArticleNavigationItem | null;
};

export type HelpArticleMoveDirection = "up" | "down";

export async function listHelpArticleSequence(): Promise<HelpArticleSequenceItem[]> {
  return getDatabase()
    .select({
      contentId: helpContents.id,
      sortOrder: sql<number>`"help_contents"."sort_order"`,
    })
    .from(helpContents)
    .orderBy(
      sql`"help_contents"."sort_order"`,
      asc(helpContents.title),
      asc(helpContents.id),
    );
}

export async function moveHelpArticle(
  actorUserId: string,
  contentId: string,
  direction: HelpArticleMoveDirection,
): Promise<void> {
  const db = getDatabase();
  const rows = await db
    .select({
      id: helpContents.id,
      sortOrder: sql<number>`"help_contents"."sort_order"`,
    })
    .from(helpContents)
    .orderBy(
      sql`"help_contents"."sort_order"`,
      asc(helpContents.title),
      asc(helpContents.id),
    );

  const index = rows.findIndex((item) => item.id === contentId);
  if (index < 0) throw new Error("CONTENT_NOT_FOUND");

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  const current = rows[index];
  const target = rows[targetIndex];
  if (!current || !target) return;

  await db.transaction(async (tx) => {
    await tx.execute(sql`
      UPDATE "help_contents"
      SET "sort_order" = ${target.sortOrder}
      WHERE "id" = ${current.id}
    `);
    await tx.execute(sql`
      UPDATE "help_contents"
      SET "sort_order" = ${current.sortOrder}
      WHERE "id" = ${target.id}
    `);
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.content.moved",
    entityType: "help_content",
    entityId: contentId,
    metadata: { direction },
  });
}

function navigationAround(
  items: PublicHelpArticleNavigationItem[],
  contentId: string,
): Pick<PublicHelpArticleNavigation, "previous" | "next"> | null {
  const index = items.findIndex((item) => item.contentId === contentId);
  if (index < 0) return null;
  return {
    previous: items[index - 1] ?? null,
    next: items[index + 1] ?? null,
  };
}

export async function getPublicHelpArticleNavigation(
  contentId: string,
  collectionSlug: string | null = null,
): Promise<PublicHelpArticleNavigation> {
  if (collectionSlug) {
    const collection = await getPublicHelpCollectionBySlug(collectionSlug);
    if (collection) {
      const collectionNavigation = navigationAround(collection.items, contentId);
      if (collectionNavigation) {
        return {
          context: "collection",
          collection: { slug: collection.slug, title: collection.title },
          ...collectionNavigation,
        };
      }
    }
  }

  const [sequence, publishedCatalog] = await Promise.all([
    listHelpArticleSequence(),
    listPublishedStructuredHelpCatalog(),
  ]);
  const publishedById = new Map(
    publishedCatalog.map((item) => [item.contentId, item]),
  );
  const items = sequence.flatMap((item) => {
    const published = publishedById.get(item.contentId);
    return published
      ? [{ contentId: published.contentId, slug: published.slug, title: published.title }]
      : [];
  });
  const globalNavigation = navigationAround(items, contentId) ?? {
    previous: null,
    next: null,
  };

  return {
    context: "global",
    collection: null,
    ...globalNavigation,
  };
}
