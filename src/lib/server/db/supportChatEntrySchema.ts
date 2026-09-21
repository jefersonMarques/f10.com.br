import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { supportQueues, ticketMessages, tickets } from "$lib/server/db/supportSchema";

export type SupportChatInitialHandling = "ai" | "human";

export const supportChatEntryOptions = pgTable(
  "support_chat_entry_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    label: text("label").notNull(),
    description: text("description").notNull().default(""),
    queueId: uuid("queue_id")
      .notNull()
      .references(() => supportQueues.id, { onDelete: "restrict" }),
    initialHandling: text("initial_handling")
      .$type<SupportChatInitialHandling>()
      .notNull()
      .default("ai"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("support_chat_entry_options_active_order_idx").on(
      table.active,
      table.sortOrder,
      table.createdAt,
    ),
    index("support_chat_entry_options_queue_idx").on(table.queueId),
  ],
);

export const ticketMessageAttachments = pgTable(
  "ticket_message_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => ticketMessages.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ticket_message_attachments_storage_key_unique").on(table.storageKey),
    index("ticket_message_attachments_message_idx").on(table.messageId, table.createdAt),
    index("ticket_message_attachments_ticket_idx").on(table.ticketId, table.createdAt),
  ],
);
