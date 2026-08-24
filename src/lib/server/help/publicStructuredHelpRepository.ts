import { and, eq, sql } from "drizzle-orm";
import {
  parseHelpImageAnnotations,
  type HelpImageAnnotation,
} from "$lib/help/helpImageAnnotations";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";

export type PublishedHelpAsset = {
  id: string;
  assetType: "image" | "video" | "file";
  sourceUrl: string | null;
  storageKey: string | null;
  altText: string;
};

export type PublishedHelpCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  destinationUrl: string;
};

export type PublishedHelpBlock = {
  id: string;
  blockType: "text" | "image" | "notice" | "link" | "file";
  textContent: string;
  linkUrl: string | null;
  linkLabel: string | null;
  noticeVariant: string | null;
  sortOrder: number;
  annotations: HelpImageAnnotation[];
  asset: PublishedHelpAsset | null;
};

export type PublishedHelpStep = {
  id: string;
  title: string;
  description: string;
  sortOrder: number;
  blocks: PublishedHelpBlock[];
};

export type PublishedStructuredHelp = {
  contentId: string;
  slug: string;
  title: string;
  summary: string;
  quickGuide: string;
  categories: PublishedHelpCategory[];
  featuredVideo: PublishedHelpAsset | null;
  steps: PublishedHelpStep[];
  publishedAt: Date;
};

export type PublishedStructuredHelpSummary = {
  contentId: string;
  slug: string;
  title: string;
  summary: string;
  categories: PublishedHelpCategory[];
  stepCount: number;
  publishedAt: Date;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? (record[key] as string) : "";
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function parseAsset(value: unknown): PublishedHelpAsset | null {
  const record = asRecord(value);
  if (!record) return null;
  const assetType = readString(record, "assetType");
  if (assetType !== "image" && assetType !== "video" && assetType !== "file") return null;
  const id = readString(record, "id");
  if (!id) return null;
  return {
    id,
    assetType,
    sourceUrl: readString(record, "sourceUrl") || null,
    storageKey: readString(record, "storageKey") || null,
    altText: readString(record, "altText"),
  };
}

function parseCategory(value: unknown): PublishedHelpCategory | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id");
  const slug = readString(record, "slug");
  const name = readString(record, "name");
  if (!id || !slug || !name) return null;
  return {
    id,
    slug,
    name,
    description: readString(record, "description"),
    icon: readString(record, "icon"),
    destinationUrl: readString(record, "destinationUrl"),
  };
}

function parseBlock(value: unknown): PublishedHelpBlock | null {
  const record = asRecord(value);
  if (!record) return null;
  const blockType = readString(record, "blockType");
  if (!["text", "image", "notice", "link", "file"].includes(blockType)) return null;
  const id = readString(record, "id");
  if (!id) return null;
  return {
    id,
    blockType: blockType as PublishedHelpBlock["blockType"],
    textContent: readString(record, "textContent"),
    linkUrl: readString(record, "linkUrl") || null,
    linkLabel: readString(record, "linkLabel") || null,
    noticeVariant: readString(record, "noticeVariant") || null,
    sortOrder: typeof record.sortOrder === "number" ? record.sortOrder : 0,
    annotations: parseHelpImageAnnotations(record.annotations) ?? [],
    asset: parseAsset(record.asset),
  };
}

function parseStep(value: unknown): PublishedHelpStep | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id");
  const title = readString(record, "title");
  if (!id || !title) return null;
  const blocks = Array.isArray(record.blocks)
    ? record.blocks.map(parseBlock).filter((block): block is PublishedHelpBlock => Boolean(block))
    : [];
  return {
    id,
    title,
    description: readString(record, "description"),
    sortOrder: typeof record.sortOrder === "number" ? record.sortOrder : 0,
    blocks,
  };
}

function parsePublication(
  entityId: string,
  publishedAt: Date,
  snapshot: Record<string, unknown>,
): PublishedStructuredHelp | null {
  const publicSnapshot = asRecord(snapshot.public);
  if (!publicSnapshot) return null;
  const slug = readString(publicSnapshot, "slug");
  const title = readString(publicSnapshot, "title");
  if (!slug || !title) return null;

  const categories = Array.isArray(publicSnapshot.categories)
    ? publicSnapshot.categories.map(parseCategory).filter((category): category is PublishedHelpCategory => Boolean(category))
    : [];
  const steps = Array.isArray(publicSnapshot.steps)
    ? publicSnapshot.steps.map(parseStep).filter((step): step is PublishedHelpStep => Boolean(step))
    : [];
  const featuredVideo = parseAsset(publicSnapshot.featuredVideo);

  return {
    contentId: entityId,
    slug,
    title,
    summary: readString(publicSnapshot, "summary"),
    quickGuide: readString(publicSnapshot, "quickGuide"),
    categories,
    featuredVideo: featuredVideo?.assetType === "video" ? featuredVideo : null,
    steps,
    publishedAt,
  };
}

function publicationSearchText(content: PublishedStructuredHelp): string {
  return normalizeSearchText(
    [
      content.title,
      content.summary,
      content.quickGuide,
      ...content.categories.flatMap((category) => [category.slug, category.name, category.description]),
      ...content.steps.flatMap((step) => [
        step.title,
        step.description,
        ...step.blocks.flatMap((block) => [block.textContent, block.linkLabel ?? "", block.asset?.altText ?? ""]),
      ]),
    ].join(" "),
  );
}

export async function listPublishedStructuredHelpCatalog(query = ""): Promise<PublishedStructuredHelpSummary[]> {
  const rows = await getDatabase()
    .select({ entityId: helpPublications.entityId, snapshot: helpPublications.snapshot, publishedAt: helpPublications.publishedAt })
    .from(helpPublications)
    .where(eq(helpPublications.entityType, "content"));
  const terms = normalizeSearchText(query).split(" ").filter(Boolean);

  return rows
    .map((row) => parsePublication(row.entityId, row.publishedAt, row.snapshot))
    .filter((content): content is PublishedStructuredHelp => Boolean(content))
    .filter((content) => {
      if (terms.length === 0) return true;
      const searchable = publicationSearchText(content);
      return terms.every((term) => searchable.includes(term));
    })
    .map((content) => ({
      contentId: content.contentId,
      slug: content.slug,
      title: content.title,
      summary: content.summary,
      categories: content.categories,
      stepCount: content.steps.length,
      publishedAt: content.publishedAt,
    }))
    .sort((left, right) => {
      const leftCategory = left.categories[0]?.name ?? "";
      const rightCategory = right.categories[0]?.name ?? "";
      const categoryComparison = leftCategory.localeCompare(rightCategory, "pt-BR");
      return categoryComparison || left.title.localeCompare(right.title, "pt-BR");
    });
}

export async function listPublishedStructuredHelpLinks() {
  const rows = await getDatabase()
    .select({ entityId: helpPublications.entityId, snapshot: helpPublications.snapshot, publishedAt: helpPublications.publishedAt })
    .from(helpPublications)
    .where(eq(helpPublications.entityType, "content"));

  return rows.flatMap((row) => {
    const publicSnapshot = asRecord(row.snapshot.public);
    const slug = publicSnapshot ? readString(publicSnapshot, "slug") : "";
    return slug ? [{ entityId: row.entityId, slug, publishedAt: row.publishedAt }] : [];
  });
}

export async function getPublishedStructuredHelpBySlug(slug: string) {
  const [row] = await getDatabase()
    .select({ entityId: helpPublications.entityId, snapshot: helpPublications.snapshot, publishedAt: helpPublications.publishedAt })
    .from(helpPublications)
    .where(
      and(
        eq(helpPublications.entityType, "content"),
        sql`${helpPublications.snapshot}->'public'->>'slug' = ${slug}`,
      ),
    )
    .limit(1);
  return row ? parsePublication(row.entityId, row.publishedAt, row.snapshot) : null;
}

export async function isAssetPublishedForSlug(slug: string, assetId: string): Promise<boolean> {
  const content = await getPublishedStructuredHelpBySlug(slug);
  if (!content) return false;
  if (content.featuredVideo?.id === assetId && Boolean(content.featuredVideo.storageKey)) return true;
  return content.steps.some((step) =>
    step.blocks.some((block) => block.asset?.id === assetId && Boolean(block.asset.storageKey)),
  );
}
