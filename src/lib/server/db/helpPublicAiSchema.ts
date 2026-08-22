import { sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const helpPublicAiRequests = pgTable(
  "help_public_ai_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionKey: text("session_key").notNull(),
    ipKey: text("ip_key").notNull(),
    status: text("status").notNull().default("running"),
    model: text("model").notNull().default(""),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    failureCode: text("failure_code"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("help_public_ai_requests_active_session_unique")
      .on(table.sessionKey)
      .where(sql`${table.finishedAt} IS NULL`),
    index("help_public_ai_requests_session_started_idx").on(
      table.sessionKey,
      table.startedAt,
    ),
    index("help_public_ai_requests_ip_started_idx").on(table.ipKey, table.startedAt),
    index("help_public_ai_requests_started_idx").on(table.startedAt),
  ],
);
