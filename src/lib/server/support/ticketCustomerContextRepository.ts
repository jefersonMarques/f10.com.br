import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";

export type TicketCustomerContext = {
  ticketId: string;
  legacyUserId: string;
  groupId: number;
  groupName: string;
  unitId: number;
  unitName: string;
  unitSchema: string;
};

export async function listTicketCustomerContexts(
  ticketIds: string[],
): Promise<TicketCustomerContext[]> {
  const uniqueTicketIds = Array.from(new Set(ticketIds.filter(Boolean)));
  if (uniqueTicketIds.length === 0) return [];

  const db = getDatabase();
  return db
    .select({
      ticketId: ticketCustomerContexts.ticketId,
      legacyUserId: ticketCustomerContexts.legacyUserId,
      groupId: ticketCustomerContexts.groupId,
      groupName: ticketCustomerContexts.groupName,
      unitId: ticketCustomerContexts.unitId,
      unitName: ticketCustomerContexts.unitName,
      unitSchema: ticketCustomerContexts.unitSchema,
    })
    .from(ticketCustomerContexts)
    .where(inArray(ticketCustomerContexts.ticketId, uniqueTicketIds));
}

export async function getTicketCustomerContext(
  ticketId: string,
): Promise<TicketCustomerContext | null> {
  if (!ticketId) return null;
  const db = getDatabase();
  const [context] = await db
    .select({
      ticketId: ticketCustomerContexts.ticketId,
      legacyUserId: ticketCustomerContexts.legacyUserId,
      groupId: ticketCustomerContexts.groupId,
      groupName: ticketCustomerContexts.groupName,
      unitId: ticketCustomerContexts.unitId,
      unitName: ticketCustomerContexts.unitName,
      unitSchema: ticketCustomerContexts.unitSchema,
    })
    .from(ticketCustomerContexts)
    .where(eq(ticketCustomerContexts.ticketId, ticketId))
    .limit(1);
  return context ?? null;
}
