import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
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
    active: boolean("active").notNull().default(true),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("remote_devices_provider_idx").on(table.provider, table.providerDeviceId),
    index("remote_devices_customer_idx").on(table.customerContactId, table.active),
    index("remote_devices_organization_idx").on(table.customerOrganizationId, table.active),
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
    status: remoteSupportStatus("status").notNull().default("requested"),
    consentTokenHash: text("consent_token_hash").notNull(),
    consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true }).notNull(),
    providerSessionId: text("provider_session_id"),
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
    index("remote_support_sessions_status_idx").on(table.status, table.updatedAt),
    index("remote_support_sessions_ticket_idx").on(table.ticketId, table.createdAt),
    index("remote_support_sessions_requester_idx").on(table.requestedByUserId, table.createdAt),
  ],
);
