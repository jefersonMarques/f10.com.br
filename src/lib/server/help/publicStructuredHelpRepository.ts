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
  steps: PublishedHelpStep[];
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
  const steps = Array.isArray(publicSnapshot.steps)
    ? publicSnapshot.steps.map(parseStep).filter((step): step is PublishedHelpStep => Boolean(step))
    : [];
  return {
    contentId: entityId,
    slug,
    title,
    summary: readString(publicSnapshot, "summary"),
    category: readString(publicSnapshot, "category"),
    steps,
    publishedAt,
  };
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
  return content.steps.some((step) =>
    step.blocks.some((block) => block.asset?.id === assetId && Boolean(block.asset.storageKey)),
  );
}
