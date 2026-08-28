import {
  bigint,
  bigserial,
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
import { users } from "$lib/server/db/schema";
import { supportAiRuns } from "$lib/server/db/supportAiSchema";
import {
  customerContacts,
  supportMessageAuthor,
  supportQueues,
  tickets,
} from "$lib/server/db/supportSchema";

export const webChatAiState = pgEnum("web_chat_ai_state", [
  "active",
  "escalated",
  "human",
  "disabled",
]);

export const webChatSessions = pgTable(
  "web_chat_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatNumber: bigserial("chat_number", { mode: "number" }).notNull(),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    customerContactId: uuid("customer_contact_id").references(() => customerContacts.id, {
      onDelete: "set null",
    }),
    queueId: uuid("queue_id")
      .notNull()
      .references(() => supportQueues.id, { onDelete: "restrict" }),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    subject: text("subject").notNull().default("Atendimento F10"),
    legacyUserId: text("legacy_user_id"),
    groupId: integer("group_id"),
    groupName: text("group_name"),
    unitId: integer("unit_id"),
    unitName: text("unit_name"),
    unitSchema: text("unit_schema"),
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
    aiState: webChatAiState("ai_state").notNull().default("disabled"),
    aiHandoffReason: text("ai_handoff_reason"),
    aiHandoffAt: timestamp("ai_handoff_at", { withTimezone: true }),
    aiProcessingAt: timestamp("ai_processing_at", { withTimezone: true }),
    aiLastRunId: uuid("ai_last_run_id").references(() => supportAiRuns.id, {
      onDelete: "set null",
    }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("web_chat_sessions_chat_number_unique").on(table.chatNumber),
    uniqueIndex("web_chat_sessions_ticket_unique").on(table.ticketId),
    uniqueIndex("web_chat_sessions_token_unique").on(table.tokenHash),
    index("web_chat_sessions_expires_idx").on(table.expiresAt),
    index("web_chat_sessions_last_seen_idx").on(table.lastSeenAt),
    index("web_chat_sessions_ai_state_idx").on(table.aiState, table.lastSeenAt),
    index("web_chat_sessions_ai_last_run_idx").on(table.aiLastRunId),
    index("web_chat_sessions_queue_idx").on(table.queueId, table.updatedAt),
    index("web_chat_sessions_assigned_idx").on(table.assignedUserId, table.updatedAt),
    index("web_chat_sessions_customer_idx").on(table.customerContactId, table.updatedAt),
    index("web_chat_sessions_legacy_context_idx").on(table.legacyUserId, table.groupId, table.unitId),
  ],
);

export const webChatMessages = pgTable(
  "web_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => webChatSessions.id, { onDelete: "cascade" }),
    authorType: supportMessageAuthor("author_type").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    customerContactId: uuid("customer_contact_id").references(() => customerContacts.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("web_chat_messages_session_idx").on(table.sessionId, table.createdAt),
    index("web_chat_messages_author_user_idx").on(table.authorUserId, table.createdAt),
  ],
);

export const webChatMessageAttachments = pgTable(
  "web_chat_message_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => webChatMessages.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => webChatSessions.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("web_chat_message_attachments_storage_key_unique").on(table.storageKey),
    index("web_chat_message_attachments_message_idx").on(table.messageId, table.createdAt),
    index("web_chat_message_attachments_session_idx").on(table.sessionId, table.createdAt),
  ],
);

export const supportPublicLimits = pgTable("support_public_limits", {
  key: text("key").primaryKey(),
  requestCount: integer("request_count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
