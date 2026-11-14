import { index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export type MessageSourceKind = "chat" | "ticket";
export type MessageReactionCode = "like" | "heart" | "check" | "eyes";
export type ReactionActorKind = "agent" | "customer";

export const supportMessageReactions = pgTable(
  "support_message_reactions",
  {
    sourceKind: text("source_kind").$type<MessageSourceKind>().notNull(),
    messageId: uuid("message_id").notNull(),
    actorKind: text("actor_kind").$type<ReactionActorKind>().notNull(),
    actorKey: text("actor_key").notNull(),
    reaction: text("reaction").$type<MessageReactionCode>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.sourceKind, table.messageId, table.actorKind, table.actorKey] }),
    index("support_message_reactions_message_idx").on(table.sourceKind, table.messageId),
  ],
);