import {
  boolean,
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
import { customerContacts, supportQueues, tickets } from "$lib/server/db/supportSchema";
import { ticketAreas } from "$lib/server/db/ticketWorkflowSchema";

export const serviceRequestType = pgEnum("service_request_type", ["nfse", "cell_coin"]);
export const serviceRequestChangeSource = pgEnum("service_request_change_source", [
  "customer",
  "user",
  "system",
]);

export const serviceRequestRoutes = pgTable("service_request_routes", {
  requestType: serviceRequestType("request_type").primaryKey(),
  queueId: uuid("queue_id")
    .notNull()
    .references(() => supportQueues.id, { onDelete: "restrict" }),
  areaId: uuid("area_id")
    .notNull()
    .references(() => ticketAreas.id, { onDelete: "restrict" }),
  active: boolean("active").notNull().default(true),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceRequests = pgTable(
  "service_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    requestType: serviceRequestType("request_type").notNull(),
    customerContactId: uuid("customer_contact_id")
      .notNull()
      .references(() => customerContacts.id, { onDelete: "restrict" }),
    legacyUserId: text("legacy_user_id").notNull(),
    groupId: integer("group_id").notNull(),
    groupName: text("group_name").notNull(),
    unitId: integer("unit_id").notNull(),
    unitName: text("unit_name").notNull(),
    unitSchema: text("unit_schema").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    version: integer("version").notNull().default(1),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    secretsEncrypted: jsonb("secrets_encrypted")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("service_requests_ticket_unique").on(table.ticketId),
    uniqueIndex("service_requests_customer_type_idempotency_unique").on(
      table.customerContactId,
      table.requestType,
      table.idempotencyKey,
    ),
    index("service_requests_unit_type_idx").on(
      table.groupId,
      table.unitId,
      table.requestType,
      table.updatedAt,
    ),
  ],
);

export const serviceRequestAttachments = pgTable(
  "service_request_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceRequestId: uuid("service_request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    storageKey: text("storage_key").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("service_request_attachments_storage_key_unique").on(table.storageKey),
    index("service_request_attachments_request_idx").on(table.serviceRequestId, table.createdAt),
  ],
);

export const serviceRequestChangeSets = pgTable(
  "service_request_change_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    serviceRequestId: uuid("service_request_id")
      .notNull()
      .references(() => serviceRequests.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    source: serviceRequestChangeSource("source").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    actorCustomerContactId: uuid("actor_customer_contact_id").references(
      () => customerContacts.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("service_request_change_sets_version_unique").on(
      table.serviceRequestId,
      table.version,
    ),
    index("service_request_change_sets_request_idx").on(
      table.serviceRequestId,
      table.createdAt,
    ),
  ],
);

export const serviceRequestFieldChanges = pgTable(
  "service_request_field_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    changeSetId: uuid("change_set_id")
      .notNull()
      .references(() => serviceRequestChangeSets.id, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    previousValue: jsonb("previous_value").$type<unknown>(),
    nextValue: jsonb("next_value").$type<unknown>(),
    secretChanged: boolean("secret_changed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("service_request_field_changes_set_idx").on(table.changeSetId, table.createdAt)],
);
