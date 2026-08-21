import { and, eq, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";

export type PublishedHelpAsset = {
  id: string;
  assetType: "image" | "video" | "file";
  sourceUrl: string | null;
  storageKey: string | null;
  altText: string;
};

export type PublishedHelpBlock = {
  id: string;
  blockType: "text" | "image" | "video" | "notice" | "link" | "file";
  textContent: string;
  linkUrl: string | null;
  linkLabel: string | null;
  noticeVariant: string | null;
  sortOrder: number;
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
  category: string;
  featuredVideo: PublishedHelpAsset | null;
  steps: PublishedHelpStep[];
  publishedAt: Date;
};

export type PublishedStructuredHelpSummary = {
  contentId: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  stepCount: number;
  publishedAt: Date;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key] as string : "";
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

function parseBlock(value: unknown): PublishedHelpBlock | null {
  const record = asRecord(value);
  if (!record) return null;
  const blockType = readString(record, "blockType");
  if (!["text", "image", "video", "notice", "link", "file"].includes(blockType)) return null;
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

function normalizeFeaturedVideo(
  publicSnapshot: Record<string, unknown>,
  steps: PublishedHelpStep[],
): { featuredVideo: PublishedHelpAsset | null; steps: PublishedHelpStep[] } {
  const explicitFeaturedVideo = parseAsset(publicSnapshot.featuredVideo);
  const legacyFeaturedVideo = steps
    .flatMap((step) => step.blocks)
    .find((block) => block.blockType === "video" && block.asset?.assetType === "video")
    ?.asset ?? null;

  return {
    featuredVideo: explicitFeaturedVideo?.assetType === "video"
      ? explicitFeaturedVideo
      : legacyFeaturedVideo,
    steps: steps.map((step) => ({
      ...step,
      // Publicações v1 podiam conter vários vídeos em passos. A experiência pública
      // passa a exibir somente um vídeo principal no topo sem destruir o snapshot.
      blocks: step.blocks.filter((block) => block.blockType !== "video"),
    })),
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
  const parsedSteps = Array.isArray(publicSnapshot.steps)
    ? publicSnapshot.steps.map(parseStep).filter((step): step is PublishedHelpStep => Boolean(step))
    : [];
  const normalized = normalizeFeaturedVideo(publicSnapshot, parsedSteps);

  return {
    contentId: entityId,
    slug,
    title,
    summary: readString(publicSnapshot, "summary"),
    category: readString(publicSnapshot, "category"),
    featuredVideo: normalized.featuredVideo,
    steps: normalized.steps,
    publishedAt,
  };
}

function publicationSearchText(content: PublishedStructuredHelp): string {
  return normalizeSearchText([
    content.title,
    content.summary,
    content.category,
    ...content.steps.flatMap((step) => [
      step.title,
      step.description,
      ...step.blocks.map((block) => block.textContent),
    ]),
  ].join(" "));
}

export async function listPublishedStructuredHelpCatalog(
  query = "",
): Promise<PublishedStructuredHelpSummary[]> {
  const db = getDatabase();
  const rows = await db
    .select({
      entityId: helpPublications.entityId,
      snapshot: helpPublications.snapshot,
      publishedAt: helpPublications.publishedAt,
    })
    .from(helpPublications)
    .where(eq(helpPublications.entityType, "content"));

  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery.split(" ").filter(Boolean);

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
      category: content.category,
      stepCount: content.steps.length,
      publishedAt: content.publishedAt,
    }))
    .sort((left, right) => {
      const categoryComparison = left.category.localeCompare(right.category, "pt-BR");
      if (categoryComparison !== 0) return categoryComparison;
      return left.title.localeCompare(right.title, "pt-BR");
    });
}

export async function listPublishedStructuredHelpLinks() {
  const db = getDatabase();
  const rows = await db
    .select({
      entityId: helpPublications.entityId,
      snapshot: helpPublications.snapshot,
      publishedAt: helpPublications.publishedAt,
    })
    .from(helpPublications)
    .where(eq(helpPublications.entityType, "content"));

  return rows.flatMap((row) => {
    const publicSnapshot = asRecord(row.snapshot.public);
    const slug = publicSnapshot ? readString(publicSnapshot, "slug") : "";
    return slug ? [{ entityId: row.entityId, slug, publishedAt: row.publishedAt }] : [];
  });
}

export async function getPublishedStructuredHelpBySlug(slug: string) {
  const db = getDatabase();
  const [row] = await db
    .select({
      entityId: helpPublications.entityId,
      snapshot: helpPublications.snapshot,
      publishedAt: helpPublications.publishedAt,
    })
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
  if (content.featuredVideo?.id === assetId && Boolean(content.featuredVideo.storageKey)) {
    return true;
  }
  return content.steps.some((step) =>
    step.blocks.some((block) => block.asset?.id === assetId && Boolean(block.asset.storageKey)),
  );
}
