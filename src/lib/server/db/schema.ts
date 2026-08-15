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
export const helpContentStatus = pgEnum("help_content_status", ["draft", "review", "published", "archived"]);
export const helpDestinationKind = pgEnum("help_destination_kind", ["route", "training", "sequence", "support"]);

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
    activatedAt: timestamp("activated_at", { withTimezone: true }),
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

export type HelpArticleBlock = {
  type: "paragraph" | "heading" | "notice" | "checklist" | "image" | "video" | "link";
  text?: string;
  level?: 2 | 3;
  items?: string[];
  url?: string;
  label?: string;
};

export const helpTrainingCategories = pgTable("help_training_categories", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const helpTrainingVideos = pgTable(
  "help_training_videos",
  {
    id: text("id").primaryKey(),
    categoryId: text("category_id")
      .notNull()
      .references(() => helpTrainingCategories.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    videoId: text("video_id").notNull(),
    audience: text("audience"),
    isEssential: boolean("is_essential").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    status: helpContentStatus("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("help_training_videos_category_idx").on(table.categoryId),
    index("help_training_videos_status_idx").on(table.status),
  ],
);

export const helpArticles = pgTable(
  "help_articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    body: jsonb("body").$type<HelpArticleBlock[]>().notNull().default([]),
    status: helpContentStatus("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("help_articles_slug_unique").on(table.slug),
    index("help_articles_status_idx").on(table.status),
    index("help_articles_published_idx").on(table.publishedAt),
  ],
);

export const helpDestinations = pgTable(
  "help_destinations",
  {
    id: text("id").primaryKey(),
    kind: helpDestinationKind("kind").notNull(),
    eyebrow: text("eyebrow").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    actionLabel: text("action_label").notNull(),
    icon: text("icon").notNull(),
    href: text("href"),
    trainingIds: jsonb("training_ids").$type<string[]>().notNull().default([]),
    articleId: uuid("article_id").references(() => helpArticles.id, { onDelete: "set null" }),
    status: helpContentStatus("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("help_destinations_status_idx").on(table.status)],
);

export const helpQuestions = pgTable(
  "help_questions",
  {
    id: text("id").primaryKey(),
    eyebrow: text("eyebrow").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    compact: boolean("compact").notNull().default(false),
    searchLabel: text("search_label"),
    status: helpContentStatus("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("help_questions_status_idx").on(table.status)],
);

export const helpOptions = pgTable(
  "help_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: text("question_id")
      .notNull()
      .references(() => helpQuestions.id, { onDelete: "cascade" }),
    optionKey: text("option_key").notNull(),
    label: text("label").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
    nextQuestionId: text("next_question_id").references(() => helpQuestions.id, { onDelete: "set null" }),
    destinationId: text("destination_id").references(() => helpDestinations.id, { onDelete: "set null" }),
    opensSearch: boolean("opens_search").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("help_options_question_key_unique").on(table.questionId, table.optionKey),
    index("help_options_question_idx").on(table.questionId, table.sortOrder),
    index("help_options_destination_idx").on(table.destinationId),
  ],
);

export const helpSearchAliases = pgTable(
  "help_search_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    destinationId: text("destination_id")
      .notNull()
      .references(() => helpDestinations.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalizedAlias: text("normalized_alias").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("help_search_aliases_destination_unique").on(table.destinationId, table.normalizedAlias),
    index("help_search_aliases_normalized_idx").on(table.normalizedAlias),
  ],
);

export const helpContentVersions = pgTable(
  "help_content_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("help_content_versions_entity_version_unique").on(table.entityType, table.entityId, table.version),
    index("help_content_versions_entity_idx").on(table.entityType, table.entityId, table.version),
  ],
);
