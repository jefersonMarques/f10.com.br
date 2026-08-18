import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customerContacts, tickets } from "$lib/server/db/supportSchema";

export type CustomerF10UnitSnapshot = {
  schema: string;
  unidade: string;
  unidade_id: number;
};

export type CustomerF10GroupSnapshot = {
  grupo: string;
  grupo_id: number;
  subgrupo: boolean;
  unidades: CustomerF10UnitSnapshot[];
};

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
    authSource: text("auth_source").notNull().default("magic_link"),
    legacyUserId: text("legacy_user_id"),
    legacyLogin: text("legacy_login"),
    legacyTokenEncrypted: text("legacy_token_encrypted"),
    legacyTokenExpiresAt: timestamp("legacy_token_expires_at", { withTimezone: true }),
    legacyGroups: jsonb("legacy_groups")
      .$type<CustomerF10GroupSnapshot[]>()
      .notNull()
      .default([]),
    selectedGroupId: integer("selected_group_id"),
    selectedGroupName: text("selected_group_name"),
    selectedUnitId: integer("selected_unit_id"),
    selectedUnitName: text("selected_unit_name"),
    selectedUnitSchema: text("selected_unit_schema"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_portal_sessions_hash_unique").on(table.tokenHash),
    index("customer_portal_sessions_contact_idx").on(table.customerContactId, table.expiresAt),
    index("customer_portal_sessions_expiry_idx").on(table.expiresAt),
    index("customer_portal_sessions_legacy_user_idx").on(table.legacyUserId, table.expiresAt),
    index("customer_portal_sessions_unit_idx").on(table.selectedUnitId, table.expiresAt),
  ],
);

export const customerF10Identities = pgTable(
  "customer_f10_identities",
  {
    legacyUserId: text("legacy_user_id").primaryKey(),
    customerContactId: uuid("customer_contact_id")
      .notNull()
      .references(() => customerContacts.id, { onDelete: "cascade" }),
    loginEmail: text("login_email").notNull(),
    firstAuthenticatedAt: timestamp("first_authenticated_at", { withTimezone: true }).notNull().defaultNow(),
    lastAuthenticatedAt: timestamp("last_authenticated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_f10_identities_contact_idx").on(table.customerContactId),
    index("customer_f10_identities_login_idx").on(table.loginEmail),
  ],
);

export const ticketCustomerContexts = pgTable(
  "ticket_customer_contexts",
  {
    ticketId: uuid("ticket_id")
      .primaryKey()
      .references(() => tickets.id, { onDelete: "cascade" }),
    customerContactId: uuid("customer_contact_id").references(() => customerContacts.id, {
      onDelete: "set null",
    }),
    legacyUserId: text("legacy_user_id").notNull(),
    groupId: integer("group_id").notNull(),
    groupName: text("group_name").notNull(),
    unitId: integer("unit_id").notNull(),
    unitName: text("unit_name").notNull(),
    unitSchema: text("unit_schema").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ticket_customer_contexts_customer_idx").on(table.customerContactId, table.unitId),
    index("ticket_customer_contexts_legacy_idx").on(table.legacyUserId, table.unitId),
  ],
);

export const customerActivityEvents = pgTable(
  "customer_activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerContactId: uuid("customer_contact_id").references(() => customerContacts.id, {
      onDelete: "set null",
    }),
    portalSessionId: uuid("portal_session_id").references(() => customerPortalSessions.id, {
      onDelete: "set null",
    }),
    legacyUserId: text("legacy_user_id"),
    groupId: integer("group_id"),
    unitId: integer("unit_id"),
    eventType: text("event_type").notNull(),
    source: text("source").notNull(),
    path: text("path"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_activity_events_customer_idx").on(table.customerContactId, table.createdAt),
    index("customer_activity_events_legacy_idx").on(table.legacyUserId, table.createdAt),
    index("customer_activity_events_type_idx").on(table.eventType, table.createdAt),
  ],
);
