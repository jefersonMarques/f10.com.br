import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customerContacts } from "$lib/server/db/supportSchema";

export const customerPortalLoginTokens = pgTable(
  "customer_portal_login_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerContactId: uuid("customer_contact_id")
      .notNull()
      .references(() => customerContacts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_portal_login_tokens_hash_unique").on(table.tokenHash),
    index("customer_portal_login_tokens_contact_idx").on(table.customerContactId, table.expiresAt),
    index("customer_portal_login_tokens_expiry_idx").on(table.expiresAt),
  ],
);

export const customerPortalSessions = pgTable(
  "customer_portal_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerContactId: uuid("customer_contact_id")
      .notNull()
      .references(() => customerContacts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_portal_sessions_hash_unique").on(table.tokenHash),
    index("customer_portal_sessions_contact_idx").on(table.customerContactId, table.expiresAt),
    index("customer_portal_sessions_expiry_idx").on(table.expiresAt),
  ],
);
