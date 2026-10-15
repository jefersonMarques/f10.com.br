import { bigint, boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { helpContents } from "$lib/server/db/structuredHelpSchema";

export const helpMovideskImportState = pgTable("help_movidesk_import_state", {
  id: integer("id").primaryKey().default(1),
  enabled: boolean("enabled").notNull().default(false),
  phase: text("phase").notNull().default("idle"),
  nextPage: integer("next_page").notNull().default(0),
  totalCount: integer("total_count"),
  nextRequestAt: timestamp("next_request_at", { withTimezone: true }).notNull().defaultNow(),
  lastError: text("last_error"),
  startedBy: uuid("started_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const helpMovideskArticles = pgTable("help_movidesk_articles", {
  sourceId: bigint("source_id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().default(""),
  summary: text("summary").notNull().default(""),
  sourceUrl: text("source_url").notNull(),
  sourceHtml: text("source_html"),
  sourceText: text("source_text"),
  sourceRevision: bigint("source_revision", { mode: "number" }),
  sourceUpdatedAt: timestamp("source_updated_at", { withTimezone: true }),
  categories: jsonb("categories").$type<Array<{ id: number | null; name: string }>>().notNull().default([]),
  attachments: jsonb("attachments").$type<Array<{ id: number | null; name: string; hash?: string }>>().notNull().default([]),
  contentId: uuid("content_id").references(() => helpContents.id, { onDelete: "set null" }),
  state: text("state").notNull().default("discovered"),
  needsReview: boolean("needs_review").notNull().default(true),
  issue: text("issue"),
  discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
  importedAt: timestamp("imported_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("help_movidesk_articles_content_idx").on(t.contentId),
  index("help_movidesk_articles_state_idx").on(t.state, t.sourceId),
]);
