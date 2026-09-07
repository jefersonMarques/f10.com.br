import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { ticketCustomerContexts } from "$lib/server/db/customerPortalSchema";

export type TicketCustomerContext = {
  ticketId: string;
  legacyUserId: string;
  scope: "unit" | "global";
  groupId: number | null;
  groupName: string | null;
  unitId: number | null;
  unitName: string | null;
  unitSchema: string | null;
};

type TicketCustomerContextRow = {
  ticketId: string;
  legacyUserId: string;
  contextScope: string;
  groupId: number | null;
  groupName: string | null;
  unitId: number | null;
  unitName: string | null;
  unitSchema: string | null;
};

function mapTicketCustomerContext(row: TicketCustomerContextRow): TicketCustomerContext {
  return {
    ticketId: row.ticketId,
    legacyUserId: row.legacyUserId,
    scope: row.contextScope === "global" ? "global" : "unit",
    groupId: row.groupId,
    groupName: row.groupName,
    unitId: row.unitId,
    unitName: row.unitName,
    unitSchema: row.unitSchema,
  };
}

export async function listTicketCustomerContexts(
  ticketIds: string[],
): Promise<TicketCustomerContext[]> {
  const uniqueTicketIds = Array.from(new Set(ticketIds.filter(Boolean)));
  if (uniqueTicketIds.length === 0) return [];

  const rows = await getDatabase()
    .select({
      ticketId: ticketCustomerContexts.ticketId,
      legacyUserId: ticketCustomerContexts.legacyUserId,
      contextScope: ticketCustomerContexts.contextScope,
      groupId: ticketCustomerContexts.groupId,
      groupName: ticketCustomerContexts.groupName,
      unitId: ticketCustomerContexts.unitId,
      unitName: ticketCustomerContexts.unitName,
      unitSchema: ticketCustomerContexts.unitSchema,
    })
    .from(ticketCustomerContexts)
    .where(inArray(ticketCustomerContexts.ticketId, uniqueTicketIds));

  return rows.map(mapTicketCustomerContext);
}

export async function getTicketCustomerContext(
  ticketId: string,
): Promise<TicketCustomerContext | null> {
  if (!ticketId) return null;
  const [row] = await getDatabase()
    .select({
      ticketId: ticketCustomerContexts.ticketId,
      legacyUserId: ticketCustomerContexts.legacyUserId,
      contextScope: ticketCustomerContexts.contextScope,
      groupId: ticketCustomerContexts.groupId,
      groupName: ticketCustomerContexts.groupName,
      unitId: ticketCustomerContexts.unitId,
      unitName: ticketCustomerContexts.unitName,
      unitSchema: ticketCustomerContexts.unitSchema,
    })
    .from(ticketCustomerContexts)
    .where(eq(ticketCustomerContexts.ticketId, ticketId))
    .limit(1);

  return row ? mapTicketCustomerContext(row) : null;
}
