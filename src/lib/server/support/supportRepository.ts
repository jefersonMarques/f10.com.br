import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  or,
  sql,
} from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { requestTicketSatisfaction } from "$lib/server/support/ticketSatisfactionService";
import { calculateTicketSlaDeadlines } from "$lib/server/support/ticketSlaService";
import { notifyTicketFollowers } from "$lib/server/support/ticketFollowerRepository";
import { ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";
import { internalNotifications } from "$lib/server/db/notificationSchema";
import { serviceRequests } from "$lib/server/db/serviceRequestSchema";
import { users } from "$lib/server/db/schema";
import {
  ticketWorkflowStages,
  ticketWorkflowStates,
  ticketWorkflows,
} from "$lib/server/db/ticketWorkflowSchema";
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
  getUserTicketAreaRestriction,
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

const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  new: "Novo",
  open: "Aberto",
  in_progress: "Em andamento",
  waiting_customer: "Aguardando cliente",
  resolved: "Resolvido",
  closed: "Fechado",
};

export type TicketCustomerLinkInput = {
  customerMode: "existing" | "new";
  customerContactId: string | null;
  customerContextTicketId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerWhatsapp: string;
  organizationName: string;
  groupId: number | null;
  groupName: string;
  subgroup: boolean | null;
  unitId: number | null;
  unitName: string;
  unitSchema: string;
};

export type CreateManualTicketInput = TicketCustomerLinkInput & {
  subject: string;
  message: string;
  priority: TicketPriority;
  dueOn: string;
  queueId: string;
  startStageId?: string | null;
};

type SupportDatabase = ReturnType<typeof getDatabase>;
type SupportTransaction = Parameters<Parameters<SupportDatabase["transaction"]>[0]>[0];

type ResolvedTicketCustomer = {
  contactId: string;
  legacyUserId: string | null;
  groupId: number;
  groupName: string;
  subgroup: boolean | null;
  unitId: number;
  unitName: string;
  unitSchema: string;
};

type ManualTicketStart = {
  globalWorkflowId: string;
  globalStageId: string;
  areaId: string;
  areaWorkflowId: string;
  areaStageId: string;
  lifecycleStatus: TicketStatus;
};

async function resolveManualTicketStart(stageId: string): Promise<ManualTicketStart> {
  const db = getDatabase();
  const [gateway] = await db
    .select({
      globalWorkflowId: ticketWorkflows.id,
      globalStageId: ticketWorkflowStages.id,
      areaId: ticketWorkflowStages.linkedAreaId,
      lifecycleStatus: ticketWorkflowStages.lifecycleStatus,
    })
    .from(ticketWorkflowStages)
    .innerJoin(ticketWorkflows, eq(ticketWorkflowStages.workflowId, ticketWorkflows.id))
    .where(
      and(
        eq(ticketWorkflowStages.id, stageId),
        eq(ticketWorkflowStages.active, true),
        eq(ticketWorkflowStages.allowTicketStart, true),
        eq(ticketWorkflowStages.stageType, "area_gateway"),
        isNotNull(ticketWorkflowStages.linkedAreaId),
        eq(ticketWorkflows.kind, "global"),
        eq(ticketWorkflows.active, true),
      ),
    )
    .limit(1);

  if (!gateway?.areaId) throw new Error("TICKET_WORKFLOW_ENTRY_POINT_INVALID");

  const [areaWorkflow] = await db
    .select({ id: ticketWorkflows.id })
    .from(ticketWorkflows)
    .where(
      and(
        eq(ticketWorkflows.kind, "area"),
        eq(ticketWorkflows.areaId, gateway.areaId),
        eq(ticketWorkflows.active, true),
      ),
    )
    .limit(1);
  if (!areaWorkflow) throw new Error("TICKET_WORKFLOW_AREA_NOT_CONFIGURED");

  const [initialAreaStage] = await db
    .select({ id: ticketWorkflowStages.id })
    .from(ticketWorkflowStages)
    .where(
      and(
        eq(ticketWorkflowStages.workflowId, areaWorkflow.id),
        eq(ticketWorkflowStages.active, true),
      ),
    )
    .orderBy(desc(ticketWorkflowStages.isInitial), asc(ticketWorkflowStages.sortOrder))
    .limit(1);
  if (!initialAreaStage) throw new Error("TICKET_WORKFLOW_AREA_EMPTY");

  return {
    globalWorkflowId: gateway.globalWorkflowId,
    globalStageId: gateway.globalStageId,
    areaId: gateway.areaId,
    areaWorkflowId: areaWorkflow.id,
    areaStageId: initialAreaStage.id,
    lifecycleStatus: gateway.lifecycleStatus,
  };
}

function requireSupportScope(
  permissions: SupportPermissionMap,
  permissionCode: string,
) {
  const scope = getPermissionScope(permissions, permissionCode);
  if (!scope) throw new Error("SUPPORT_PERMISSION_NOT_ALLOWED");
  return scope;
}

export async function listSupportQueues() {
  const db = getDatabase();

  return db
    .select({
      id: supportQueues.id,
      code: supportQueues.code,
      name: supportQueues.name,
      defaultDueDays: supportQueues.defaultDueDays,
    })
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
      dueOn: tickets.dueOn,
      updatedAt: tickets.updatedAt,
      assignedUserId: tickets.assignedUserId,
      assignedUserName: users.name,
      queueName: supportQueues.name,
      customerContactId: tickets.customerContactId,
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

function normalizedPhone(value: string): string {
  return value.replace(/\D/g, "");
}

function requireManualContext(input: TicketCustomerLinkInput): {
  groupId: number;
  groupName: string;
  subgroup: boolean;
  unitId: number;
  unitName: string;
  unitSchema: string;
} {
  if (
    input.groupId === null ||
    !Number.isSafeInteger(input.groupId) ||
    input.groupId <= 0 ||
    input.unitId === null ||
    !Number.isSafeInteger(input.unitId) ||
    input.unitId <= 0 ||
    !input.groupName.trim() ||
    input.subgroup === null ||
    !input.unitName.trim() ||
    !input.unitSchema.trim()
  ) {
    throw new Error("CUSTOMER_F10_CONTEXT_REQUIRED");
  }
  return {
    groupId: input.groupId,
    groupName: input.groupName.trim(),
    subgroup: input.subgroup,
    unitId: input.unitId,
    unitName: input.unitName.trim(),
    unitSchema: input.unitSchema.trim(),
  };
}

async function resolveTicketCustomer(
  tx: SupportTransaction,
  input: TicketCustomerLinkInput,
): Promise<ResolvedTicketCustomer> {
  if (input.customerMode === "existing") {
    if (!input.customerContactId || !input.customerContextTicketId) {
      throw new Error("CUSTOMER_F10_CONTEXT_REQUIRED");
    }

    const [selected] = await tx
      .select({
        contactId: customerContacts.id,
        legacyUserId: ticketCustomerContexts.legacyUserId,
        groupId: ticketCustomerContexts.groupId,
        groupName: ticketCustomerContexts.groupName,
        subgroup: ticketCustomerContexts.subgroup,
        unitId: ticketCustomerContexts.unitId,
        unitName: ticketCustomerContexts.unitName,
        unitSchema: ticketCustomerContexts.unitSchema,
      })
      .from(customerContacts)
      .innerJoin(
        ticketCustomerContexts,
        and(
          eq(ticketCustomerContexts.customerContactId, customerContacts.id),
          eq(ticketCustomerContexts.ticketId, input.customerContextTicketId),
        ),
      )
      .where(
        and(
          eq(customerContacts.id, input.customerContactId),
          eq(customerContacts.active, true),
          isNotNull(ticketCustomerContexts.groupId),
          isNotNull(ticketCustomerContexts.groupName),
          isNotNull(ticketCustomerContexts.unitId),
          isNotNull(ticketCustomerContexts.unitName),
          isNotNull(ticketCustomerContexts.unitSchema),
        ),
      )
      .limit(1);

    if (
      !selected ||
      selected.groupId === null ||
      selected.groupName === null ||
      selected.unitId === null ||
      selected.unitName === null ||
      selected.unitSchema === null
    ) {
      throw new Error("CUSTOMER_F10_CONTEXT_REQUIRED");
    }

    return {
      contactId: selected.contactId,
      legacyUserId: selected.legacyUserId,
      groupId: selected.groupId,
      groupName: selected.groupName,
      subgroup: selected.subgroup,
      unitId: selected.unitId,
      unitName: selected.unitName,
      unitSchema: selected.unitSchema,
    };
  }

  const context = requireManualContext(input);
  const name = input.customerName.trim();
  const organizationName = input.organizationName.trim();
  const email = input.customerEmail.trim().toLowerCase();
  const phone = input.customerPhone.trim();
  const whatsapp = input.customerWhatsapp.trim();
  if (name.length < 2 || organizationName.length < 2) {
    throw new Error("CUSTOMER_REQUIRED");
  }

  let existingContact: { id: string; organizationId: string | null } | undefined;
  if (email) {
    [existingContact] = await tx
      .select({ id: customerContacts.id, organizationId: customerContacts.organizationId })
      .from(customerContacts)
      .where(and(eq(customerContacts.active, true), sql`lower(${customerContacts.email}) = ${email}`))
      .limit(1);
  }

  const phoneDigits = normalizedPhone(phone || whatsapp);
  if (!existingContact && phoneDigits.length >= 8) {
    [existingContact] = await tx
      .select({ id: customerContacts.id, organizationId: customerContacts.organizationId })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.active, true),
          or(
            sql`regexp_replace(coalesce(${customerContacts.phone}, ''), '\\D', '', 'g') = ${phoneDigits}`,
            sql`regexp_replace(coalesce(${customerContacts.whatsapp}, ''), '\\D', '', 'g') = ${phoneDigits}`,
          ),
        ),
      )
      .limit(1);
  }

  let contactId = existingContact?.id ?? null;
  if (!contactId) {
    let organizationId: string | null = null;
    const [existingOrganization] = await tx
      .select({ id: customerOrganizations.id })
      .from(customerOrganizations)
      .where(
        and(
          eq(customerOrganizations.active, true),
          sql`lower(${customerOrganizations.name}) = ${organizationName.toLowerCase()}`,
        ),
      )
      .limit(1);

    if (existingOrganization) {
      organizationId = existingOrganization.id;
    } else {
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
        name,
        email: email || null,
        phone: phone || null,
        whatsapp: whatsapp || null,
      })
      .returning({ id: customerContacts.id });
    if (!contact) throw new Error("CUSTOMER_NOT_CREATED");
    contactId = contact.id;
  }

  return {
    contactId,
    legacyUserId: null,
    ...context,
  };
}

async function saveTicketCustomerContext(
  tx: SupportTransaction,
  ticketId: string,
  customer: ResolvedTicketCustomer,
): Promise<void> {
  await tx
    .insert(ticketCustomerContexts)
    .values({
      ticketId,
      customerContactId: customer.contactId,
      legacyUserId: customer.legacyUserId,
      contextScope: "unit",
      groupId: customer.groupId,
      groupName: customer.groupName,
      subgroup: customer.subgroup,
      unitId: customer.unitId,
      unitName: customer.unitName,
      unitSchema: customer.unitSchema,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: ticketCustomerContexts.ticketId,
      set: {
        customerContactId: customer.contactId,
        legacyUserId: customer.legacyUserId,
        contextScope: "unit",
        groupId: customer.groupId,
        groupName: customer.groupName,
        subgroup: customer.subgroup,
        unitId: customer.unitId,
        unitName: customer.unitName,
        unitSchema: customer.unitSchema,
        updatedAt: new Date(),
      },
    });
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

  const now = new Date();
  const sla = await calculateTicketSlaDeadlines(queue.id, now);
  const start = input.startStageId
    ? await resolveManualTicketStart(input.startStageId)
    : null;
  if (start) {
    const areaRestriction = await getUserTicketAreaRestriction(actorUserId);
    if (areaRestriction !== null && !areaRestriction.includes(start.areaId)) {
      throw new Error("TICKET_WORKFLOW_AREA_ACCESS_DENIED");
    }
  }

  return db.transaction(async (tx) => {
    const customer = await resolveTicketCustomer(tx, input);
    const [ticket] = await tx
      .insert(tickets)
      .values({
        customerContactId: customer.contactId,
        queueId: queue.id,
        assignedUserId: start ? null : actorUserId,
        subject: input.subject.trim(),
        status: start?.lifecycleStatus,
        priority: input.priority,
        channel: "manual",
        dueOn: input.dueOn,
        firstResponseDueAt: sla.firstResponseDueAt,
        firstResponseAt: now,
        resolutionDueAt: sla.resolutionDueAt,
        createdByUserId: actorUserId,
      })
      .returning({ id: tickets.id, ticketNumber: tickets.ticketNumber });

    if (!ticket) throw new Error("TICKET_NOT_CREATED");

    await saveTicketCustomerContext(tx, ticket.id, customer);

    if (start) {
      await tx.insert(ticketWorkflowStates).values({
        ticketId: ticket.id,
        globalWorkflowId: start.globalWorkflowId,
        globalStageId: start.globalStageId,
        areaId: start.areaId,
        areaWorkflowId: start.areaWorkflowId,
        areaStageId: start.areaStageId,
        enteredAt: now,
        areaEnteredAt: now,
        updatedAt: now,
      });
    }

    await tx.insert(ticketMessages).values({
      ticketId: ticket.id,
      authorType: "user",
      authorUserId: actorUserId,
      customerContactId: customer.contactId,
      visibility: "public",
      channel: "manual",
      body: input.message.trim(),
    });

    await tx.insert(ticketEvents).values({
      ticketId: ticket.id,
      actorUserId,
      eventType: "ticket.created",
      metadata: {
        channel: "manual",
        dueOn: input.dueOn,
        customerContactId: customer.contactId,
        groupId: customer.groupId,
        unitId: customer.unitId,
        startStageId: start?.globalStageId ?? null,
        startAreaId: start?.areaId ?? null,
      },
    });

    return ticket;
  });
}

export async function linkTicketCustomer(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  input: TicketCustomerLinkInput,
): Promise<void> {
  const scope = requireSupportScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const [ticket] = await tx
      .select({ customerContactId: tickets.customerContactId })
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .limit(1);
    if (!ticket) throw new Error("TICKET_NOT_FOUND");
    if (ticket.customerContactId) throw new Error("TICKET_CUSTOMER_ALREADY_LINKED");

    const customer = await resolveTicketCustomer(tx, input);
    const now = new Date();

    await tx
      .update(tickets)
      .set({
        customerContactId: customer.contactId,
        updatedAt: now,
      })
      .where(eq(tickets.id, ticketId));

    await saveTicketCustomerContext(tx, ticketId, customer);

    await tx
      .update(serviceRequests)
      .set({
        customerContactId: customer.contactId,
        legacyUserId: customer.legacyUserId,
        groupId: customer.groupId,
        groupName: customer.groupName,
        unitId: customer.unitId,
        unitName: customer.unitName,
        unitSchema: customer.unitSchema,
        updatedAt: now,
      })
      .where(eq(serviceRequests.ticketId, ticketId));

    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.customer.linked",
      metadata: {
        customerContactId: customer.contactId,
        groupId: customer.groupId,
        unitId: customer.unitId,
      },
    });
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
      dueOn: tickets.dueOn,
      queueId: tickets.queueId,
      queueName: supportQueues.name,
      assignedUserId: tickets.assignedUserId,
      assignedUserName: users.name,
      customerContactId: tickets.customerContactId,
      customerName: customerContacts.name,
      customerEmail: customerContacts.email,
      customerPhone: customerContacts.phone,
      customerWhatsapp: customerContacts.whatsapp,
      organizationName: customerOrganizations.name,
      linkedTaskId: tickets.linkedTaskId,
      firstResponseDueAt: tickets.firstResponseDueAt,
      nextResponseDueAt: tickets.nextResponseDueAt,
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
  const permissionCode =
    visibility === "internal" && getPermissionScope(permissions, "tickets.comment_internal")
      ? "tickets.comment_internal"
      : "tickets.reply";
  const scope = requireSupportScope(permissions, permissionCode);
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
      ticketUpdate.nextResponseDueAt = null;
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

  await notifyTicketFollowers(ticketId, {
    kind: "ticket.follower.status",
    body: `Status atualizado para ${TICKET_STATUS_LABELS[status]}.`,
    actorUserId,
  }).catch((cause) => {
    console.error("[ticket.follower.status]", {
      ticketId,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
  });

  if (status === "resolved" || status === "closed") {
    await requestTicketSatisfaction(ticketId).catch((cause) => {
      console.error("[ticket.satisfaction.request]", {
        ticketId,
        errorCode: cause instanceof Error ? cause.message : "TICKET_SATISFACTION_REQUEST_FAILED",
      });
    });
  }
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

export async function updateTicketDueOn(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  dueOn: string,
): Promise<void> {
  const scope = requireSupportScope(permissions, "tickets.reply");
  await requireTicketAccess(actorUserId, scope, ticketId);

  const db = getDatabase();
  const [ticket] = await db
    .select({ dueOn: tickets.dueOn })
    .from(tickets)
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  if (ticket.dueOn === dueOn) return;

  await db.transaction(async (tx) => {
    await tx
      .update(tickets)
      .set({ dueOn, updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: "ticket.due_date.changed",
      metadata: { previousDueOn: ticket.dueOn, dueOn },
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
