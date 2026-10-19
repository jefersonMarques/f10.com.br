import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "$lib/server/db/schema";

export type MovideskPublicationResult = {
  sourceId: number;
  status: "published" | "blocked" | "already-published";
  reason?: string;
};

// Único trabalho persistente. O cursor só avança após concluir cada artigo.
export const helpMovideskPublicationState = pgTable("help_movidesk_publication_state", {
  id: integer("id").primaryKey().default(1),
  enabled: boolean("enabled").notNull().default(false),
  phase: text("phase").notNull().default("idle"),
  sourceIds: jsonb("source_ids").$type<number[]>().notNull().default([]),
  cursor: integer("cursor").notNull().default(0),
  results: jsonb("results").$type<MovideskPublicationResult[]>().notNull().default([]),
  startedBy: uuid("started_by").references(() => users.id, { onDelete: "set null" }),
  nextRequestAt: timestamp("next_request_at", { withTimezone: true }).notNull().defaultNow(),
  lastError: text("last_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
