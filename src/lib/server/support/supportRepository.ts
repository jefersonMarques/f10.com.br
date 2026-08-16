import {
  and,
  asc,
  desc,
  eq,
  inArray,
  or,
} from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { users } from "$lib/server/db/schema";
import {
  customerContacts,
  customerOrganizations,
  supportQueues,
  ticketEvents,
  ticketMessages,
  tickets,
} from "$lib/server/db/supportSchema";
import {
  getUserSupportQueueIds,
  requireTicketAccess,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";

export type TicketStatus =
  | "new"
  | "open"
  | "in_progress"
  | "waiting_customer"
  | "resolved"
  | "closed";

export type TicketPriority = "low" | "normal" | "high" | "urgent";

export type CreateManualTicketInput = {
  subject: string;
  message: string;
  priority: TicketPriority;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  organizationName: string;
  queueId: string;
};

function requireSupportScope(
  permissions: SupportPermissionMap,
  permissionCode: string,
) {
  const scope = getPermissionScope(permissions, permissionCode);
  if (!scope) throw new Error("SUPPORT_PERMISSION_NOT_ALLOWED");
  return scope;
}

async function findOrCreateCustomer(
  input: Pick<
    CreateManualTicketInput,
    "customerName" | "customerEmail" | "customerPhone" | "organizationName"
  >,
) {
  const db = getDatabase();
  const normalizedEmail = input.customerEmail.trim().toLowerCase();

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

  return db.transaction(async (tx) => {
    let organizationId: string | null = null;
    const organizationName = input.organizationName.trim();

    if (organizationName) {
      const [organization] = await tx
        .insert(customerOrganizations)
        .values({ name: organizationName })
        .returning({ id: customerOrganizations.id });
      organizationId = organization?.id ?? null;
    }

    const [contact] = await tx
      .insert(customerContacts)
      .values({
        organizationId,
        name: input.customerName.trim(),
        email: normalizedEmail || null,
        phone: input.customerPhone.trim() || null,
      })
      .returning({ id: customerContacts.id });

    if (!contact) throw new Error("CUSTOMER_NOT_CREATED");
    return contact.id;
  });
}

export async function listSupportQueues() {
  const db = getDatabase();

  return db
    .select({ id: supportQueues.id, code: supportQueues.code, name: supportQueues.name })
    .from(supportQueues)
    .where(eq(supportQueues.active, true))
    .orderBy(asc(supportQueues.name));
}

export async function listSupportAgents() {
  const db = getDatabase();

  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.status, "active"))
    .orderBy(asc(users.name));
}

export async function listSupportTickets(
  actorUserId: string,
  permissions: SupportPermissionMap,
) {
  const scope = requireSupportScope(permissions, "tickets.view");
  const db = getDatabase();
  const ownCondition = or(
    eq(tickets.assignedUserId, actorUserId),
    eq(tickets.createdByUserId, actorUserId),
  );
  let condition = ownCondition;

  if (scope === "all") {
    condition = undefined;
  } else if (scope === "team") {
    const queueIds = await getUserSupportQueueIds(actorUserId);
    condition =
      queueIds.length > 0
        ? or(ownCondition, inArray(tickets.queueId, queueIds))
        : ownCondition;
  }

  const query = db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      channel: tickets.channel,
      updatedAt: tickets.updatedAt,
      assignedUserId: tickets.assignedUserId,
      assignedUserName: users.name,
      queueName: supportQueues.name,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      organizationName: customerOrganizations.name,
    })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(users, eq(tickets.assignedUserId, users.id))
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    )
    .orderBy(desc(tickets.updatedAt))
    .limit(500);

  return condition ? query.where(condition) : query;
}

export async function createManualTicket(
  actorUserId: string,
  permissions: SupportPermissionMap,
  input: CreateManualTicketInput,
) {
  requireSupportScope(permissions, "tickets.create");

  const db = getDatabase();
  const [queue] = await db
    .select({ id: supportQueues.id })
    .from(supportQueues)
    .where(and(eq(supportQueues.id, input.queueId), eq(supportQueues.active, true)))
    .limit(1);

  if (!queue) throw new Error("QUEUE_NOT_FOUND");

  const customerContactId = await findOrCreateCustomer(input);

  return db.transaction(async (tx) => {
    const [ticket] = await tx
      .insert(tickets)
      .values({
        customerContactId,
        queueId: queue.id,
        assignedUserId: actorUserId,
        subject: input.subject.trim(),
        priority: input.priority,
        channel: "manual",
        createdByUserId: actorUserId,
      })
      .returning({ id: tickets.id, ticketNumber: tickets.ticketNumber });

    if (!ticket) throw new Error("TICKET_NOT_CREATED");

    await tx.insert(ticketMessages).values({
      ticketId: ticket.id,
      authorType: "user",
      authorUserId: actorUserId,
      customerContactId,
      visibility: "public",
      channel: "manual",
      body: input.message.trim(),
    });

    await tx.insert(ticketEvents).values({
      ticketId: ticket.id,
      actorUserId,
      eventType: "ticket.created",
      metadata: { channel: "manual" },
    });

    return ticket;
  });
}

export async function getSupportTicket(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
) {
  const scope = requireSupportScope(permissions, "tickets.view");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const db = getDatabase();
  const [ticket] = await db
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      channel: tickets.channel,
      queueId: tickets.queueId,
      queueName: supportQueues.name,
      assignedUserId: tickets.assignedUserId,
      assignedUserName: users.name,
      customerContactId: tickets.customerContactId,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      customerPhone: customerContacts.phone,
      organizationName: customerOrganizations.name,
      linkedTaskId: tickets.linkedTaskId,
      firstResponseDueAt: tickets.firstResponseDueAt,
      resolutionDueAt: tickets.resolutionDueAt,
      firstResponseAt: tickets.firstResponseAt,
      resolvedAt: tickets.resolvedAt,
      closedAt: tickets.closedAt,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
    .leftJoin(users, eq(tickets.assignedUserId, users.id))
    .leftJoin(customerContacts, eq(tickets.customerContactId, customerContacts.id))
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    )
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) throw new Error("TICKET_NOT_FOUND");

  const [messages, events] = await Promise.all([
    db
      .select({
        id: ticketMessages.id,
        authorType: ticketMessages.authorType,
        authorUserName: users.name,
        customerName: customerContacts.name,
        visibility: ticketMessages.visibility,
        channel: ticketMessages.channel,
        body: ticketMessages.body,
        createdAt: ticketMessages.createdAt,
      })
      .from(ticketMessages)
      .leftJoin(users, eq(ticketMessages.authorUserId, users.id))
      .leftJoin(
        customerContacts,
        eq(ticketMessages.customerContactId, customerContacts.id),
      )
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.createdAt)),
    db
      .select({
        id: ticketEvents.id,
        eventType: ticketEvents.eventType,
        metadata: ticketEvents.metadata,
        actorName: users.name,
        createdAt: ticketEvents.createdAt,
      })
      .from(ticketEvents)
      .leftJoin(users, eq(ticketEvents.actorUserId, users.id))
      .where(eq(ticketEvents.ticketId, ticketId))
      .orderBy(desc(ticketEvents.createdAt))
      .limit(100),
  ]);

  return { ticket, messages, events };
}

export async function addTicketMessage(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  body: string,
  visibility: "public" | "internal",
  mentionedUserIds: string[] = [],
): Promise<void> {
  const scope = requireSupportScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const db = getDatabase();
  const now = new Date();
  const [ticket] = await db
    .select({
      status: tickets.status,
      firstResponseAt: tickets.firstResponseAt,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
    })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  if (ticket.status === "closed") throw new Error("TICKET_CLOSED");

  const uniqueMentionIds = Array.from(new Set(mentionedUserIds)).filter((id) => id !== actorUserId).slice(0, 20);
  const mentionUsers = visibility === "internal" && uniqueMentionIds.length > 0
    ? await db
        .select({ id: users.id })
        .from(users)
        .where(and(inArray(users.id, uniqueMentionIds), eq(users.status, "active")))
    : [];

  await db.transaction(async (tx) => {
    await tx.insert(ticketMessages).values({
      ticketId,
      authorType: "user",
      authorUserId: actorUserId,
      visibility,
      channel: "manual",
      body: body.trim(),
    });

    const ticketUpdate: Partial<typeof tickets.$inferInsert> = {
      updatedAt: now,
    };

    if (visibility === "public") {
      if (!ticket.firstResponseAt) ticketUpdate.firstResponseAt = now;
      if (ticket.status === "new") ticketUpdate.status = "open";
    }

    await tx.update(tickets).set(ticketUpdate).where(eq(tickets.id, ticketId));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType:
        visibility === "public" ? "ticket.replied" : "ticket.note.added",
      metadata: mentionUsers.length > 0 ? { mentionedUserIds: mentionUsers.map((user) => user.id) } : {},
    });

    if (visibility === "internal" && mentionUsers.length > 0) {
      await tx.insert(internalNotifications).values(
        mentionUsers.map((user) => ({
          userId: user.id,
          actorUserId,
          kind: "ticket.mention",
          title: `Você foi mencionado no ticket #${ticket.ticketNumber}`,
          body: body.trim().slice(0, 500),
          href: `/app/tickets/${ticketId}`,
          entityType: "ticket",
          entityId: ticketId,
        })),
      );
    }
  });
}

export async function updateTicketStatus(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  status: TicketStatus,
): Promise<void> {
  const scope = requireSupportScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const db = getDatabase();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({
        status,
        resolvedAt: status === "resolved" || status === "closed" ? now : null,
        closedAt: status === "closed" ? now : null,
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.status.changed",
      metadata: { status },
    });
  });
}

export async function updateTicketPriority(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  priority: TicketPriority,
): Promise<void> {
  const scope = requireSupportScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const db = getDatabase();
  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({ priority, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.priority.changed",
      metadata: { priority },
    });
  });
}

export async function assignTicket(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  assignedUserId: string,
): Promise<void> {
  const scope = requireSupportScope(permissions, "tickets.assign");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const db = getDatabase();
  const [[agent], [ticket]] = await Promise.all([
    db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, assignedUserId), eq(users.status, "active")))
      .limit(1),
    db
      .select({ ticketNumber: tickets.ticketNumber, subject: tickets.subject })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1),
  ]);

  if (!agent) throw new Error("AGENT_NOT_ACTIVE");
  if (!ticket) throw new Error("TICKET_NOT_FOUND");

  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({ assignedUserId, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.assignee.changed",
      metadata: { assignedUserId },
    });

    if (assignedUserId !== actorUserId) {
      await tx.insert(internalNotifications).values({
        userId: assignedUserId,
        actorUserId,
        kind: "ticket.assigned",
        title: `Ticket #${ticket.ticketNumber} atribuído a você`,
        body: ticket.subject.slice(0, 500),
        href: `/app/tickets/${ticketId}`,
        entityType: "ticket",
        entityId: ticketId,
      });
    }
  });
}
