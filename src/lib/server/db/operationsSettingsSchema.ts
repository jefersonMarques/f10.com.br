import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";
import { webChatSessions } from "$lib/server/db/chatSchema";
import {
  customerContacts,
  customerOrganizations,
  tickets,
} from "$lib/server/db/supportSchema";

export const operationsSettings = pgTable("operations_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull().default({}),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const remoteSupportStatus = pgEnum("remote_support_status", [
  "requested",
  "authorized",
  "denied",
  "active",
  "ended",
  "failed",
  "cancelled",
  "expired",
]);

export const remoteEnrollmentStatus = pgEnum("remote_enrollment_status", [
  "pending",
  "downloaded",
  "completed",
  "failed",
  "cancelled",
  "expired",
]);

export const remoteCustomerGroups = pgTable(
  "remote_customer_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerContactId: uuid("customer_contact_id").references(
      () => customerContacts.id,
      { onDelete: "cascade" },
    ),
    customerOrganizationId: uuid("customer_organization_id").references(
      () => customerOrganizations.id,
      { onDelete: "cascade" },
    ),
    provider: text("provider").notNull().default("meshcentral"),
    providerGroupId: text("provider_group_id").notNull(),
    providerGroupName: text("provider_group_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("remote_customer_groups_provider_unique").on(
      table.provider,
      table.providerGroupId,
    ),
    index("remote_customer_groups_contact_idx").on(table.customerContactId),
    index("remote_customer_groups_organization_idx").on(table.customerOrganizationId),
  ],
);

export const remoteDevices = pgTable(
  "remote_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerContactId: uuid("customer_contact_id").references(
      () => customerContacts.id,
      { onDelete: "set null" },
    ),
    customerOrganizationId: uuid("customer_organization_id").references(
      () => customerOrganizations.id,
      { onDelete: "set null" },
    ),
    name: text("name").notNull(),
    provider: text("provider").notNull().default("meshcentral"),
    providerDeviceId: text("provider_device_id").notNull(),
    providerGroupId: text("provider_group_id"),
    active: boolean("active").notNull().default(true),
    online: boolean("online").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastOnlineAt: timestamp("last_online_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("remote_devices_provider_unique").on(
      table.provider,
      table.providerDeviceId,
    ),
    index("remote_devices_provider_idx").on(table.provider, table.providerDeviceId),
    index("remote_devices_provider_group_idx").on(table.provider, table.providerGroupId),
    index("remote_devices_customer_idx").on(table.customerContactId, table.active),
    index("remote_devices_organization_idx").on(table.customerOrganizationId, table.active),
  ],
);

export const remoteDeviceEnrollments = pgTable(
  "remote_device_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    webChatSessionId: uuid("web_chat_session_id").references(
      () => webChatSessions.id,
      { onDelete: "set null" },
    ),
    customerContactId: uuid("customer_contact_id").references(
      () => customerContacts.id,
      { onDelete: "set null" },
    ),
    customerOrganizationId: uuid("customer_organization_id").references(
      () => customerOrganizations.id,
      { onDelete: "set null" },
    ),
    remoteCustomerGroupId: uuid("remote_customer_group_id")
      .notNull()
      .references(() => remoteCustomerGroups.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    tokenHash: text("token_hash").notNull(),
    status: remoteEnrollmentStatus("status").notNull().default("pending"),
    baselineProviderDeviceIds: jsonb("baseline_provider_device_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    deviceId: uuid("device_id").references(() => remoteDevices.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    downloadedAt: timestamp("downloaded_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("remote_device_enrollments_token_unique").on(table.tokenHash),
    index("remote_device_enrollments_ticket_idx").on(table.ticketId, table.createdAt),
    index("remote_device_enrollments_status_idx").on(table.status, table.expiresAt),
    index("remote_device_enrollments_group_idx").on(table.remoteCustomerGroupId),
  ],
);

export const remoteSupportSessions = pgTable(
  "remote_support_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "set null" }),
    webChatSessionId: uuid("web_chat_session_id").references(
      () => webChatSessions.id,
      { onDelete: "set null" },
    ),
    customerContactId: uuid("customer_contact_id").references(
      () => customerContacts.id,
      { onDelete: "set null" },
    ),
    deviceId: uuid("device_id").references(() => remoteDevices.id, { onDelete: "set null" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => users.id, { onDelete: "set null" }),
    startedByUserId: uuid("started_by_user_id").references(() => users.id, { onDelete: "set null" }),
    endedByUserId: uuid("ended_by_user_id").references(() => users.id, { onDelete: "set null" }),
    status: remoteSupportStatus("status").notNull().default("requested"),
    consentTokenHash: text("consent_token_hash").notNull(),
    consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true }).notNull(),
    providerSessionId: text("provider_session_id"),
    providerSessionExpiresAt: timestamp("provider_session_expires_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    deniedAt: timestamp("denied_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("remote_support_sessions_consent_unique").on(
      table.consentTokenHash,
    ),
    index("remote_support_sessions_status_idx").on(table.status, table.updatedAt),
    index("remote_support_sessions_ticket_idx").on(table.ticketId, table.createdAt),
    index("remote_support_sessions_requester_idx").on(table.requestedByUserId, table.createdAt),
    index("remote_support_sessions_started_by_idx").on(table.startedByUserId, table.startedAt),
    index("remote_support_sessions_ended_by_idx").on(table.endedByUserId, table.endedAt),
    index("remote_support_sessions_provider_session_idx").on(
      table.providerSessionId,
      table.providerSessionExpiresAt,
    ),
  ],
);
