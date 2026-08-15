import {
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

export const userStatus = pgEnum("user_status", ["active", "inactive", "invited"]);
export const permissionScope = pgEnum("permission_scope", ["own", "team", "all"]);
export const permissionEffect = pgEnum("permission_effect", ["allow", "deny"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    status: userStatus("status").notNull().default("active"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("roles_code_unique").on(table.code)],
);

export const permissions = pgTable("permissions", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
    scope: permissionScope("scope").notNull().default("all"),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionCode] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const userPermissions = pgTable(
  "user_permissions",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
    effect: permissionEffect("effect").notNull(),
    scope: permissionScope("scope").notNull().default("own"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.permissionCode] })],
);

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isManager: boolean("is_manager").notNull().default(false),
  },
  (table) => [
    primaryKey({ columns: [table.teamId, table.userId] }),
    index("team_members_user_idx").on(table.userId),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("sessions_token_hash_unique").on(table.tokenHash),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

export const authLoginAttempts = pgTable("auth_login_attempts", {
  key: text("key").primaryKey(),
  attemptCount: integer("attempt_count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: updatedAt(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [
    index("audit_logs_actor_idx").on(table.actorUserId),
    index("audit_logs_created_idx").on(table.createdAt),
  ],
);
