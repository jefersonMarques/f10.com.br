import { env } from "$env/dynamic/private";
import {
  createHash,
  createHmac,
  randomBytes,
} from "node:crypto";
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
} from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  supportPublicLimits,
  webChatSessions,
} from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { sessions, users } from "$lib/server/db/schema";
import {
  customerContacts,
  supportQueues,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";

const CHAT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const START_WINDOW_MS = 10 * 60 * 1000;
const START_BLOCK_MS = 30 * 60 * 1000;
const MESSAGE_WINDOW_MS = 60 * 1000;
const MESSAGE_BLOCK_MS = 5 * 60 * 1000;
const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export type StartPublicChatInput = {
  name: string;
  email: string;
  phone: string;
  message: string;
  contextUrl: string;
  contextData: Record<string, unknown>;
  enableAi: boolean;
};

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createPublicLimitKey(
  scope: string,
  clientAddress: string,
): string {
  const secret = env.SUPPORT_RATE_LIMIT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("SUPPORT_RATE_LIMIT_SECRET must have at least 32 characters.");
  }

  return createHmac("sha256", secret)
    .update(`${scope}:${clientAddress}`)
    .digest("hex");
}

async function consumePublicLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
  blockMs: number,
): Promise<boolean> {
  const db = getDatabase();
  const now = new Date();
  const [state] = await db
    .select({
      requestCount: supportPublicLimits.requestCount,
      windowStartedAt: supportPublicLimits.windowStartedAt,
      blockedUntil: supportPublicLimits.blockedUntil,
    })
    .from(supportPublicLimits)
    .where(eq(supportPublicLimits.key, key))
    .limit(1);

  if (!state) {
    await db.insert(supportPublicLimits).values({
      key,
      requestCount: 1,
      windowStartedAt: now,
    });
    return true;
  }

  if (state.blockedUntil && state.blockedUntil > now) return false;

  if (now.getTime() - state.windowStartedAt.getTime() >= windowMs) {
    await db
      .update(supportPublicLimits)
      .set({
        requestCount: 1,
        windowStartedAt: now,
        blockedUntil: null,
        updatedAt: now,
      })
      .where(eq(supportPublicLimits.key, key));
    return true;
  }

  if (state.requestCount >= maxRequests) {
    await db
      .update(supportPublicLimits)
      .set({
        blockedUntil: new Date(now.getTime() + blockMs),
        updatedAt: now,
      })
      .where(eq(supportPublicLimits.key, key));
    return false;
  }

  await db
    .update(supportPublicLimits)
    .set({
      requestCount: state.requestCount + 1,
      updatedAt: now,
    })
    .where(eq(supportPublicLimits.key, key));

  return true;
}

async function findOrCreateChatCustomer(
  name: string,
  email: string,
  phone: string,
): Promise<string> {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail) {
    const [existing] = await db
      .select({ id: customerContacts.id })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.email, normalizedEmail),
          eq(customerContacts.active, true),
        ),
      )
      .limit(1);

    if (existing) return existing.id;
  }

  const [contact] = await db
    .insert(customerContacts)
    .values({
      name: name.trim(),
      email: normalizedEmail || null,
      phone: phone.trim() || null,
    })
    .returning({ id: customerContacts.id });

  if (!contact) throw new Error("CHAT_CUSTOMER_NOT_CREATED");
  return contact.id;
}

export async function startPublicChat(
  clientAddress: string,
  input: StartPublicChatInput,
) {
  const limitKey = createPublicLimitKey("chat-start", clientAddress);
  const allowed = await consumePublicLimit(
    limitKey,
    5,
    START_WINDOW_MS,
    START_BLOCK_MS,
  );

  if (!allowed) throw new Error("CHAT_RATE_LIMITED");

  const db = getDatabase();
  const [queue] = await db
    .select({ id: supportQueues.id })
    .from(supportQueues)
    .where(
      and(eq(supportQueues.code, "support"), eq(supportQueues.active, true)),
    )
    .limit(1);

  if (!queue) throw new Error("CHAT_QUEUE_NOT_FOUND");

  const customerContactId = await findOrCreateChatCustomer(
    input.name,
    input.email,
    input.phone,
  );
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + CHAT_SESSION_TTL_MS);

  const result = await db.transaction(async (tx) => {
    const [ticket] = await tx
      .insert(tickets)
      .values({
        customerContactId,
        queueId: queue.id,
        subject: `Chat: ${input.message.trim().slice(0, 120)}`,
        status: "new",
        priority: "normal",
        channel: "web_chat",
      })
      .returning({ id: tickets.id, ticketNumber: tickets.ticketNumber });

    if (!ticket) throw new Error("CHAT_TICKET_NOT_CREATED");

    await tx.insert(ticketMessages).values({
      ticketId: ticket.id,
      authorType: "customer",
      customerContactId,
      visibility: "public",
      channel: "web_chat",
      body: input.message.trim(),
    });

    const aiState = input.enableAi ? "active" : "disabled";
    const [session] = await tx
      .insert(webChatSessions)
      .values({
        ticketId: ticket.id,
        tokenHash,
        expiresAt,
        contextUrl: input.contextUrl || null,
        contextData: input.contextData,
        aiState,
      })
      .returning({ id: webChatSessions.id });

    if (!session) throw new Error("CHAT_SESSION_NOT_CREATED");

    await tx.insert(ticketEvents).values({
      ticketId: ticket.id,
      eventType: "chat.started",
      metadata: {
        contextUrl: input.contextUrl || null,
        aiState,
      },
    });

    return {
      sessionId: session.id,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      customerContactId,
      aiState,
    };
  });

  return { ...result, token, expiresAt };
}

export async function authorizePublicChatSession(
  sessionId: string,
  token: string,
) {
  const db = getDatabase();
  const now = new Date();
  const [session] = await db
    .select({
      id: webChatSessions.id,
      ticketId: webChatSessions.ticketId,
      expiresAt: webChatSessions.expiresAt,
      aiState: webChatSessions.aiState,
    })
    .from(webChatSessions)
    .where(
      and(
        eq(webChatSessions.id, sessionId),
        eq(webChatSessions.tokenHash, hashSessionToken(token)),
        gt(webChatSessions.expiresAt, now),
        isNull(webChatSessions.closedAt),
      ),
    )
    .limit(1);

  if (!session) throw new Error("CHAT_SESSION_INVALID");

  await db
    .update(webChatSessions)
    .set({ lastSeenAt: now })
    .where(eq(webChatSessions.id, sessionId));

  return session;
}

export async function listPublicChatMessages(
  sessionId: string,
  token: string,
) {
  const session = await authorizePublicChatSession(sessionId, token);
  const db = getDatabase();
  const messages = await db
    .select({
      id: ticketMessages.id,
      authorType: ticketMessages.authorType,
      authorUserId: ticketMessages.authorUserId,
      authorUserName: users.name,
      body: ticketMessages.body,
      createdAt: ticketMessages.createdAt,
    })
    .from(ticketMessages)
    .leftJoin(users, eq(ticketMessages.authorUserId, users.id))
    .where(
      and(
        eq(ticketMessages.ticketId, session.ticketId),
        eq(ticketMessages.visibility, "public"),
      ),
    )
    .orderBy(asc(ticketMessages.createdAt));

  const authorIds = Array.from(
    new Set(messages.map((message) => message.authorUserId).filter((id): id is string => Boolean(id))),
  );
  let onlineUserIds = new Set<string>();

  if (authorIds.length > 0) {
    const now = new Date();
    const onlineRows = await db
      .select({ userId: sessions.userId })
      .from(sessions)
      .where(
        and(
          inArray(sessions.userId, authorIds),
          gt(sessions.expiresAt, now),
          gt(sessions.lastSeenAt, new Date(now.getTime() - ONLINE_WINDOW_MS)),
          isNull(sessions.revokedAt),
        ),
      )
      .groupBy(sessions.userId);
    onlineUserIds = new Set(onlineRows.map((row) => row.userId));
  }

  return messages.map((message) => ({
    ...message,
    authorOnline: message.authorUserId ? onlineUserIds.has(message.authorUserId) : false,
    avatarUrl: message.authorUserId
      ? `/api/support/agents/${encodeURIComponent(message.authorUserId)}/avatar`
      : null,
  }));
}

export async function addPublicChatMessage(
  clientAddress: string,
  sessionId: string,
  token: string,
  body: string,
): Promise<{ ticketId: string; aiState: "active" | "escalated" | "human" | "disabled" }> {
  const session = await authorizePublicChatSession(sessionId, token);
  const limitKey = createPublicLimitKey(
    `chat-message:${sessionId}`,
    clientAddress,
  );
  const allowed = await consumePublicLimit(
    limitKey,
    30,
    MESSAGE_WINDOW_MS,
    MESSAGE_BLOCK_MS,
  );

  if (!allowed) throw new Error("CHAT_RATE_LIMITED");

  const db = getDatabase();
  const now = new Date();
  const [ticket] = await db
    .select({
      status: tickets.status,
      customerContactId: tickets.customerContactId,
      assignedUserId: tickets.assignedUserId,
      ticketNumber: tickets.ticketNumber,
    })
    .from(tickets)
    .where(eq(tickets.id, session.ticketId))
    .limit(1);

  if (!ticket || ticket.status === "closed") {
    throw new Error("CHAT_TICKET_CLOSED");
  }

  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({
      ticketId: session.ticketId,
      authorType: "customer",
      customerContactId: ticket.customerContactId,
      visibility: "public",
      channel: "web_chat",
      body: body.trim(),
    });

    await tx
      .update(tickets)
      .set({
        status:
          ticket.status === "resolved" ||
          ticket.status === "waiting_customer"
            ? "open"
            : ticket.status,
        updatedAt: now,
      })
      .where(eq(tickets.id, session.ticketId));

    await tx.insert(ticketEvents).values({
      ticketId: session.ticketId,
      eventType: "chat.customer.message",
      metadata: { aiState: session.aiState },
    });

    if (ticket.assignedUserId && session.aiState !== "active") {
      await tx.insert(internalNotifications).values({
        userId: ticket.assignedUserId,
        kind: "ticket.customer_reply",
        title: `Cliente respondeu o ticket #${ticket.ticketNumber}`,
        body: body.trim().slice(0, 500),
        href: `/app/tickets/${session.ticketId}`,
        entityType: "ticket",
        entityId: session.ticketId,
      });
    }
  });

  return { ticketId: session.ticketId, aiState: session.aiState };
}
