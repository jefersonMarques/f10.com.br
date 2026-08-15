import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
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
]);

export const helpAssetType = pgEnum("help_asset_type", [
  "image",
  "video",
  "file",
]);

export const helpContents = pgTable(
  "help_contents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    category: text("category").notNull().default(""),
    aiGeneralKnowledge: text("ai_general_knowledge").notNull().default(""),
    status: helpContentStatus("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    legacyArticleId: uuid("legacy_article_id").references(() => helpArticles.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_contents_slug_unique").on(table.slug),
    uniqueIndex("help_contents_legacy_article_unique").on(table.legacyArticleId),
    index("help_contents_status_idx").on(table.status),
    index("help_contents_category_idx").on(table.category),
    index("help_contents_updated_idx").on(table.updatedAt),
  ],
);

export const helpContentSteps = pgTable(
  "help_content_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => helpContents.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    aiKnowledge: text("ai_knowledge").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_content_steps_order_unique").on(
      table.contentId,
      table.sortOrder,
    ),
    index("help_content_steps_content_idx").on(table.contentId, table.sortOrder),
  ],
);

export const helpAssets = pgTable(
  "help_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contentId: uuid("content_id")
      .notNull()
      .references(() => helpContents.id, { onDelete: "cascade" }),
    assetType: helpAssetType("asset_type").notNull(),
    sourceUrl: text("source_url"),
    storageKey: text("storage_key"),
    originalName: text("original_name"),
    mimeType: text("mime_type"),
    altText: text("alt_text").notNull().default(""),
    transcript: text("transcript").notNull().default(""),
    aiSummary: text("ai_summary").notNull().default(""),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("help_assets_content_idx").on(table.contentId),
    index("help_assets_type_idx").on(table.assetType),
  ],
);

export const helpStepBlocks = pgTable(
  "help_step_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id")
      .notNull()
      .references(() => helpContentSteps.id, { onDelete: "cascade" }),
    blockType: helpBlockType("block_type").notNull(),
    textContent: text("text_content").notNull().default(""),
    assetId: uuid("asset_id").references(() => helpAssets.id, {
      onDelete: "set null",
    }),
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
