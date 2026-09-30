import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";

export const iframeF10Notices = pgTable(
  "iframe_f10_notices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    severity: text("severity").$type<"info" | "warning" | "critical">().notNull().default("info"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    active: boolean("active").notNull().default(true),
    requiresAcknowledgement: boolean("requires_acknowledgement").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("iframe_f10_notices_active_window_idx").on(table.active, table.startsAt, table.expiresAt),
  ],
);


export const iframeF10Updates = pgTable(
  "iframe_f10_updates",
  {
    id: uuid("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    bodyMarkdown: text("body_markdown").notNull(),
    coverStorageKey: text("cover_storage_key"),
    coverContentType: text("cover_content_type"),
    coverOriginalName: text("cover_original_name"),
    pinned: boolean("pinned").notNull().default(false),
    active: boolean("active").notNull().default(true),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("iframe_f10_updates_slug_uidx").on(table.slug),
    index("iframe_f10_updates_visibility_idx").on(table.active, table.pinned, table.expiresAt),
  ],
);
