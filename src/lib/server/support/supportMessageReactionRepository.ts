import { and, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  supportMessageReactions,
  type MessageReactionCode,
  type MessageSourceKind,
  type ReactionActorKind,
} from "$lib/server/db/supportMessageReactionSchema";

export type MessageReactionCount = { code: MessageReactionCode; count: number };
export type MessageReactionSummary = {
  reactions: MessageReactionCount[];
  myReaction: MessageReactionCode | null;
};

export const EMPTY_REACTION_SUMMARY: MessageReactionSummary = {
  reactions: [],
  myReaction: null,
};

export function isMessageReactionCode(value: unknown): value is MessageReactionCode {
  return value === "like" || value === "heart" || value === "check" || value === "eyes";
}

export function isMessageSourceKind(value: unknown): value is MessageSourceKind {
  return value === "chat" || value === "ticket";
}

export async function listMessageReactionSummaries(
  sourceKind: MessageSourceKind,
  messageIds: string[],
  actorKind: ReactionActorKind,
  actorKey: string,
): Promise<Map<string, MessageReactionSummary>> {
  const uniqueIds = Array.from(new Set(messageIds));
  const result = new Map<string, MessageReactionSummary>();
  if (uniqueIds.length === 0) return result;

  const rows = await getDatabase()
    .select({
      messageId: supportMessageReactions.messageId,
      reaction: supportMessageReactions.reaction,
      count: sql<number>`count(*)::integer`,
      mine: sql<boolean>`bool_or(${supportMessageReactions.actorKind} = ${actorKind} AND ${supportMessageReactions.actorKey} = ${actorKey})`,
    })
    .from(supportMessageReactions)
    .where(and(
      eq(supportMessageReactions.sourceKind, sourceKind),
      inArray(supportMessageReactions.messageId, uniqueIds),
    ))
    .groupBy(supportMessageReactions.messageId, supportMessageReactions.reaction);

  for (const row of rows) {
    const summary = result.get(row.messageId) ?? { reactions: [], myReaction: null };
    summary.reactions.push({ code: row.reaction, count: row.count });
    if (row.mine) summary.myReaction = row.reaction;
    result.set(row.messageId, summary);
  }
  return result;
}

export async function toggleMessageReaction(
  sourceKind: MessageSourceKind,
  messageId: string,
  actorKind: ReactionActorKind,
  actorKey: string,
  reaction: MessageReactionCode,
): Promise<MessageReactionCode | null> {
  if (!actorKey || actorKey.length > 180) throw new Error("REACTION_ACTOR_INVALID");
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const predicate = and(
      eq(supportMessageReactions.sourceKind, sourceKind),
      eq(supportMessageReactions.messageId, messageId),
      eq(supportMessageReactions.actorKind, actorKind),
      eq(supportMessageReactions.actorKey, actorKey),
    );
    const [current] = await tx.select({ reaction: supportMessageReactions.reaction })
      .from(supportMessageReactions)
      .where(predicate)
      .for("update");

    let selected: MessageReactionCode | null = reaction;
    if (current?.reaction === reaction) {
      await tx.delete(supportMessageReactions).where(predicate);
      selected = null;
    } else {
      await tx.insert(supportMessageReactions).values({
        sourceKind, messageId, actorKind, actorKey, reaction,
      }).onConflictDoUpdate({
        target: [
          supportMessageReactions.sourceKind,
          supportMessageReactions.messageId,
          supportMessageReactions.actorKind,
          supportMessageReactions.actorKey,
        ],
        set: { reaction, createdAt: new Date() },
      });
    }

    // Atualiza a revisão da conversa para propagar reações sem exigir F5.
    if (sourceKind === "ticket") {
      await tx.execute(sql`
        UPDATE tickets SET updated_at = now()
        WHERE id = (SELECT ticket_id FROM ticket_messages WHERE id = ${messageId}::uuid)
      `);
    } else {
      await tx.execute(sql`
        UPDATE web_chat_sessions SET updated_at = now()
        WHERE id = (SELECT session_id FROM web_chat_messages WHERE id = ${messageId}::uuid)
      `);
    }

    return selected;
  });
}
