import { env } from "$env/dynamic/private";
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
} from "node:crypto";
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  sql,
} from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  supportPublicLimits,
  webChatSessions,
} from "$lib/server/db/chatSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { users } from "$lib/server/db/schema";
import { ticketMessageAttachments } from "$lib/server/db/supportChatEntrySchema";
import { supportAgentPresence } from "$lib/server/db/supportRoutingSchema";
import {
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";
import { SUPPORT_AWAY_AFTER_MS } from "$lib/server/support/supportAgentPresence";
import { resolveCustomerContact } from "$lib/server/support/customerResolutionRepository";
import { resolveSupportChatEntryOption } from "$lib/server/support/supportChatEntryRepository";
import {
  deleteStoredSupportImages,
  listSupportMessageAttachments,
  uploadSupportMessageImages,
} from "$lib/server/support/supportMessageAttachmentRepository";

const CHAT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const START_WINDOW_MS = 10 * 60 * 1000;
const START_BLOCK_MS = 30 * 60 * 1000;
const MESSAGE_WINDOW_MS = 60 * 1000;
const MESSAGE_BLOCK_MS = 5 * 60 * 1000;

export type StartPublicChatInput = {
  name: string;
  email: string;
  phone: string;
  message: string;
  contextUrl: string;
  contextData: Record<string, unknown>;
  entryOptionId: string | null;
  enableAi: boolean;
};

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function systemPresentation(body: string): "remote_access" | "routing" | "closed" | null {
  const normalized = body
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("acesso remoto")) return "remote_access";
  if (normalized.includes("encaminhad") || normalized.includes("assumiu o atendimento")) {
    return "routing";
  }
  if (normalized.includes("atendimento finalizado") || normalized.includes("atendimento encerrado")) {
    return "closed";
  }
  return null;
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

  const entryOption = await resolveSupportChatEntryOption(input.entryOptionId);
  const enableAi = input.enableAi && entryOption.initialHandling === "ai";
  const customerContactId = await resolveCustomerContact({
    name: input.name,
    email: input.email,
    phone: input.phone,
    whatsapp: "",
    organizationName: "",
  });
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + CHAT_SESSION_TTL_MS);
  const db = getDatabase();

  const result = await db.transaction(async (tx) => {
    const [ticket] = await tx
      .insert(tickets)
      .values({
        customerContactId,
        queueId: entryOption.queueId,
        subject: `Chat: ${input.message.trim().slice(0, 120)}`,
        status: "new",
        priority: "normal",
        channel: "web_chat",
        dueOn: sql`CURRENT_DATE + ${entryOption.defaultDueDays}::integer`,
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

    const aiState = enableAi ? "active" : "disabled";
    const [session] = await tx
      .insert(webChatSessions)
      .values({
        ticketId: ticket.id,
        tokenHash,
        expiresAt,
        contextUrl: input.contextUrl || null,
        contextData: {
          ...input.contextData,
          entryOptionId: entryOption.id,
          entryOptionLabel: entryOption.label,
        },
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
        entryOptionId: entryOption.id,
        entryOptionLabel: entryOption.label,
        queueId: entryOption.queueId,
      },
    });

    return {
      sessionId: session.id,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      customerContactId,
      aiState,
      entryOptionLabel: entryOption.label,
    };
  });

  return { ...result, token, expiresAt };
}

export async function addPublicChatSystemMessage(
  ticketId: string,
  body: string,
): Promise<void> {
  const normalizedBody = body.trim();
  if (!normalizedBody) return;

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "system",
      visibility: "public",
      channel: "web_chat",
      body: normalizedBody,
    });

    await tx
      .update(tickets)
      .set({ updatedAt: now })
      .where(eq(tickets.id, ticketId));

    await tx.insert(ticketEvents).values({
      ticketId,
      eventType: "chat.system.message",
      metadata: { reason: "support_hours" },
    });
  });
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

  const [attachmentRows, onlineRows] = await Promise.all([
    listSupportMessageAttachments(messages.map((message) => message.id)),
    (async () => {
      const authorIds = Array.from(
        new Set(
          messages
            .map((message) => message.authorUserId)
            .filter((id): id is string => Boolean(id)),
        ),
      );
      if (authorIds.length === 0) return [];
      const now = new Date();
      return db
        .select({ userId: supportAgentPresence.userId })
        .from(supportAgentPresence)
        .where(
          and(
            inArray(supportAgentPresence.userId, authorIds),
            eq(supportAgentPresence.manualStatus, "online"),
            gt(
              supportAgentPresence.lastActivityAt,
              new Date(now.getTime() - SUPPORT_AWAY_AFTER_MS),
            ),
          ),
        );
    })(),
  ]);

  const attachmentsByMessage = new Map<string, typeof attachmentRows>();
  for (const attachment of attachmentRows) {
    const current = attachmentsByMessage.get(attachment.messageId) ?? [];
    current.push(attachment);
    attachmentsByMessage.set(attachment.messageId, current);
  }
  const onlineUserIds = new Set(onlineRows.map((row) => row.userId));

  return messages.map((message) => ({
    ...message,
    authorOnline: message.authorUserId ? onlineUserIds.has(message.authorUserId) : false,
    avatarUrl: message.authorUserId
      ? `/api/support/agents/${encodeURIComponent(message.authorUserId)}/avatar`
      : null,
    presentation: message.authorType === "system" ? systemPresentation(message.body) : null,
    attachments: (attachmentsByMessage.get(message.id) ?? []).map((attachment) => ({
      id: attachment.id,
      originalName: attachment.originalName,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      url: `/api/support/chat/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(attachment.id)}?token=${encodeURIComponent(token)}`,
    })),
  }));
}

export async function addPublicChatMessage(
  clientAddress: string,
  sessionId: string,
  token: string,
  body: string,
  files: File[] = [],
): Promise<{
  ticketId: string;
  messageId: string;
  aiState: "active" | "escalated" | "human" | "disabled";
}> {
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

  const messageId = randomUUID();
  const normalizedBody = body.trim();
  const storedImages = await uploadSupportMessageImages(session.ticketId, messageId, files);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(ticketMessages).values({
        id: messageId,
        ticketId: session.ticketId,
        authorType: "customer",
        customerContactId: ticket.customerContactId,
        visibility: "public",
        channel: "web_chat",
        body: normalizedBody,
      });

      if (storedImages.length > 0) {
        await tx.insert(ticketMessageAttachments).values(
          storedImages.map((image) => ({
            messageId,
            ticketId: session.ticketId,
            storageKey: image.storageKey,
            originalName: image.originalName,
            mimeType: image.mimeType,
            sizeBytes: image.sizeBytes,
            checksumSha256: image.checksumSha256,
          })),
        );
      }

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
        metadata: { aiState: session.aiState, attachmentCount: storedImages.length },
      });

      if (ticket.assignedUserId && session.aiState !== "active") {
        await tx.insert(internalNotifications).values({
          userId: ticket.assignedUserId,
          kind: "chat.customer_reply",
          title: `Cliente respondeu o ticket #${ticket.ticketNumber}`,
          body: normalizedBody.slice(0, 500) || "Cliente enviou uma imagem.",
          href: `/app/chat/${sessionId}`,
          entityType: "ticket",
          entityId: session.ticketId,
        });
      }
    });
  } catch (cause) {
    await deleteStoredSupportImages(storedImages);
    throw cause;
  }

  return {
    ticketId: session.ticketId,
    messageId,
    aiState: session.aiState,
  };
}
