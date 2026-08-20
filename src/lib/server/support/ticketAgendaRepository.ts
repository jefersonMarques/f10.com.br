import { and, asc, eq, gte, inArray, lte, or } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import { users } from "$lib/server/db/schema";
import {
  customerContacts,
  customerOrganizations,
  supportQueues,
  tickets,
} from "$lib/server/db/supportSchema";
import {
  getUserSupportQueueIds,
  type SupportPermissionMap,
} from "$lib/server/support/supportAccess";

export async function listTicketAgendaItems(
  actorUserId: string,
  permissions: SupportPermissionMap,
  startOn: string,
  endOn: string,
) {
  const scope = getPermissionScope(permissions, "tickets.view");
  if (!scope) throw new Error("SUPPORT_PERMISSION_NOT_ALLOWED");

  const rangeCondition = and(
    gte(tickets.dueOn, startOn),
    lte(tickets.dueOn, endOn),
  );
  const ownCondition = or(
    eq(tickets.assignedUserId, actorUserId),
    eq(tickets.createdByUserId, actorUserId),
  );

  let condition = rangeCondition;
  if (scope === "own") {
    condition = and(rangeCondition, ownCondition);
  } else if (scope === "team") {
    const queueIds = await getUserSupportQueueIds(actorUserId);
    condition = queueIds.length > 0
      ? and(rangeCondition, or(ownCondition, inArray(tickets.queueId, queueIds)))
      : and(rangeCondition, ownCondition);
  }

  return getDatabase()
    .select({
      id: tickets.id,
      ticketNumber: tickets.ticketNumber,
      subject: tickets.subject,
      dueOn: tickets.dueOn,
      status: tickets.status,
      priority: tickets.priority,
      assignedUserId: tickets.assignedUserId,
      assignedUserName: users.name,
      queueName: supportQueues.name,
      customerName: customerContacts.name,
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
    .where(condition)
    .orderBy(asc(tickets.dueOn), asc(tickets.ticketNumber))
    .limit(1000);
}
