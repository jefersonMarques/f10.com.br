import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tickets } from "$lib/server/db/supportSchema";

export const webChatSessions = pgTable(
  "web_chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    contextUrl: text("context_url"),
    contextData: jsonb("context_data")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("web_chat_sessions_ticket_unique").on(table.ticketId),
    uniqueIndex("web_chat_sessions_token_unique").on(table.tokenHash),
    index("web_chat_sessions_expires_idx").on(table.expiresAt),
    index("web_chat_sessions_last_seen_idx").on(table.lastSeenAt),
  ],
);

export const supportPublicLimits = pgTable("support_public_limits", {
  key: text("key").primaryKey(),
  requestCount: integer("request_count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
