import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { helpArticles, helpContentStatus, users } from "$lib/server/db/schema";

export const helpBlockType = pgEnum("help_block_type", [
  "text",
  "image",
  "video",
  "notice",
  "link",
  "file",
]);

export const helpAssetType = pgEnum("help_asset_type", [
  "image",
  "video",
  "file",
]);

export const helpCategories = pgTable(
  "help_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    icon: text("icon").notNull().default(""),
    destinationUrl: text("destination_url").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(10),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_categories_slug_unique").on(table.slug),
    index("help_categories_active_order_idx").on(table.active, table.sortOrder),
  ],
);

export const helpContents = pgTable(
  "help_contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    searchAliases: jsonb("search_aliases").$type<string[]>().notNull().default([]),
    assistantKnowledge: text("assistant_knowledge").notNull().default(""),
    internalSupportNotes: text("internal_support_notes").notNull().default(""),
    status: helpContentStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    legacyArticleId: uuid("legacy_article_id").references(() => helpArticles.id, { onDelete: "set null" }),
    importSource: text("import_source"),
    importExternalId: text("import_external_id"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_contents_slug_unique").on(table.slug),
    uniqueIndex("help_contents_legacy_article_unique").on(table.legacyArticleId),
    uniqueIndex("help_contents_import_identity_unique").on(table.importSource, table.importExternalId),
    index("help_contents_status_idx").on(table.status),
    index("help_contents_updated_idx").on(table.updatedAt),
    index("help_contents_import_source_idx").on(table.importSource),
  ],
);

export const helpContentCategories = pgTable(
  "help_content_categories",
  {
    contentId: uuid("content_id")
      .notNull()
      .references(() => helpContents.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => helpCategories.id, { onDelete: "restrict" }),
    destinationUrl: text("destination_url").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.contentId, table.categoryId] }),
    index("help_content_categories_category_idx").on(table.categoryId, table.sortOrder),
    index("help_content_categories_content_idx").on(table.contentId, table.sortOrder),
  ],
);

export const helpContentSteps = pgTable(
  "help_content_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id").notNull().references(() => helpContents.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    assistantKnowledge: text("assistant_knowledge").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_content_steps_order_unique").on(table.contentId, table.sortOrder),
    index("help_content_steps_content_idx").on(table.contentId, table.sortOrder),
  ],
);

export const helpAssets = pgTable(
  "help_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id").references(() => helpContents.id, { onDelete: "set null" }),
    assetType: helpAssetType("asset_type").notNull(),
    sourceUrl: text("source_url"),
    storageKey: text("storage_key"),
    originalName: text("original_name"),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    checksumSha256: text("checksum_sha256"),
    altText: text("alt_text").notNull().default(""),
    assistantDescription: text("assistant_description").notNull().default(""),
    subtitles: text("subtitles").notNull().default(""),
    assistantSummary: text("assistant_summary").notNull().default(""),
    extractedText: text("extracted_text").notNull().default(""),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("help_assets_content_idx").on(table.contentId),
    index("help_assets_type_idx").on(table.assetType),
    index("help_assets_checksum_idx").on(table.checksumSha256),
    index("help_assets_storage_key_idx").on(table.storageKey),
  ],
);

export const helpContentFeaturedVideos = pgTable(
  "help_content_featured_videos",
  {
    contentId: uuid("content_id")
      .primaryKey()
      .references(() => helpContents.id, { onDelete: "cascade" }),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => helpAssets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_content_featured_videos_asset_unique").on(table.assetId),
    index("help_content_featured_videos_updated_idx").on(table.updatedAt),
  ],
);

export const helpStepBlocks = pgTable(
  "help_step_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id").notNull().references(() => helpContentSteps.id, { onDelete: "cascade" }),
    blockType: helpBlockType("block_type").notNull(),
    textContent: text("text_content").notNull().default(""),
    assetId: uuid("asset_id").references(() => helpAssets.id, { onDelete: "set null" }),
    linkUrl: text("link_url"),
    linkLabel: text("link_label"),
    noticeVariant: text("notice_variant"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_step_blocks_order_unique").on(table.stepId, table.sortOrder),
    index("help_step_blocks_step_idx").on(table.stepId, table.sortOrder),
    index("help_step_blocks_asset_idx").on(table.assetId),
  ],
);
