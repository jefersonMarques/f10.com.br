import { and, asc, eq, inArray } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import {
  helpCollectionItems,
  helpCollections,
  helpContents,
} from "$lib/server/db/structuredHelpSchema";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

const MAX_COLLECTION_ITEMS = 100;

export type HelpCollectionItemSummary = {
  contentId: string;
  title: string;
  slug: string;
  status: string;
  sortOrder: number;
  published: boolean;
};

export type HelpCollectionSummary = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  active: boolean;
  items: HelpCollectionItemSummary[];
};

export function normalizeHelpCollectionSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeContentIds(contentIds: string[]): string[] {
  const normalized = Array.from(new Set(contentIds.filter(Boolean)));
  if (normalized.length < 1 || normalized.length > MAX_COLLECTION_ITEMS) {
    throw new Error("HELP_COLLECTION_ITEMS_INVALID");
  }
  return normalized;
}

async function assertPublishedContentIds(contentIds: string[]): Promise<string[]> {
  const normalized = normalizeContentIds(contentIds);
  const rows = await getDatabase()
    .select({ entityId: helpPublications.entityId })
    .from(helpPublications)
    .where(
      and(
        eq(helpPublications.entityType, "content"),
        inArray(helpPublications.entityId, normalized),
      ),
    );

  if (rows.length !== normalized.length) {
    throw new Error("HELP_COLLECTION_CONTENT_NOT_PUBLISHED");
  }
  return normalized;
}

export async function listHelpCollections(): Promise<HelpCollectionSummary[]> {
  const db = getDatabase();
  const [collections, items, publications] = await Promise.all([
    db
      .select({
        id: helpCollections.id,
        slug: helpCollections.slug,
        title: helpCollections.title,
        description: helpCollections.description,
        sortOrder: helpCollections.sortOrder,
        active: helpCollections.active,
      })
      .from(helpCollections)
      .orderBy(asc(helpCollections.sortOrder), asc(helpCollections.title)),
    db
      .select({
        collectionId: helpCollectionItems.collectionId,
        contentId: helpCollectionItems.contentId,
        title: helpContents.title,
        slug: helpContents.slug,
        status: helpContents.status,
        sortOrder: helpCollectionItems.sortOrder,
      })
      .from(helpCollectionItems)
      .innerJoin(helpContents, eq(helpContents.id, helpCollectionItems.contentId))
      .orderBy(
        asc(helpCollectionItems.collectionId),
        asc(helpCollectionItems.sortOrder),
        asc(helpContents.title),
      ),
    db
      .select({ entityId: helpPublications.entityId })
      .from(helpPublications)
      .where(eq(helpPublications.entityType, "content")),
  ]);

  const publishedIds = new Set(publications.map((row) => row.entityId));
  const itemsByCollection = new Map<string, HelpCollectionItemSummary[]>();
  for (const item of items) {
    const current = itemsByCollection.get(item.collectionId) ?? [];
    current.push({
      contentId: item.contentId,
      title: item.title,
      slug: item.slug,
      status: item.status,
      sortOrder: item.sortOrder,
      published: publishedIds.has(item.contentId),
    });
    itemsByCollection.set(item.collectionId, current);
  }

  return collections.map((collection) => ({
    ...collection,
    items: itemsByCollection.get(collection.id) ?? [],
  }));
}

export async function saveHelpCollection(
  actorUserId: string,
  input: {
    collectionId: string | null;
    title: string;
    slug: string;
    description: string;
    sortOrder: number;
    active: boolean;
    contentIds: string[];
  },
): Promise<string> {
  const title = input.title.trim().slice(0, 160);
  const slug = normalizeHelpCollectionSlug(input.slug || title);
  const description = input.description.trim().slice(0, 600);
  if (title.length < 2 || !slug) throw new Error("HELP_COLLECTION_INVALID");

  const contentIds = await assertPublishedContentIds(input.contentIds);
  const sortOrder = Number.isFinite(input.sortOrder)
    ? Math.min(Math.max(Math.round(input.sortOrder), 0), 10000)
    : 10;
  const db = getDatabase();

  const collectionId = await db.transaction(async (tx) => {
    let id = input.collectionId;

    if (id) {
      const [updated] = await tx
        .update(helpCollections)
        .set({
          title,
          slug,
          description,
          sortOrder,
          active: input.active,
          updatedBy: actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(helpCollections.id, id))
        .returning({ id: helpCollections.id });
      if (!updated) throw new Error("HELP_COLLECTION_NOT_FOUND");
    } else {
      const [created] = await tx
        .insert(helpCollections)
        .values({
          title,
          slug,
          description,
          sortOrder,
          active: input.active,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .returning({ id: helpCollections.id });
      if (!created) throw new Error("HELP_COLLECTION_NOT_CREATED");
      id = created.id;
    }

    await tx
      .delete(helpCollectionItems)
      .where(eq(helpCollectionItems.collectionId, id));

    await tx.insert(helpCollectionItems).values(
      contentIds.map((contentId, index) => ({
        collectionId: id!,
        contentId,
        sortOrder: (index + 1) * 10,
      })),
    );

    return id;
  });

  await recordAuditEvent({
    actorUserId,
    action: input.collectionId ? "help.collection.updated" : "help.collection.created",
    entityType: "help_collection",
    entityId: collectionId,
    metadata: {
      slug,
      active: input.active,
      itemCount: contentIds.length,
    },
  });

  return collectionId;
}

export type PublicHelpCollection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  items: Array<{
    contentId: string;
    slug: string;
    title: string;
  }>;
};

export async function listPublicHelpCollections(): Promise<PublicHelpCollection[]> {
  const [collections, catalog] = await Promise.all([
    listHelpCollections(),
    listPublishedStructuredHelpCatalog(),
  ]);
  const publishedById = new Map(catalog.map((content) => [content.contentId, content]));

  return collections
    .filter((collection) => collection.active)
    .map((collection) => ({
      id: collection.id,
      slug: collection.slug,
      title: collection.title,
      description: collection.description,
      items: collection.items.flatMap((item) => {
        const published = publishedById.get(item.contentId);
        return published
          ? [{
              contentId: published.contentId,
              slug: published.slug,
              title: published.title,
            }]
          : [];
      }),
    }))
    .filter((collection) => collection.items.length > 0);
}

export async function getPublicHelpCollectionBySlug(
  slug: string,
): Promise<PublicHelpCollection | null> {
  const normalized = normalizeHelpCollectionSlug(slug);
  if (!normalized) return null;
  const collections = await listPublicHelpCollections();
  return collections.find((collection) => collection.slug === normalized) ?? null;
}
