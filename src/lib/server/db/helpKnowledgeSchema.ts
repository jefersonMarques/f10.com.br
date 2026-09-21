import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { helpSearchEvents, helpSearchSource } from "$lib/server/db/helpSearchSchema";
import { helpContents } from "$lib/server/db/structuredHelpSchema";
import { customerContacts } from "$lib/server/db/supportSchema";

export const helpKnowledgeScope = pgEnum("help_knowledge_scope", [
  "global",
  "article",
]);

export const helpKnowledgeResolution = pgEnum("help_knowledge_resolution", [
  "answered",
  "navigate",
  "found_elsewhere",
  "not_found",
  "failed",
]);

export type HelpKnowledgeSourceSnapshot = {
  contentId: string;
  slug: string;
  title: string;
  rank: number;
  score: number;
};

export const helpKnowledgeRuns = pgTable(
  "help_knowledge_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: helpSearchSource("source").notNull(),
    scope: helpKnowledgeScope("scope").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    customerContactId: uuid("customer_contact_id").references(
      () => customerContacts.id,
      { onDelete: "set null" },
    ),
    searchEventId: uuid("search_event_id").references(() => helpSearchEvents.id, {
      onDelete: "set null",
    }),
    question: text("question").notNull(),
    normalizedQuery: text("normalized_query").notNull(),
    contextSlug: text("context_slug").notNull().default(""),
    resolution: helpKnowledgeResolution("resolution").notNull(),
    targetContentId: uuid("target_content_id").references(() => helpContents.id, {
      onDelete: "set null",
    }),
    targetSlug: text("target_slug").notNull().default(""),
    targetType: text("target_type").notNull().default(""),
    sourceSnapshot: jsonb("source_snapshot")
      .$type<HelpKnowledgeSourceSnapshot[]>()
      .notNull()
      .default([]),
    model: text("model"),
    providerResponseId: text("provider_response_id"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms").notNull().default(0),
    failureCode: text("failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("help_knowledge_runs_created_idx").on(table.createdAt),
    index("help_knowledge_runs_resolution_idx").on(table.resolution, table.createdAt),
    index("help_knowledge_runs_source_idx").on(table.source, table.createdAt),
    index("help_knowledge_runs_normalized_query_idx").on(table.normalizedQuery, table.createdAt),
    index("help_knowledge_runs_target_content_idx").on(table.targetContentId, table.createdAt),
  ],
);
