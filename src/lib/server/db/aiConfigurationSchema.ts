import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";

export const aiProviderCredentials = pgTable("ai_provider_credentials", {
  provider: text("provider").primaryKey(),
  encryptedSecret: text("encrypted_secret").notNull(),
  lastTestedAt: timestamp("last_tested_at", { withTimezone: true }),
  lastTestStatus: text("last_test_status"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
