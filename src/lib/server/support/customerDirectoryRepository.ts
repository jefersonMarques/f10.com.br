import {
  and,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  getPermissionScope,
  type PermissionScope,
} from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { customerActivityEvents, ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";
import { webChatSessions } from "$lib/server/db/chatSchema";
import { users } from "$lib/server/db/schema";
import { ticketTaskLinks } from "$lib/server/db/supportRoutingSchema";
import {
  customerContacts,
  customerOrganizations,
  supportQueues,
  tickets,
} from "$lib/server/db/supportSchema";
import { taskProjects, taskStatuses, tasks } from "$lib/server/db/taskSchema";
import { getUserSupportQueueIds } from "$lib/server/support/supportAccess";

export type CustomerDirectoryPermissionMap = Map<string, PermissionScope>;

export type UpdateCustomerDirectoryInput = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  active: boolean;
  organizationName: string;
  organizationDocument: string;
};

export type CreateCustomerContactInput = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
};

function requireCustomerScope(
  permissions: CustomerDirectoryPermissionMap,
  permissionCode: "customers.view" | "customers.manage",
): PermissionScope {
  const scope = getPermissionScope(permissions, permissionCode);
  if (!scope) throw new Error("CUSTOMER_PERMISSION_NOT_ALLOWED");
  return scope;
}

async function buildTicketAccessCondition(
  actorUserId: string,
  scope: PermissionScope,
): Promise<SQL | undefined> {
  if (scope === "all") return undefined;

  const ownCondition = or(
    eq(tickets.assignedUserId, actorUserId),
    eq(tickets.createdByUserId, actorUserId),
  );
  if (scope === "own") return ownCondition;

  const queueIds = await getUserSupportQueueIds(actorUserId);
  return queueIds.length > 0
    ? or(ownCondition, inArray(tickets.queueId, queueIds))
    : ownCondition;
}

async function buildCustomerAccessCondition(
  actorUserId: string,
  scope: PermissionScope,
): Promise<SQL | undefined> {
  const ticketCondition = await buildTicketAccessCondition(actorUserId, scope);
  if (!ticketCondition) return undefined;

  const db = getDatabase();
  return exists(
    db
      .select({ id: tickets.id })
      .from(tickets)
      .where(
        and(
          eq(tickets.customerContactId, customerContacts.id),
          ticketCondition,
        ),
      ),
  );
}

function combineConditions(...conditions: Array<SQL | undefined>): SQL | undefined {
  const present = conditions.filter((condition): condition is SQL => Boolean(condition));
  if (present.length === 0) return undefined;
  return and(...present);
}

export async function listCustomerDirectory(
  actorUserId: string,
  permissions: CustomerDirectoryPermissionMap,
  options: { query?: string; page?: number; pageSize?: number } = {},
) {
  const scope = requireCustomerScope(permissions, "customers.view");
  const accessCondition = await buildCustomerAccessCondition(actorUserId, scope);
  const query = options.query?.trim() ?? "";
  const pageSize = Math.min(Math.max(options.pageSize ?? 50, 10), 100);
  const page = Math.max(options.page ?? 1, 1);
  const offset = (page - 1) * pageSize;
  const pattern = `%${query}%`;
  const searchCondition = query
    ? or(
        ilike(customerContacts.name, pattern),
        ilike(customerContacts.email, pattern),
        ilike(customerContacts.phone, pattern),
        ilike(customerContacts.whatsapp, pattern),
        ilike(customerOrganizations.name, pattern),
      )
    : undefined;
  const whereCondition = combineConditions(accessCondition, searchCondition);
  const db = getDatabase();

  const rowQuery = db
    .select({
      id: customerContacts.id,
      name: customerContacts.name,
      email: customerContacts.email,
      phone: customerContacts.phone,
      whatsapp: customerContacts.whatsapp,
      active: customerContacts.active,
      organizationId: customerOrganizations.id,
      organizationName: customerOrganizations.name,
      organizationDocument: customerOrganizations.document,
      updatedAt: customerContacts.updatedAt,
      openTicketCount: sql<number>`(
        select count(*)::int
        from tickets customer_ticket
        where customer_ticket.customer_contact_id = ${customerContacts.id}
          and customer_ticket.status not in ('resolved', 'closed')
      )`,
      assignedTicketCount: sql<number>`(
        select count(*)::int
        from tickets customer_ticket
        where customer_ticket.customer_contact_id = ${customerContacts.id}
          and customer_ticket.assigned_user_id is not null
          and customer_ticket.status not in ('resolved', 'closed')
      )`,
      activeChatCount: sql<number>`(
        select count(*)::int
        from web_chat_sessions customer_chat
        inner join tickets customer_chat_ticket on customer_chat_ticket.id = customer_chat.ticket_id
        where customer_chat_ticket.customer_contact_id = ${customerContacts.id}
          and customer_chat.closed_at is null
          and customer_chat_ticket.status <> 'closed'
      )`,
      latestTicketNumber: sql<number | null>`(
        select customer_ticket.ticket_number
        from tickets customer_ticket
        where customer_ticket.customer_contact_id = ${customerContacts.id}
        order by customer_ticket.updated_at desc
        limit 1
      )`,
      latestTicketStatus: sql<string | null>`(
        select customer_ticket.status::text
        from tickets customer_ticket
        where customer_ticket.customer_contact_id = ${customerContacts.id}
        order by customer_ticket.updated_at desc
        limit 1
      )`,
      latestUnitName: sql<string | null>`(
        select customer_context.unit_name
        from ticket_customer_contexts customer_context
        where customer_context.customer_contact_id = ${customerContacts.id}
        order by customer_context.updated_at desc
        limit 1
      )`,
      latestGroupName: sql<string | null>`(
        select customer_context.group_name
        from ticket_customer_contexts customer_context
        where customer_context.customer_contact_id = ${customerContacts.id}
        order by customer_context.updated_at desc
        limit 1
      )`,
      lastInteractionAt: sql<Date | null>`(
        select max(customer_ticket.updated_at)
        from tickets customer_ticket
        where customer_ticket.customer_contact_id = ${customerContacts.id}
      )`,
    })
    .from(customerContacts)
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    );

  const countQuery = db
    .select({ value: sql<number>`count(*)::int` })
    .from(customerContacts)
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    );

  const [rows, countRows] = await Promise.all([
    (whereCondition ? rowQuery.where(whereCondition) : rowQuery)
      .orderBy(desc(customerContacts.updatedAt), customerContacts.name)
      .limit(pageSize)
      .offset(offset),
    whereCondition ? countQuery.where(whereCondition) : countQuery,
  ]);

  const total = Number(countRows[0]?.value ?? 0);
  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
  };
}

async function getAccessibleCustomer(
  actorUserId: string,
  permissions: CustomerDirectoryPermissionMap,
  customerId: string,
  permissionCode: "customers.view" | "customers.manage",
) {
  const scope = requireCustomerScope(permissions, permissionCode);
  const accessCondition = await buildCustomerAccessCondition(actorUserId, scope);
  const db = getDatabase();
  const query = db
    .select({
      id: customerContacts.id,
      organizationId: customerContacts.organizationId,
      name: customerContacts.name,
      email: customerContacts.email,
      phone: customerContacts.phone,
      whatsapp: customerContacts.whatsapp,
      active: customerContacts.active,
      createdAt: customerContacts.createdAt,
      updatedAt: customerContacts.updatedAt,
      organizationName: customerOrganizations.name,
      organizationDocument: customerOrganizations.document,
      organizationActive: customerOrganizations.active,
    })
    .from(customerContacts)
    .leftJoin(
      customerOrganizations,
      eq(customerContacts.organizationId, customerOrganizations.id),
    );
  const [customer] = await query
    .where(combineConditions(eq(customerContacts.id, customerId), accessCondition))
    .limit(1);
  if (!customer) throw new Error("CUSTOMER_NOT_ACCESSIBLE");
  return { customer, scope };
}

export async function getCustomerDirectoryDetails(
  actorUserId: string,
  permissions: CustomerDirectoryPermissionMap,
  customerId: string,
) {
  const { customer, scope } = await getAccessibleCustomer(
    actorUserId,
    permissions,
    customerId,
    "customers.view",
  );
  const ticketCondition = await buildTicketAccessCondition(actorUserId, scope);
  const db = getDatabase();

  const relatedContactsPromise = customer.organizationId
    ? db
        .select({
          id: customerContacts.id,
          name: customerContacts.name,
          email: customerContacts.email,
          phone: customerContacts.phone,
          whatsapp: customerContacts.whatsapp,
          active: customerContacts.active,
        })
        .from(customerContacts)
        .where(eq(customerContacts.organizationId, customer.organizationId))
        .orderBy(desc(customerContacts.active), customerContacts.name)
    : Promise.resolve([]);

  const ticketWhere = combineConditions(
    eq(tickets.customerContactId, customerId),
    ticketCondition,
  );

  const [relatedContacts, ticketRows, contextRows, chatRows, taskRows, activityRows] =
    await Promise.all([
      relatedContactsPromise,
      db
        .select({
          id: tickets.id,
          ticketNumber: tickets.ticketNumber,
          subject: tickets.subject,
          status: tickets.status,
          priority: tickets.priority,
          channel: tickets.channel,
          queueName: supportQueues.name,
          assignedUserName: users.name,
          updatedAt: tickets.updatedAt,
          createdAt: tickets.createdAt,
        })
        .from(tickets)
        .innerJoin(supportQueues, eq(tickets.queueId, supportQueues.id))
        .leftJoin(users, eq(tickets.assignedUserId, users.id))
        .where(ticketWhere)
        .orderBy(desc(tickets.updatedAt))
        .limit(100),
      db
        .select({
          ticketId: ticketCustomerContexts.ticketId,
          groupId: ticketCustomerContexts.groupId,
          groupName: ticketCustomerContexts.groupName,
          unitId: ticketCustomerContexts.unitId,
          unitName: ticketCustomerContexts.unitName,
          unitSchema: ticketCustomerContexts.unitSchema,
          updatedAt: ticketCustomerContexts.updatedAt,
        })
        .from(ticketCustomerContexts)
        .innerJoin(tickets, eq(ticketCustomerContexts.ticketId, tickets.id))
        .where(
          combineConditions(
            eq(ticketCustomerContexts.customerContactId, customerId),
            ticketCondition,
          ),
        )
        .orderBy(desc(ticketCustomerContexts.updatedAt)),
      db
        .select({
          sessionId: webChatSessions.id,
          ticketId: tickets.id,
          ticketNumber: tickets.ticketNumber,
          subject: tickets.subject,
          status: tickets.status,
          aiState: webChatSessions.aiState,
          lastSeenAt: webChatSessions.lastSeenAt,
          closedAt: webChatSessions.closedAt,
        })
        .from(webChatSessions)
        .innerJoin(tickets, eq(webChatSessions.ticketId, tickets.id))
        .where(ticketWhere)
        .orderBy(desc(webChatSessions.lastSeenAt))
        .limit(30),
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          priority: tasks.priority,
          dueOn: tasks.dueOn,
          projectName: taskProjects.name,
          statusName: taskStatuses.name,
          statusClosed: taskStatuses.isClosed,
          ticketId: tickets.id,
          ticketNumber: tickets.ticketNumber,
        })
        .from(ticketTaskLinks)
        .innerJoin(tickets, eq(ticketTaskLinks.ticketId, tickets.id))
        .innerJoin(tasks, eq(ticketTaskLinks.taskId, tasks.id))
        .innerJoin(taskProjects, eq(tasks.projectId, taskProjects.id))
        .innerJoin(taskStatuses, eq(tasks.statusId, taskStatuses.id))
        .where(ticketWhere)
        .orderBy(desc(ticketTaskLinks.createdAt))
        .limit(50),
      db
        .select({
          id: customerActivityEvents.id,
          eventType: customerActivityEvents.eventType,
          source: customerActivityEvents.source,
          path: customerActivityEvents.path,
          createdAt: customerActivityEvents.createdAt,
        })
        .from(customerActivityEvents)
        .where(eq(customerActivityEvents.customerContactId, customerId))
        .orderBy(desc(customerActivityEvents.createdAt))
        .limit(20),
    ]);

  const unitMap = new Map<string, (typeof contextRows)[number]>();
  for (const context of contextRows) {
    const key = `${context.groupId}:${context.unitId}`;
    if (!unitMap.has(key)) unitMap.set(key, context);
  }

  return {
    customer,
    relatedContacts,
    tickets: ticketRows,
    units: Array.from(unitMap.values()),
    chats: chatRows,
    tasks: taskRows,
    activity: activityRows,
    canManage: Boolean(getPermissionScope(permissions, "customers.manage")),
  };
}

export async function updateCustomerDirectory(
  actorUserId: string,
  permissions: CustomerDirectoryPermissionMap,
  customerId: string,
  input: UpdateCustomerDirectoryInput,
): Promise<void> {
  const { customer } = await getAccessibleCustomer(
    actorUserId,
    permissions,
    customerId,
    "customers.manage",
  );
  const db = getDatabase();
  const now = new Date();
  const normalizedEmail = input.email.trim().toLowerCase() || null;
  const organizationName = input.organizationName.trim();
  const organizationDocument = input.organizationDocument.trim() || null;

  await db.transaction(async (tx) => {
    let organizationId = customer.organizationId;
    if (organizationName) {
      if (organizationId) {
        await tx
          .update(customerOrganizations)
          .set({
            name: organizationName,
            document: organizationDocument,
            updatedAt: now,
          })
          .where(eq(customerOrganizations.id, organizationId));
      } else {
        const [organization] = await tx
          .insert(customerOrganizations)
          .values({
            name: organizationName,
            document: organizationDocument,
          })
          .returning({ id: customerOrganizations.id });
        organizationId = organization?.id ?? null;
      }
    }

    await tx
      .update(customerContacts)
      .set({
        organizationId,
        name: input.name.trim(),
        email: normalizedEmail,
        phone: input.phone.trim() || null,
        whatsapp: input.whatsapp.trim() || null,
        active: input.active,
        updatedAt: now,
      })
      .where(eq(customerContacts.id, customerId));
  });
}

export async function createCustomerRelatedContact(
  actorUserId: string,
  permissions: CustomerDirectoryPermissionMap,
  customerId: string,
  input: CreateCustomerContactInput,
): Promise<void> {
  const { customer } = await getAccessibleCustomer(
    actorUserId,
    permissions,
    customerId,
    "customers.manage",
  );
  if (!customer.organizationId) throw new Error("CUSTOMER_ORGANIZATION_REQUIRED");

  const db = getDatabase();
  const normalizedEmail = input.email.trim().toLowerCase();
  if (normalizedEmail) {
    const existing = await db
      .select({ id: customerContacts.id })
      .from(customerContacts)
      .where(
        and(
          eq(customerContacts.organizationId, customer.organizationId),
          sql`lower(${customerContacts.email}) = ${normalizedEmail}`,
        ),
      )
      .limit(1);
    if (existing.length > 0) throw new Error("CUSTOMER_CONTACT_ALREADY_EXISTS");
  }

  await db.insert(customerContacts).values({
    organizationId: customer.organizationId,
    name: input.name.trim(),
    email: normalizedEmail || null,
    phone: input.phone.trim() || null,
    whatsapp: input.whatsapp.trim() || null,
  });
}
