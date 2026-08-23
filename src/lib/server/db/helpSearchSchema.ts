import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { helpContents } from "$lib/server/db/structuredHelpSchema";
import { customerContacts, tickets } from "$lib/server/db/supportSchema";

export const helpSearchSource = pgEnum("help_search_source", [
  "public",
  "operations",
  "chat_ai",
  "support_agent",
]);

export const helpSearchDocuments = pgTable(
  "help_search_documents",
  {
    contentId: uuid("content_id")
      .primaryKey()
      .references(() => helpContents.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    categoryText: text("category_text").notNull().default(""),
    publicText: text("public_text").notNull().default(""),
    searchAliases: text("search_aliases").notNull().default(""),
    assistantText: text("assistant_text").notNull().default(""),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("help_search_documents_updated_idx").on(table.updatedAt)],
);

export const helpSearchEvents = pgTable(
  "help_search_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    customerContactId: uuid("customer_contact_id").references(
      () => customerContacts.id,
      { onDelete: "set null" },
    ),
    source: helpSearchSource("source").notNull(),
    query: text("query").notNull(),
    normalizedQuery: text("normalized_query").notNull(),
    resultCount: integer("result_count").notNull().default(0),
    selectedContentId: uuid("selected_content_id").references(
      () => helpContents.id,
      { onDelete: "set null" },
    ),
    aiAnswered: boolean("ai_answered").notNull().default(false),
    escalated: boolean("escalated").notNull().default(false),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("help_search_events_created_idx").on(table.createdAt),
    index("help_search_events_normalized_idx").on(table.normalizedQuery),
    index("help_search_events_source_idx").on(table.source, table.createdAt),
  ],
);

export const helpSearchResults = pgTable(
  "help_search_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    searchEventId: uuid("search_event_id")
      .notNull()
      .references(() => helpSearchEvents.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => helpContents.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    score: doublePrecision("score").notNull().default(0),
    titleSnapshot: text("title_snapshot").notNull(),
    clickedAt: timestamp("clicked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("help_search_results_event_content_unique").on(
      table.searchEventId,
      table.contentId,
    ),
    index("help_search_results_event_idx").on(table.searchEventId, table.rank),
    index("help_search_results_content_idx").on(table.contentId, table.createdAt),
  ],
);
