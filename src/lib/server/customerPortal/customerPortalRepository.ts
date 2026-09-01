import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  customerPortalLoginTokens,
  customerPortalSessions,
} from "$lib/server/db/customerPortalSchema";
import { ticketMessageAttachments } from "$lib/server/db/supportChatEntrySchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import {
  customerContacts,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";
import {
  CUSTOMER_INTERNAL_MOVEMENT_EVENT_TYPES,
} from "$lib/server/support/ticketCustomerProgressRepository";
import {
  deleteStoredSupportImages,
  listSupportMessageAttachments,
  uploadSupportMessageAttachments,
} from "$lib/server/support/supportMessageAttachmentRepository";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const INTERNAL_MOVEMENT_GROUP_MS = 15 * 60 * 1000;

const PUBLIC_TICKET_EVENTS = [
  "ticket.created",
  "portal.ticket.created",
  "ticket.agent.first_viewed",
  "ticket.status.changed",
  "portal.customer.message",
  "ticket.replied",
  "chat.started",
  "chat.closed",
  "chat.ai.escalated",
  ...CUSTOMER_INTERNAL_MOVEMENT_EVENT_TYPES,
] as const;

const INTERNAL_MOVEMENT_EVENTS = new Set<string>(CUSTOMER_INTERNAL_MOVEMENT_EVENT_TYPES);

type RawPublicTicketEvent = {
  id: string;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

type PublicTicketEvent = RawPublicTicketEvent;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createToken(): string {
  return randomBytes(32).toString("base64url");
}

function safeEventMetadata(event: RawPublicTicketEvent): Record<string, unknown> {
  if (event.eventType !== "ticket.status.changed") return {};
  const status = typeof event.metadata?.status === "string" ? event.metadata.status : "";
  return status ? { status } : {};
}

function projectPublicTicketEvents(events: RawPublicTicketEvent[]): PublicTicketEvent[] {
  const projected: PublicTicketEvent[] = [];

  for (const event of events) {
    const isInternalMovement = INTERNAL_MOVEMENT_EVENTS.has(event.eventType);
    const next: PublicTicketEvent = {
      id: event.id,
      eventType: isInternalMovement ? "ticket.internal.movement" : event.eventType,
      metadata: safeEventMetadata(event),
      createdAt: event.createdAt,
    };

    const previous = projected.at(-1);
    if (
      isInternalMovement &&
      previous?.eventType === "ticket.internal.movement" &&
      next.createdAt.getTime() - previous.createdAt.getTime() <= INTERNAL_MOVEMENT_GROUP_MS
    ) {
      projected[projected.length - 1] = next;
      continue;
    }

    projected.push(next);
  }

  return projected;
}

export type CustomerPortalSession = {
  sessionId: string;
  contactId: string;
  name: string;
  email: string;
  expiresAt: Date;
};

export async function createCustomerPortalLoginToken(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const db = getDatabase();
  const contacts = await db
    .select({
      id: customerContacts.id,
      name: customerContacts.name,
      email: customerContacts.email,
    })
    .from(customerContacts)
    .where(
      and(
        eq(customerContacts.active, true),
        sql`lower(${customerContacts.email}) = ${normalizedEmail}`,
      ),
    )
    .limit(2);

  if (contacts.length !== 1 || !contacts[0]?.email) return null;
  const contact = contacts[0];

  const token = createToken();
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS);
  await db.insert(customerPortalLoginTokens).values({
    customerContactId: contact.id,
    tokenHash: hashToken(token),
    expiresAt,
  });

  return {
    token,
    expiresAt,
    contact: {
      id: contact.id,
      name: contact.name,
      email: contact.email,
    },
  };
}

export async function consumeCustomerPortalLoginToken(
  token: string,
): Promise<{ token: string; expiresAt: Date } | null> {
  const tokenHash = hashToken(token);
  const db = getDatabase();
  const now = new Date();

  return db.transaction(async (tx) => {
    const [loginToken] = await tx
      .update(customerPortalLoginTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(customerPortalLoginTokens.tokenHash, tokenHash),
          gt(customerPortalLoginTokens.expiresAt, now),
          isNull(customerPortalLoginTokens.consumedAt),
        ),
      )
      .returning({ customerContactId: customerPortalLoginTokens.customerContactId });

    if (!loginToken) return null;

    const sessionToken = createToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await tx.insert(customerPortalSessions).values({
      customerContactId: loginToken.customerContactId,
      tokenHash: hashToken(sessionToken),
      expiresAt,
      lastSeenAt: now,
    });

    return { token: sessionToken, expiresAt };
  });
}

export async function authorizeCustomerPortalSession(
  token: string,
): Promise<CustomerPortalSession | null> {
  if (!token) return null;

  const db = getDatabase();
  const now = new Date();
  const [session] = await db
    .select({
      sessionId: customerPortalSessions.id,
      contactId: customerPortalSessions.customerContactId,
      expiresAt: customerPortalSessions.expiresAt,
      name: customerContacts.name,
      email: customerContacts.email,
    })
    .from(customerPortalSessions)
    .innerJoin(
      customerContacts,
      eq(customerContacts.id, customerPortalSessions.customerContactId),
    )
    .where(
      and(
        eq(customerPortalSessions.tokenHash, hashToken(token)),
        gt(customerPortalSessions.expiresAt, now),
        isNull(customerPortalSessions.revokedAt),
        eq(customerContacts.active, true),
      ),
    )
    .limit(1);

  if (!session || !session.email) return null;

  await db
    .update(customerPortalSessions)
    .set({ lastSeenAt: now })
    .where(eq(customerPortalSessions.id, session.sessionId));

  return {
    sessionId: session.sessionId,
    contactId: session.contactId,
    name: session.name,
    email: session.email,
    expiresAt: session.expiresAt,
  };
}

export async function revokeCustomerPortalSession(token: string): Promise<void> {
  if (!token) return;
  const db = getDatabase();
  await db
    .update(customerPortalSessions)
    .set({ revokedAt: new Date() })
    .where(eq(customerPortalSessions.tokenHash, hashToken(token)));
}

export async function listCustomerPortalTickets(contactId: string) {
  return getDatabase()
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      channel: tickets.channel,
      firstResponseDueAt: tickets.firstResponseDueAt,
      resolutionDueAt: tickets.resolutionDueAt,
      firstResponseAt: tickets.firstResponseAt,
      resolvedAt: tickets.resolvedAt,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .where(eq(tickets.customerContactId, contactId))
    .orderBy(desc(tickets.updatedAt));
}

export async function getCustomerPortalTicket(contactId: string, ticketId: string) {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      channel: tickets.channel,
      firstResponseDueAt: tickets.firstResponseDueAt,
      resolutionDueAt: tickets.resolutionDueAt,
      firstResponseAt: tickets.firstResponseAt,
      resolvedAt: tickets.resolvedAt,
      closedAt: tickets.closedAt,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.customerContactId, contactId)))
    .limit(1);

  if (!ticket) return null;

  const [messages, events] = await Promise.all([
    db
      .select({
        id: ticketMessages.id,
        authorType: ticketMessages.authorType,
        body: ticketMessages.body,
        createdAt: ticketMessages.createdAt,
      })
      .from(ticketMessages)
      .where(
        and(
          eq(ticketMessages.ticketId, ticket.id),
          eq(ticketMessages.visibility, "public"),
        ),
      )
      .orderBy(asc(ticketMessages.createdAt)),
    db
      .select({
        id: ticketEvents.id,
        eventType: ticketEvents.eventType,
        metadata: ticketEvents.metadata,
        createdAt: ticketEvents.createdAt,
      })
      .from(ticketEvents)
      .where(
        and(
          eq(ticketEvents.ticketId, ticket.id),
          inArray(ticketEvents.eventType, [...PUBLIC_TICKET_EVENTS]),
        ),
      )
      .orderBy(asc(ticketEvents.createdAt)),
  ]);

  const attachmentRows = await listSupportMessageAttachments(messages.map((message) => message.id));
  const attachmentsByMessage = new Map<string, typeof attachmentRows>();
  for (const attachment of attachmentRows) {
    const current = attachmentsByMessage.get(attachment.messageId) ?? [];
    current.push(attachment);
    attachmentsByMessage.set(attachment.messageId, current);
  }

  return {
    ticket,
    messages: messages.map((message) => ({
      ...message,
      attachments: (attachmentsByMessage.get(message.id) ?? []).map((attachment) => ({
        ...attachment,
        href: `/cliente/chamados/${ticket.id}/anexos/${attachment.id}`,
      })),
    })),
    events: projectPublicTicketEvents(events),
  };
}

export async function replyCustomerPortalTicket(
  contactId: string,
  ticketId: string,
  body: string,
  files: File[] = [],
): Promise<void> {
  const db = getDatabase();
  const [ticket] = await db
    .select({
      status: tickets.status,
      assignedUserId: tickets.assignedUserId,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
    })
    .from(tickets)
    .where(and(eq(tickets.id, ticketId), eq(tickets.customerContactId, contactId)))
    .limit(1);

  if (!ticket) throw new Error("CUSTOMER_TICKET_NOT_FOUND");
  if (ticket.status === "closed") throw new Error("CUSTOMER_TICKET_CLOSED");

  const messageId = randomUUID();
  const storedAttachments = await uploadSupportMessageAttachments(ticketId, messageId, files);
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(ticketMessages).values({
        id: messageId,
        ticketId,
        authorType: "customer",
        customerContactId: contactId,
        visibility: "public",
        channel: "portal",
        body: body.trim(),
      });

      if (storedAttachments.length > 0) {
        await tx.insert(ticketMessageAttachments).values(
          storedAttachments.map((attachment) => ({
            messageId,
            ticketId,
            storageKey: attachment.storageKey,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            checksumSha256: attachment.checksumSha256,
          })),
        );
      }

      await tx
        .update(tickets)
        .set({
          status:
            ticket.status === "resolved" || ticket.status === "waiting_customer"
              ? "open"
              : ticket.status,
          updatedAt: now,
        })
        .where(and(eq(tickets.id, ticketId), eq(tickets.customerContactId, contactId)));

      await tx.insert(ticketEvents).values({
        ticketId,
        eventType: "portal.customer.message",
        metadata: { attachmentCount: storedAttachments.length },
      });

      if (ticket.assignedUserId) {
        await tx.insert(internalNotifications).values({
          userId: ticket.assignedUserId,
          kind: "ticket.customer_reply",
          title: `Cliente respondeu o ticket #${ticket.ticketNumber}`,
          body: body.trim().slice(0, 500) || "Cliente enviou um anexo.",
          href: `/app/tickets/${ticketId}`,
          entityType: "ticket",
          entityId: ticketId,
        });
      }
    });
  } catch (cause) {
    await deleteStoredSupportImages(storedAttachments);
    throw cause;
  }
}
