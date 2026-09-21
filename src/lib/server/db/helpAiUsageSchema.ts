import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";

export const helpAiUsageRuns = pgTable(
  "help_ai_usage_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    operation: text("operation").notNull(),
    provider: text("provider").notNull().default("openai"),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    audioSeconds: integer("audio_seconds"),
    estimatedCostUsdMicros: bigint("estimated_cost_usd_micros", { mode: "number" })
      .notNull()
      .default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    status: text("status").notNull().default("success"),
    failureCode: text("failure_code"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("help_ai_usage_runs_created_idx").on(table.createdAt),
    index("help_ai_usage_runs_operation_idx").on(table.operation, table.createdAt),
    index("help_ai_usage_runs_model_idx").on(table.model, table.createdAt),
    index("help_ai_usage_runs_status_idx").on(table.status, table.createdAt),
  ],
);
