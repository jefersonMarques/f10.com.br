import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  lt,
  or,
  sql,
} from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { webChatMessages, webChatSessions } from "$lib/server/db/chatSchema";
import { ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";
import { users } from "$lib/server/db/schema";
import { ticketMessages, tickets } from "$lib/server/db/supportSchema";
import {
  getInternalChat,
  listInternalChats,
} from "$lib/server/support/internalChatRepository";
import { canAccessTicket, type SupportPermissionMap } from "$lib/server/support/supportAccess";
import {
  listSupportChatMessageAttachments,
  listSupportMessageAttachments,
  type SupportMessageAttachmentListItem,
} from "$lib/server/support/supportMessageAttachmentRepository";

const DEFAULT_MESSAGE_PAGE_SIZE = 40;
const MAX_MESSAGE_PAGE_SIZE = 100;
const MAX_RELATED_TICKETS = 80;

export type InternalChatConversationCursor = {
  createdAt: Date;
  id: string;
};

export type InternalChatConversationMessage = {
  id: string;
  sourceSessionId: string;
  storageSource: "chat" | "ticket";
  authorType: "customer" | "user" | "system";
  authorUserName: string | null;
  visibility: "public" | "internal";
  channel: string;
  body: string;
  createdAt: Date;
  attachments: SupportMessageAttachmentListItem[];
};

export type InternalChatRelatedTicket = {
  id: string;
  ticketNumber: number;
  subject: string;
  status: string;
  priority: string;
  updatedAt: Date;
  isCurrent: boolean;
};

type SessionIdentity = {
  sessionId: string;
  customerContactId: string | null;
  legacyUserId: string | null;
  groupId: number | null;
  unitId: number | null;
};

type AccessibleConversationSession = SessionIdentity & {
  ticketId: string | null;
};

type RawConversationMessage = Omit<InternalChatConversationMessage, "attachments">;

type MessagePageOptions = {
  before?: InternalChatConversationCursor | null;
  after?: InternalChatConversationCursor | null;
  limit?: number;
};

function buildConversationKey(identity: SessionIdentity): string {
  if (
    identity.customerContactId &&
    identity.legacyUserId &&
    identity.groupId !== null &&
    identity.unitId !== null
  ) {
    return [
      "customer",
      identity.customerContactId,
      "legacy",
      identity.legacyUserId,
      "group",
      identity.groupId,
      "unit",
      identity.unitId,
    ].join(":");
  }

  if (identity.customerContactId) {
    return `customer:${identity.customerContactId}:generic`;
  }

  return `session:${identity.sessionId}`;
}

function compareMessagesAscending(
  left: Pick<RawConversationMessage, "createdAt" | "id">,
  right: Pick<RawConversationMessage, "createdAt" | "id">,
): number {
  const timeDifference = left.createdAt.getTime() - right.createdAt.getTime();
  if (timeDifference !== 0) return timeDifference;
  return left.id.localeCompare(right.id);
}

function compareMessagesDescending(
  left: Pick<RawConversationMessage, "createdAt" | "id">,
  right: Pick<RawConversationMessage, "createdAt" | "id">,
): number {
  return compareMessagesAscending(right, left);
}

function normalizedPageSize(value?: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MESSAGE_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(value ?? DEFAULT_MESSAGE_PAGE_SIZE), 1), MAX_MESSAGE_PAGE_SIZE);
}

async function listSessionIdentities(sessionIds: string[]): Promise<SessionIdentity[]> {
  if (sessionIds.length === 0) return [];

  return getDatabase()
    .select({
      sessionId: webChatSessions.id,
      customerContactId: webChatSessions.customerContactId,
      legacyUserId: webChatSessions.legacyUserId,
      groupId: webChatSessions.groupId,
      unitId: webChatSessions.unitId,
    })
    .from(webChatSessions)
    .where(inArray(webChatSessions.id, sessionIds));
}

export async function listInternalChatConversations(
  actorUserId: string,
  permissions: SupportPermissionMap,
) {
  const chats = await listInternalChats(actorUserId, permissions);
  if (chats.length === 0) return [];

  const identities = await listSessionIdentities(chats.map((chat) => chat.sessionId));
  const identityBySessionId = new Map(identities.map((identity) => [identity.sessionId, identity]));
  const grouped = new Map<string, typeof chats>();

  for (const chat of chats) {
    const identity = identityBySessionId.get(chat.sessionId) ?? {
      sessionId: chat.sessionId,
      customerContactId: null,
      legacyUserId: chat.customerContext?.legacyUserId ?? null,
      groupId: chat.customerContext?.groupId ?? null,
      unitId: chat.customerContext?.unitId ?? null,
    };
    const key = buildConversationKey(identity);
    const current = grouped.get(key) ?? [];
    current.push(chat);
    grouped.set(key, current);
  }

  return Array.from(grouped.entries())
    .map(([conversationKey, rows]) => {
      const byRecentActivity = [...rows].sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
      );
      const activeRows = byRecentActivity.filter(
        (row) => !["resolved", "closed"].includes(row.status),
      );
      const representative = activeRows[0] ?? byRecentActivity[0];
      const latestActivity = byRecentActivity[0];
      if (!representative || !latestActivity) return null;

      return {
        ...representative,
        conversationKey,
        sessionCount: rows.length,
        lastMessageBody: latestActivity.lastMessageBody,
        lastMessageAuthorType: latestActivity.lastMessageAuthorType,
        updatedAt: latestActivity.updatedAt,
      };
    })
    .filter((conversation): conversation is NonNullable<typeof conversation> => Boolean(conversation))
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

async function listAccessibleConversationSessions(
  actorUserId: string,
  permissions: SupportPermissionMap,
  anchorSessionId: string,
): Promise<{ conversationKey: string; sessions: AccessibleConversationSession[] }> {
  const anchor = await getInternalChat(actorUserId, permissions, anchorSessionId);
  const conversations = await listInternalChats(actorUserId, permissions);
  const sessionIds = Array.from(
    new Set([anchorSessionId, ...conversations.map((chat) => chat.sessionId)]),
  );
  const identities = await listSessionIdentities(sessionIds);
  const anchorIdentity = identities.find((identity) => identity.sessionId === anchorSessionId) ?? {
    sessionId: anchorSessionId,
    customerContactId: anchor.customerContactId,
    legacyUserId: anchor.customerContext?.legacyUserId ?? null,
    groupId: anchor.customerContext?.groupId ?? null,
    unitId: anchor.customerContext?.unitId ?? null,
  };
  const conversationKey = buildConversationKey(anchorIdentity);
  const accessibleById = new Map(
    conversations.map((chat) => [chat.sessionId, chat.ticketId]),
  );
  accessibleById.set(anchorSessionId, anchor.ticketId);

  const sessions = identities
    .filter((identity) => buildConversationKey(identity) === conversationKey)
    .filter((identity) => accessibleById.has(identity.sessionId))
    .map((identity) => ({
      ...identity,
      ticketId: accessibleById.get(identity.sessionId) ?? null,
    }));

  if (!sessions.some((session) => session.sessionId === anchorSessionId)) {
    sessions.push({
      ...anchorIdentity,
      ticketId: anchor.ticketId,
    });
  }

  return { conversationKey, sessions };
}

async function listRawConversationMessages(
  sessions: AccessibleConversationSession[],
  options: MessagePageOptions,
): Promise<{ messages: RawConversationMessage[]; hasOlder: boolean }> {
  const limit = normalizedPageSize(options.limit);
  const before = options.before ?? null;
  const after = options.after ?? null;
  if (before && after) throw new Error("CHAT_MESSAGE_CURSOR_INVALID");

  const chatSessionIds = sessions
    .filter((session) => !session.ticketId)
    .map((session) => session.sessionId);
  const linkedSessions = sessions.filter((session) => Boolean(session.ticketId));
  const ticketIds = linkedSessions
    .map((session) => session.ticketId)
    .filter((ticketId): ticketId is string => Boolean(ticketId));
  const sourceSessionByTicketId = new Map(
    linkedSessions
      .filter((session): session is AccessibleConversationSession & { ticketId: string } => Boolean(session.ticketId))
      .map((session) => [session.ticketId, session.sessionId]),
  );

  const descending = !after;
  const sourceLimit = limit + 1;
  const db = getDatabase();

  const chatMessagesPromise = chatSessionIds.length === 0
    ? Promise.resolve([] as RawConversationMessage[])
    : db
        .select({
          id: webChatMessages.id,
          sourceSessionId: webChatMessages.sessionId,
          authorType: webChatMessages.authorType,
          authorUserName: users.name,
          visibility: webChatMessages.visibility,
          channel: sql<string>`'web_chat'`,
          body: webChatMessages.body,
          createdAt: webChatMessages.createdAt,
        })
        .from(webChatMessages)
        .leftJoin(users, eq(webChatMessages.authorUserId, users.id))
        .where(
          and(
            inArray(webChatMessages.sessionId, chatSessionIds),
            before
              ? or(
                  lt(webChatMessages.createdAt, before.createdAt),
                  and(
                    eq(webChatMessages.createdAt, before.createdAt),
                    lt(webChatMessages.id, before.id),
                  ),
                )
              : undefined,
            after
              ? or(
                  gt(webChatMessages.createdAt, after.createdAt),
                  and(
                    eq(webChatMessages.createdAt, after.createdAt),
                    gt(webChatMessages.id, after.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(
          descending ? desc(webChatMessages.createdAt) : asc(webChatMessages.createdAt),
          descending ? desc(webChatMessages.id) : asc(webChatMessages.id),
        )
        .limit(sourceLimit)
        .then((rows) => rows.map((row) => ({ ...row, storageSource: "chat" as const })));

  const ticketMessagesPromise = ticketIds.length === 0
    ? Promise.resolve([] as RawConversationMessage[])
    : db
        .select({
          id: ticketMessages.id,
          ticketId: ticketMessages.ticketId,
          authorType: ticketMessages.authorType,
          authorUserName: users.name,
          visibility: ticketMessages.visibility,
          channel: ticketMessages.channel,
          body: ticketMessages.body,
          createdAt: ticketMessages.createdAt,
        })
        .from(ticketMessages)
        .leftJoin(users, eq(ticketMessages.authorUserId, users.id))
        .where(
          and(
            inArray(ticketMessages.ticketId, ticketIds),
            before
              ? or(
                  lt(ticketMessages.createdAt, before.createdAt),
                  and(
                    eq(ticketMessages.createdAt, before.createdAt),
                    lt(ticketMessages.id, before.id),
                  ),
                )
              : undefined,
            after
              ? or(
                  gt(ticketMessages.createdAt, after.createdAt),
                  and(
                    eq(ticketMessages.createdAt, after.createdAt),
                    gt(ticketMessages.id, after.id),
                  ),
                )
              : undefined,
          ),
        )
        .orderBy(
          descending ? desc(ticketMessages.createdAt) : asc(ticketMessages.createdAt),
          descending ? desc(ticketMessages.id) : asc(ticketMessages.id),
        )
        .limit(sourceLimit)
        .then((rows) => rows.map((row) => ({
          id: row.id,
          sourceSessionId: sourceSessionByTicketId.get(row.ticketId) ?? "",
          storageSource: "ticket" as const,
          authorType: row.authorType,
          authorUserName: row.authorUserName,
          visibility: row.visibility,
          channel: row.channel,
          body: row.body,
          createdAt: row.createdAt,
        })));

  const [chatMessages, linkedTicketMessages] = await Promise.all([
    chatMessagesPromise,
    ticketMessagesPromise,
  ]);
  const merged = [...chatMessages, ...linkedTicketMessages]
    .filter((message) => Boolean(message.sourceSessionId));

  if (after) {
    const messages = merged.sort(compareMessagesAscending).slice(0, limit);
    return { messages, hasOlder: false };
  }

  const newestFirst = merged.sort(compareMessagesDescending);
  const hasOlder = newestFirst.length > limit;
  const messages = newestFirst.slice(0, limit).sort(compareMessagesAscending);
  return { messages, hasOlder };
}

async function hydrateMessageAttachments(
  messages: RawConversationMessage[],
): Promise<InternalChatConversationMessage[]> {
  if (messages.length === 0) return [];

  const chatMessageIds = messages
    .filter((message) => message.storageSource === "chat")
    .map((message) => message.id);
  const ticketMessageIds = messages
    .filter((message) => message.storageSource === "ticket")
    .map((message) => message.id);
  const [chatAttachments, ticketAttachments] = await Promise.all([
    listSupportChatMessageAttachments(chatMessageIds),
    listSupportMessageAttachments(ticketMessageIds),
  ]);
  const attachmentsByMessageId = new Map<string, SupportMessageAttachmentListItem[]>();

  for (const attachment of [...chatAttachments, ...ticketAttachments]) {
    const current = attachmentsByMessageId.get(attachment.messageId) ?? [];
    current.push(attachment);
    attachmentsByMessageId.set(attachment.messageId, current);
  }

  return messages.map((message) => ({
    ...message,
    attachments: attachmentsByMessageId.get(message.id) ?? [],
  }));
}

export async function listInternalChatConversationMessages(
  actorUserId: string,
  permissions: SupportPermissionMap,
  anchorSessionId: string,
  options: MessagePageOptions = {},
) {
  const chat = await getInternalChat(actorUserId, permissions, anchorSessionId);
  const { conversationKey, sessions } = await listAccessibleConversationSessions(
    actorUserId,
    permissions,
    anchorSessionId,
  );
  const page = await listRawConversationMessages(sessions, options);

  return {
    chat,
    conversationKey,
    messages: await hydrateMessageAttachments(page.messages),
    hasOlder: page.hasOlder,
  };
}

export async function listInternalChatRelatedTickets(
  actorUserId: string,
  permissions: SupportPermissionMap,
  anchorSessionId: string,
): Promise<InternalChatRelatedTicket[]> {
  const ticketViewScope = getPermissionScope(permissions, "tickets.view");
  if (!ticketViewScope) return [];

  const chat = await getInternalChat(actorUserId, permissions, anchorSessionId);
  if (!chat.customerContactId) return [];

  const rows = await getDatabase()
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      updatedAt: tickets.updatedAt,
      contextScope: ticketCustomerContexts.contextScope,
      legacyUserId: ticketCustomerContexts.legacyUserId,
      groupId: ticketCustomerContexts.groupId,
      unitId: ticketCustomerContexts.unitId,
    })
    .from(tickets)
    .leftJoin(ticketCustomerContexts, eq(ticketCustomerContexts.ticketId, tickets.id))
    .where(eq(tickets.customerContactId, chat.customerContactId))
    .orderBy(desc(tickets.updatedAt))
    .limit(MAX_RELATED_TICKETS);

  const context = chat.customerContext;
  const candidates = rows.filter((row) => {
    if (row.id === chat.ticketId) return true;
    if (!context) return true;
    return (
      row.contextScope === "unit" &&
      row.legacyUserId === context.legacyUserId &&
      row.groupId === context.groupId &&
      row.unitId === context.unitId
    );
  });

  const accessible = await Promise.all(
    candidates.map(async (ticket) => ({
      ticket,
      allowed: await canAccessTicket(actorUserId, ticketViewScope, ticket.id),
    })),
  );

  return accessible
    .filter((item) => item.allowed)
    .map(({ ticket }) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      updatedAt: ticket.updatedAt,
      isCurrent: ticket.id === chat.ticketId,
    }));
}
