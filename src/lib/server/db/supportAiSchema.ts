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
import { helpSearchEvents } from "$lib/server/db/helpSearchSchema";
import { tickets } from "$lib/server/db/supportSchema";

export const supportAiResolution = pgEnum("support_ai_resolution", [
  "answered",
  "escalate",
  "failed",
]);

export type SupportAiSourceSnapshot = {
  contentId: string;
  slug: string;
  title: string;
  rank: number;
  score: number;
};

export const supportAiRuns = pgTable(
  "support_ai_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    searchEventId: uuid("search_event_id").references(() => helpSearchEvents.id, {
      onDelete: "set null",
    }),
    question: text("question").notNull(),
    answer: text("answer").notNull().default(""),
    resolution: supportAiResolution("resolution").notNull(),
    provider: text("provider").notNull().default("openai"),
    model: text("model").notNull(),
    providerResponseId: text("provider_response_id"),
    sourceSnapshot: jsonb("source_snapshot")
      .$type<SupportAiSourceSnapshot[]>()
      .notNull()
      .default([]),
    escalationReason: text("escalation_reason").notNull().default(""),
    failureCode: text("failure_code"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    latencyMs: integer("latency_ms"),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("support_ai_runs_created_idx").on(table.createdAt),
    index("support_ai_runs_resolution_idx").on(table.resolution, table.createdAt),
    index("support_ai_runs_search_event_idx").on(table.searchEventId),
    index("support_ai_runs_ticket_idx").on(table.ticketId),
  ],
);
