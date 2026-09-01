import { and, count, desc, eq, inArray, isNull, like, ne, notLike, or } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { internalNotifications } from "$lib/server/db/notificationSchema";

export type NotificationEntityType = "ticket" | "task" | "chat" | "system";

export type CreateNotificationInput = {
  userId: string;
  actorUserId?: string | null;
  kind: string;
  title: string;
  body?: string;
  href: string;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
};

export async function createInternalNotification(input: CreateNotificationInput): Promise<void> {
  if (input.actorUserId && input.actorUserId === input.userId) return;

  const db = getDatabase();
  await db.insert(internalNotifications).values({
    userId: input.userId,
    actorUserId: input.actorUserId ?? null,
    kind: input.kind.slice(0, 80),
    title: input.title.slice(0, 180),
    body: (input.body ?? "").slice(0, 500),
    href: input.href.slice(0, 1000),
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
  });
}

export async function createInternalNotifications(inputs: CreateNotificationInput[]): Promise<void> {
  const rows = inputs
    .filter((input) => !input.actorUserId || input.actorUserId !== input.userId)
    .map((input) => ({
      userId: input.userId,
      actorUserId: input.actorUserId ?? null,
      kind: input.kind.slice(0, 80),
      title: input.title.slice(0, 180),
      body: (input.body ?? "").slice(0, 500),
      href: input.href.slice(0, 1000),
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    }));

  if (rows.length === 0) return;
  const db = getDatabase();
  await db.insert(internalNotifications).values(rows);
}

export async function getNotificationSummary(userId: string) {
  const db = getDatabase();
  const chatNotificationCondition = or(
    like(internalNotifications.kind, "chat.%"),
    and(
      eq(internalNotifications.kind, "ticket.customer_reply"),
      like(internalNotifications.href, "/app/chat/%"),
    ),
  );
  const nonChatTicketCondition = and(
    notLike(internalNotifications.kind, "chat.%"),
    or(
      ne(internalNotifications.kind, "ticket.customer_reply"),
      notLike(internalNotifications.href, "/app/chat/%"),
    ),
  );

  const [recent, unreadRows, ticketRows, taskRows, chatRows] = await Promise.all([
    db
      .select({
        id: internalNotifications.id,
        kind: internalNotifications.kind,
        title: internalNotifications.title,
        body: internalNotifications.body,
        href: internalNotifications.href,
        entityType: internalNotifications.entityType,
        entityId: internalNotifications.entityId,
        readAt: internalNotifications.readAt,
        createdAt: internalNotifications.createdAt,
      })
      .from(internalNotifications)
      .where(eq(internalNotifications.userId, userId))
      .orderBy(desc(internalNotifications.createdAt))
      .limit(12),
    db
      .select({ value: count() })
      .from(internalNotifications)
      .where(and(eq(internalNotifications.userId, userId), isNull(internalNotifications.readAt))),
    db
      .select({ value: count() })
      .from(internalNotifications)
      .where(
        and(
          eq(internalNotifications.userId, userId),
          eq(internalNotifications.entityType, "ticket"),
          nonChatTicketCondition,
          isNull(internalNotifications.readAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(internalNotifications)
      .where(
        and(
          eq(internalNotifications.userId, userId),
          eq(internalNotifications.entityType, "task"),
          isNull(internalNotifications.readAt),
        ),
      ),
    db
      .select({ value: count() })
      .from(internalNotifications)
      .where(
        and(
          eq(internalNotifications.userId, userId),
          chatNotificationCondition,
          isNull(internalNotifications.readAt),
        ),
      ),
  ]);

  return {
    unreadCount: Number(unreadRows[0]?.value ?? 0),
    ticketUnreadCount: Number(ticketRows[0]?.value ?? 0),
    taskUnreadCount: Number(taskRows[0]?.value ?? 0),
    chatUnreadCount: Number(chatRows[0]?.value ?? 0),
    recent,
  };
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<string | null> {
  const db = getDatabase();
  const [notification] = await db
    .select({ href: internalNotifications.href })
    .from(internalNotifications)
    .where(and(eq(internalNotifications.id, notificationId), eq(internalNotifications.userId, userId)))
    .limit(1);

  if (!notification) return null;

  await db
    .update(internalNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(internalNotifications.id, notificationId), eq(internalNotifications.userId, userId)));
  return notification.href;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const db = getDatabase();
  await db
    .update(internalNotifications)
    .set({ readAt: new Date() })
    .where(and(eq(internalNotifications.userId, userId), isNull(internalNotifications.readAt)));
}

export async function markEntityNotificationsRead(
  userId: string,
  entityType: NotificationEntityType,
  entityId: string,
): Promise<void> {
  const db = getDatabase();
  await db
    .update(internalNotifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(internalNotifications.userId, userId),
        eq(internalNotifications.entityType, entityType),
        eq(internalNotifications.entityId, entityId),
        isNull(internalNotifications.readAt),
      ),
    );
}

export async function deleteNotificationsForEntities(
  entityType: NotificationEntityType,
  entityIds: string[],
): Promise<void> {
  if (entityIds.length === 0) return;
  const db = getDatabase();
  await db
    .delete(internalNotifications)
    .where(and(eq(internalNotifications.entityType, entityType), inArray(internalNotifications.entityId, entityIds)));
}
