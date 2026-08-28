import { and, eq, inArray } from "drizzle-orm";
import { hasPermission, resolveUserPermissions } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { webChatMessages, webChatSessions } from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { users } from "$lib/server/db/schema";
import type { SupportPermissionMap } from "$lib/server/support/supportAccess";
import { getInternalChat } from "$lib/server/support/internalChatRepository";
import { listSupportAgents } from "$lib/server/support/supportRepository";

type MentionUser = { id: string; name: string; email: string };

async function canViewChat(
  user: MentionUser,
  sessionId: string,
): Promise<MentionUser | null> {
  const permissions = await resolveUserPermissions(user.id);
  if (!hasPermission(permissions, "chat.view")) return null;

  try {
    await getInternalChat(user.id, permissions, sessionId);
    return user;
  } catch {
    return null;
  }
}

export async function listInternalChatMentionUsers(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
): Promise<MentionUser[]> {
  if (!hasPermission(permissions, "chat.respond")) return [];
  await getInternalChat(actorUserId, permissions, sessionId);

  const candidates = await listSupportAgents();
  const resolved = await Promise.all(
    candidates.map((user) => canViewChat(user, sessionId)),
  );

  return resolved.filter((user): user is MentionUser => Boolean(user));
}

export async function addInternalChatNote(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sessionId: string,
  body: string,
  requestedMentionIds: string[],
): Promise<{ mentionedUserIds: string[] }> {
  if (!hasPermission(permissions, "chat.respond")) {
    throw new Error("CHAT_INTERNAL_NOTE_NOT_ALLOWED");
  }

  const chat = await getInternalChat(actorUserId, permissions, sessionId);
  if (chat.ticketId) throw new Error("CHAT_INTERNAL_NOTE_USE_TICKET");
  if (chat.closedAt) throw new Error("CHAT_CLOSED");

  const normalizedBody = body.trim();
  if (normalizedBody.length < 1 || normalizedBody.length > 10_000) {
    throw new Error("CHAT_INTERNAL_NOTE_INVALID");
  }

  const allowedMentionUsers = await listInternalChatMentionUsers(
    actorUserId,
    permissions,
    sessionId,
  );
  const requestedIds = new Set(
    requestedMentionIds
      .filter((id) => id !== actorUserId)
      .slice(0, 20),
  );
  const allowedIds = new Set(allowedMentionUsers.map((user) => user.id));
  const mentionedUserIds = Array.from(requestedIds).filter((id) => allowedIds.has(id));

  const db = getDatabase();
  const now = new Date();
  const activeMentions = mentionedUserIds.length > 0
    ? await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, mentionedUserIds), eq(users.status, "active")))
    : [];

  await db.transaction(async (tx) => {
    await tx.insert(webChatMessages).values({
      sessionId,
      authorType: "user",
      authorUserId: actorUserId,
      visibility: "internal",
      body: normalizedBody,
    });

    await tx
      .update(webChatSessions)
      .set({ updatedAt: now })
      .where(eq(webChatSessions.id, sessionId));

    if (activeMentions.length > 0) {
      await tx.insert(internalNotifications).values(
        activeMentions.map((user) => ({
          userId: user.id,
          actorUserId,
          kind: "chat.mention",
          title: "Você foi mencionado em uma conversa",
          body: normalizedBody.slice(0, 500),
          href: `/app/chat/${sessionId}`,
          entityType: "chat",
          entityId: sessionId,
        })),
      );
    }
  });

  return { mentionedUserIds: activeMentions.map((user) => user.id) };
}
