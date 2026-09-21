import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tickets } from "$lib/server/db/supportSchema";

export const supportEmailInboundStatus = pgEnum("support_email_inbound_status", [
  "pending",
  "processing",
  "retry_waiting",
  "processed",
  "ignored",
  "failed",
]);

export const supportEmailThreads = pgTable(
  "support_email_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("brevo"),
    conversationId: text("conversation_id").notNull(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    inboxCode: text("inbox_code").notNull(),
    senderName: text("sender_name"),
    senderEmail: text("sender_email").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("support_email_threads_provider_conversation_unique").on(
      table.provider,
      table.conversationId,
    ),
    uniqueIndex("support_email_threads_ticket_unique").on(table.ticketId),
    index("support_email_threads_sender_idx").on(table.senderEmail, table.updatedAt),
  ],
);

export const supportEmailInboundEvents = pgTable(
  "support_email_inbound_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull().default("brevo"),
    eventType: text("event_type").notNull(),
    conversationId: text("conversation_id"),
    providerMessageIds: jsonb("provider_message_ids").$type<string[]>().notNull().default([]),
    payloadHash: text("payload_hash").notNull(),
    rawPayload: jsonb("raw_payload").$type<Record<string, unknown>>().notNull(),
    status: supportEmailInboundStatus("status").notNull().default("pending"),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("support_email_inbound_events_provider_payload_unique").on(
      table.provider,
      table.payloadHash,
    ),
    index("support_email_inbound_events_queue_idx").on(
      table.status,
      table.availableAt,
      table.receivedAt,
    ),
    index("support_email_inbound_events_conversation_idx").on(
      table.provider,
      table.conversationId,
      table.receivedAt,
    ),
  ],
);

export type SupportEmailInboundEvent = typeof supportEmailInboundEvents.$inferSelect;
