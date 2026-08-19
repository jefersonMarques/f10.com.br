import {
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { teams, users } from "$lib/server/db/schema";
import { tasks } from "$lib/server/db/taskSchema";

export const ticketStatus = pgEnum("ticket_status", [
  "new",
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]);

export const ticketPriority = pgEnum("ticket_priority", [
  "low",
  "normal",
  "high",
  "urgent",
]);

export const supportChannel = pgEnum("support_channel", [
  "manual",
  "web_chat",
  "portal",
  "email",
  "whatsapp",
]);

export const supportMessageAuthor = pgEnum("support_message_author", [
  "customer",
  "user",
  "system",
]);

export const supportMessageVisibility = pgEnum(
  "support_message_visibility",
  ["public", "internal"],
);

export const customerOrganizations = pgTable(
  "customer_organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    document: text("document"),
    externalReference: text("external_reference"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customer_organizations_name_idx").on(table.name)],
);

export const customerContacts = pgTable(
  "customer_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").references(
      () => customerOrganizations.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_contacts_organization_idx").on(table.organizationId),
    index("customer_contacts_email_idx").on(table.email),
  ],
);

export const supportQueues = pgTable(
  "support_queues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("support_queues_code_unique").on(table.code)],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketNumber: bigserial("ticket_number", { mode: "number" }).notNull(),
    customerContactId: uuid("customer_contact_id").references(
      () => customerContacts.id,
      { onDelete: "set null" },
    ),
    queueId: uuid("queue_id")
      .notNull()
      .references(() => supportQueues.id, { onDelete: "restrict" }),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    linkedTaskId: uuid("linked_task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    subject: text("subject").notNull(),
    status: ticketStatus("status").notNull().default("new"),
    priority: ticketPriority("priority").notNull().default("normal"),
    channel: supportChannel("channel").notNull().default("manual"),
    firstResponseDueAt: timestamp("first_response_due_at", { withTimezone: true }),
    resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tickets_number_unique").on(table.ticketNumber),
    index("tickets_queue_idx").on(table.queueId, table.status),
    index("tickets_assigned_user_idx").on(table.assignedUserId, table.status),
    index("tickets_customer_idx").on(table.customerContactId),
    index("tickets_updated_idx").on(table.updatedAt),
  ],
);

export const ticketMessages = pgTable(
  "ticket_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    authorType: supportMessageAuthor("author_type").notNull(),
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    customerContactId: uuid("customer_contact_id").references(
      () => customerContacts.id,
      { onDelete: "set null" },
    ),
    visibility: supportMessageVisibility("visibility").notNull().default("public"),
    channel: supportChannel("channel").notNull().default("manual"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ticket_messages_ticket_idx").on(table.ticketId, table.createdAt)],
);

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ticket_events_ticket_idx").on(table.ticketId, table.createdAt)],
);

export const supportTags = pgTable("support_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("blue"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketTags = pgTable(
  "ticket_tags",
  {
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => supportTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.ticketId, table.tagId] }),
    index("ticket_tags_tag_idx").on(table.tagId),
  ],
);

export const ticketAttachments = pgTable(
  "ticket_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ticket_attachments_storage_key_unique").on(table.storageKey),
    index("ticket_attachments_ticket_idx").on(table.ticketId, table.createdAt),
  ],
);
