import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { teams, users } from "$lib/server/db/schema";
import { supportQueues, ticketStatus, tickets } from "$lib/server/db/supportSchema";

export const ticketWorkflowKind = pgEnum("ticket_workflow_kind", ["global", "area"]);
export const ticketWorkflowStageType = pgEnum("ticket_workflow_stage_type", [
  "normal",
  "area_gateway",
  "terminal",
]);
export const ticketWorkflowTransitionType = pgEnum("ticket_workflow_transition_type", [
  "global_move",
  "area_move",
  "handoff",
]);

export const ticketAreas = pgTable(
  "ticket_areas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "set null" }),
    legacySupportQueueId: uuid("legacy_support_queue_id").references(() => supportQueues.id, {
      onDelete: "set null",
    }),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("ticket_areas_team_idx").on(table.teamId, table.active, table.name)],
);

export const ticketWorkflows = pgTable(
  "ticket_workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    kind: ticketWorkflowKind("kind").notNull(),
    queueId: uuid("queue_id").references(() => supportQueues.id, { onDelete: "restrict" }),
    areaId: uuid("area_id").references(() => ticketAreas.id, { onDelete: "restrict" }),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ticket_workflows_kind_idx").on(table.kind, table.active, table.updatedAt),
    index("ticket_workflows_area_idx").on(table.areaId, table.active),
  ],
);

export const ticketWorkflowStages = pgTable(
  "ticket_workflow_stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => ticketWorkflows.id, { onDelete: "restrict" }),
    code: text("code"),
    name: text("name").notNull(),
    stageType: ticketWorkflowStageType("stage_type").notNull().default("normal"),
    linkedQueueId: uuid("linked_queue_id").references(() => supportQueues.id, {
      onDelete: "restrict",
    }),
    linkedAreaId: uuid("linked_area_id").references(() => ticketAreas.id, {
      onDelete: "restrict",
    }),
    lifecycleStatus: ticketStatus("lifecycle_status").notNull().default("open"),
    isInitial: boolean("is_initial").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ticket_workflow_stages_code_unique").on(table.workflowId, table.code),
    index("ticket_workflow_stages_workflow_idx").on(table.workflowId, table.active, table.sortOrder),
    index("ticket_workflow_stages_queue_idx").on(table.linkedQueueId, table.active),
    index("ticket_workflow_stages_area_idx").on(table.linkedAreaId, table.active),
  ],
);

export const ticketWorkflowStates = pgTable(
  "ticket_workflow_states",
  {
    ticketId: uuid("ticket_id")
      .primaryKey()
      .references(() => tickets.id, { onDelete: "cascade" }),
    globalWorkflowId: uuid("global_workflow_id")
      .notNull()
      .references(() => ticketWorkflows.id, { onDelete: "restrict" }),
    globalStageId: uuid("global_stage_id")
      .notNull()
      .references(() => ticketWorkflowStages.id, { onDelete: "restrict" }),
    areaId: uuid("area_id").references(() => ticketAreas.id, { onDelete: "restrict" }),
    areaWorkflowId: uuid("area_workflow_id").references(() => ticketWorkflows.id, {
      onDelete: "restrict",
    }),
    areaStageId: uuid("area_stage_id").references(() => ticketWorkflowStages.id, {
      onDelete: "restrict",
    }),
    enteredAt: timestamp("entered_at", { withTimezone: true }).notNull().defaultNow(),
    areaEnteredAt: timestamp("area_entered_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ticket_workflow_states_global_idx").on(table.globalStageId, table.updatedAt),
    index("ticket_workflow_states_area_idx").on(
      table.areaWorkflowId,
      table.areaStageId,
      table.updatedAt,
    ),
    index("ticket_workflow_states_area_id_idx").on(table.areaId, table.areaStageId, table.updatedAt),
  ],
);

export const ticketWorkflowHistory = pgTable(
  "ticket_workflow_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    transitionType: ticketWorkflowTransitionType("transition_type").notNull(),
    fromWorkflowId: uuid("from_workflow_id").references(() => ticketWorkflows.id, {
      onDelete: "set null",
    }),
    toWorkflowId: uuid("to_workflow_id").references(() => ticketWorkflows.id, {
      onDelete: "set null",
    }),
    fromStageId: uuid("from_stage_id").references(() => ticketWorkflowStages.id, {
      onDelete: "set null",
    }),
    toStageId: uuid("to_stage_id").references(() => ticketWorkflowStages.id, {
      onDelete: "set null",
    }),
    fromAreaId: uuid("from_area_id").references(() => ticketAreas.id, { onDelete: "set null" }),
    toAreaId: uuid("to_area_id").references(() => ticketAreas.id, { onDelete: "set null" }),
    fromQueueId: uuid("from_queue_id").references(() => supportQueues.id, {
      onDelete: "set null",
    }),
    toQueueId: uuid("to_queue_id").references(() => supportQueues.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ticket_workflow_history_ticket_idx").on(table.ticketId, table.createdAt),
    index("ticket_workflow_history_queue_idx").on(table.toQueueId, table.createdAt),
    index("ticket_workflow_history_area_idx").on(table.toAreaId, table.createdAt),
  ],
);
