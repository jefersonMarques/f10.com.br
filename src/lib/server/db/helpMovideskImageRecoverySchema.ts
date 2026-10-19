import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const helpMovideskImageRecoveryState = pgTable("help_movidesk_image_recovery_state", {
  id: integer("id").primaryKey().default(1),
  enabled: boolean("enabled").notNull().default(false),
  nextRequestAt: timestamp("next_request_at", { withTimezone: true }).notNull().defaultNow(),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
