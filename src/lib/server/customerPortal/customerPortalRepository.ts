import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  customerPortalLoginTokens,
  customerPortalSessions,
} from "$lib/server/db/customerPortalSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import {
  customerContacts,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";

const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createToken(): string {
  return randomBytes(32).toString("base64url");
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
  const db = getDatabase();
  return db
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
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.customerContactId, contactId),
      ),
    )
    .limit(1);

  if (!ticket) return null;

  const messages = await db
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
    .orderBy(asc(ticketMessages.createdAt));

  return { ticket, messages };
}

export async function replyCustomerPortalTicket(
  contactId: string,
  ticketId: string,
  body: string,
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
    .where(
      and(
        eq(tickets.id, ticketId),
        eq(tickets.customerContactId, contactId),
      ),
    )
    .limit(1);

  if (!ticket) throw new Error("CUSTOMER_TICKET_NOT_FOUND");
  if (ticket.status === "closed") throw new Error("CUSTOMER_TICKET_CLOSED");

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "customer",
      customerContactId: contactId,
      visibility: "public",
      channel: "portal",
      body: body.trim(),
    });

    await tx
      .update(tickets)
      .set({
        status:
          ticket.status === "resolved" || ticket.status === "waiting_customer"
            ? "open"
            : ticket.status,
        updatedAt: now,
      })
      .where(
        and(
          eq(tickets.id, ticketId),
          eq(tickets.customerContactId, contactId),
        ),
      );

    await tx.insert(ticketEvents).values({
      ticketId,
      eventType: "portal.customer.message",
      metadata: {},
    });

    if (ticket.assignedUserId) {
      await tx.insert(internalNotifications).values({
        userId: ticket.assignedUserId,
        kind: "ticket.customer_reply",
        title: `Cliente respondeu o ticket #${ticket.ticketNumber}`,
        body: body.trim().slice(0, 500),
        href: `/app/tickets/${ticketId}`,
        entityType: "ticket",
        entityId: ticketId,
      });
    }
  });
}
