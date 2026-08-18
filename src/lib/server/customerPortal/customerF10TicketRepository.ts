import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";
import {
  getCustomerPortalTicket,
  listCustomerPortalTickets,
  replyCustomerPortalTicket,
} from "$lib/server/customerPortal/customerPortalRepository";
import {
  countF10Units,
  type CustomerF10PortalSession,
} from "$lib/server/customerPortal/customerF10AuthRepository";

function hasSelectedContext(session: CustomerF10PortalSession): boolean {
  return session.selectedGroupId !== null &&
    session.selectedUnitId !== null &&
    Boolean(session.selectedUnitName) &&
    Boolean(session.selectedUnitSchema);
}

function contextMatches(
  session: CustomerF10PortalSession,
  context: { legacyUserId: string; unitId: number } | undefined,
): boolean {
  if (!hasSelectedContext(session)) return false;
  if (!context) return countF10Units(session.groups) === 1;
  return context.legacyUserId === session.legacyUserId &&
    context.unitId === session.selectedUnitId;
}

export async function listCustomerF10Tickets(session: CustomerF10PortalSession) {
  if (!hasSelectedContext(session)) return [];
  const tickets = await listCustomerPortalTickets(session.contactId);
  if (tickets.length === 0) return [];

  const db = getDatabase();
  const contexts = await db
    .select({
      ticketId: ticketCustomerContexts.ticketId,
      legacyUserId: ticketCustomerContexts.legacyUserId,
      unitId: ticketCustomerContexts.unitId,
    })
    .from(ticketCustomerContexts)
    .where(inArray(ticketCustomerContexts.ticketId, tickets.map((ticket) => ticket.id)));
  const byTicket = new Map(contexts.map((context) => [context.ticketId, context]));
  return tickets.filter((ticket) => contextMatches(session, byTicket.get(ticket.id)));
}

export async function getCustomerF10Ticket(
  session: CustomerF10PortalSession,
  ticketId: string,
) {
  if (!hasSelectedContext(session)) return null;
  const ticket = await getCustomerPortalTicket(session.contactId, ticketId);
  if (!ticket) return null;

  const db = getDatabase();
  const [context] = await db
    .select({
      legacyUserId: ticketCustomerContexts.legacyUserId,
      unitId: ticketCustomerContexts.unitId,
    })
    .from(ticketCustomerContexts)
    .where(eq(ticketCustomerContexts.ticketId, ticketId))
    .limit(1);

  return contextMatches(session, context) ? ticket : null;
}

export async function replyCustomerF10Ticket(
  session: CustomerF10PortalSession,
  ticketId: string,
  body: string,
): Promise<void> {
  const ticket = await getCustomerF10Ticket(session, ticketId);
  if (!ticket) throw new Error("CUSTOMER_TICKET_NOT_FOUND");
  await replyCustomerPortalTicket(session.contactId, ticketId, body);
}

export async function bindTicketF10Context(
  ticketId: string,
  session: CustomerF10PortalSession,
): Promise<void> {
  if (!hasSelectedContext(session)) throw new Error("F10_CUSTOMER_UNIT_REQUIRED");
  const db = getDatabase();
  const now = new Date();
  await db
    .insert(ticketCustomerContexts)
    .values({
      ticketId,
      customerContactId: session.contactId,
      legacyUserId: session.legacyUserId,
      groupId: session.selectedGroupId as number,
      groupName: session.selectedGroupName ?? "",
      unitId: session.selectedUnitId as number,
      unitName: session.selectedUnitName ?? "",
      unitSchema: session.selectedUnitSchema ?? "",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: ticketCustomerContexts.ticketId,
      set: {
        customerContactId: session.contactId,
        legacyUserId: session.legacyUserId,
        groupId: session.selectedGroupId as number,
        groupName: session.selectedGroupName ?? "",
        unitId: session.selectedUnitId as number,
        unitName: session.selectedUnitName ?? "",
        unitSchema: session.selectedUnitSchema ?? "",
        updatedAt: now,
      },
    });
}
