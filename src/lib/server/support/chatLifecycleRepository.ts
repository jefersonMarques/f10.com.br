import { and, eq, isNull } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { webChatMessages, webChatSessions } from "$lib/server/db/chatSchema";
import { ticketEvents, ticketMessages, tickets } from "$lib/server/db/supportSchema";
import {
  getUserSupportQueueIds,
  requireTicketAccess,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";

async function requireChatAccess(
  actorUserId: string,
  scope: "own" | "team" | "all",
  chat: { ticketId: string | null; queueId: string; assignedUserId: string | null },
): Promise<void> {
  if (chat.ticketId) {
    await requireTicketAccess(actorUserId, scope, chat.ticketId);
    return;
  }
  if (scope === "all" || chat.assignedUserId === actorUserId) return;
  if (scope === "team") {
    const queueIds = await getUserSupportQueueIds(actorUserId);
    if (queueIds.includes(chat.queueId)) return;
  }
  throw new Error("CHAT_ACCESS_DENIED");
}

export async function finishInternalChat(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
): Promise<void> {
  const scope = getPermissionScope(permissions, "chat.respond");
  if (!scope) throw new Error("CHAT_PERMISSION_NOT_ALLOWED");

  const db = getDatabase();
  const [chat] = await db
    .select({
      ticketId: webChatSessions.ticketId,
      queueId: webChatSessions.queueId,
      assignedUserId: webChatSessions.assignedUserId,
      ticketResolvedAt: tickets.resolvedAt,
    })
    .from(webChatSessions)
    .leftJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
    .where(
      and(
        eq(webChatSessions.id, sessionId),
        isNull(webChatSessions.closedAt),
      ),
    )
    .limit(1);

  if (!chat) throw new Error("CHAT_NOT_FOUND");
  await requireChatAccess(actorUserId, scope, chat);

  if (chat.assignedUserId && chat.assignedUserId !== actorUserId) {
    throw new Error("CHAT_ASSIGNED_TO_OTHER_USER");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(webChatSessions)
      .set({
        closedAt: now,
        aiState: "disabled",
        aiProcessingAt: null,
        updatedAt: now,
      })
      .where(eq(webChatSessions.id, sessionId));

    if (chat.ticketId) {
      await tx
        .update(tickets)
        .set({
          status: "closed",
          resolvedAt: chat.ticketResolvedAt ?? now,
          closedAt: now,
          updatedAt: now,
        })
        .where(eq(tickets.id, chat.ticketId));

      await tx.insert(ticketMessages).values({
        ticketId: chat.ticketId,
        authorType: "system",
        visibility: "public",
        channel: "web_chat",
        body: "Atendimento finalizado pela equipe F10.",
      });

      await tx.insert(ticketEvents).values({
        ticketId: chat.ticketId,
        actorUserId,
        eventType: "chat.closed",
        metadata: { sessionId },
      });
    } else {
      await tx.insert(webChatMessages).values({
        sessionId,
        authorType: "system",
        body: "Atendimento finalizado pela equipe F10.",
      });
    }
  });
}
