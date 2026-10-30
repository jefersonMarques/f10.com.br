import { eq, sql } from "drizzle-orm";
import type { TicketCommercialUnit } from "$lib/components/operations/tickets/types";
import { getDatabase } from "$lib/server/db";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { requireTicketAccess, type SupportPermissionMap } from "$lib/server/support/supportAccess";
import { ticketEvents, tickets } from "$lib/server/db/supportSchema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sourceSystem(): string {
  const unitId = getConfiguredF10UnitId();
  return unitId === 1 ? "f10_sheet" : "f10_sheet_unit_" + unitId;
}

type CommercialUnitRow = {
  id: string;
  contract_number: string;
  name: string;
  organization_name: string;
  group_name: string;
  group_source_id: string;
  commercial_status: string;
};

function mapUnit(row: CommercialUnitRow): TicketCommercialUnit {
  return {
    id: row.id,
    contractNumber: row.contract_number,
    name: row.name,
    organizationName: row.organization_name,
    groupName: row.group_name,
    groupSourceId: row.group_source_id,
    status: row.commercial_status,
  };
}

export async function searchCommercialTicketUnits(query: string): Promise<TicketCommercialUnit[]> {
  const normalized = query.trim().slice(0, 120);
  if (normalized.length < 2) return [];
  const pattern = "%" + normalized + "%";
  const source = sourceSystem();
  const rows = await getDatabase().execute(sql`
    SELECT u.id::text AS id, u.source_id AS contract_number,
           coalesce(nullif(u.apelido, ''), u.name) AS name,
           o.name AS organization_name, g.name AS group_name,
           g.source_group_id AS group_source_id,
           u.commercial_status
    FROM customer_units u
    JOIN customer_groups g ON g.id = u.group_id
    JOIN customer_organizations o ON o.id = u.organization_id
    WHERE u.source_system = ${source}
      AND g.source_system = ${source}
      AND (
        u.source_id ILIKE ${pattern}
        OR coalesce(nullif(u.apelido, ''), u.name) ILIKE ${pattern}
        OR o.name ILIKE ${pattern}
        OR g.name ILIKE ${pattern}
        OR g.source_group_id = ${normalized}
      )
    ORDER BY (u.source_id = ${normalized}) DESC, g.name, u.name
    LIMIT 30
  `);
  return (rows as unknown as CommercialUnitRow[]).map(mapUnit);
}

export async function getTicketCommercialUnit(
  ticketId: string,
): Promise<TicketCommercialUnit | null> {
  const source = sourceSystem();
  const rows = await getDatabase().execute(sql`
    SELECT u.id::text AS id, u.source_id AS contract_number,
           coalesce(nullif(u.apelido, ''), u.name) AS name,
           o.name AS organization_name, g.name AS group_name,
           g.source_group_id AS group_source_id, u.commercial_status
    FROM ticket_commercial_unit_links t
    JOIN customer_units u ON u.id = t.customer_unit_id
    JOIN customer_groups g ON g.id = u.group_id
    JOIN customer_organizations o ON o.id = u.organization_id
    WHERE t.ticket_id = ${ticketId}::uuid
      AND u.source_system = ${source}
    LIMIT 1
  `);
  const row = (rows as unknown as CommercialUnitRow[])[0];
  return row ? mapUnit(row) : null;
}

export async function setTicketCommercialUnit(
  actorUserId: string,
  permissions: SupportPermissionMap,
  ticketId: string,
  unitId: string | null,
): Promise<void> {
  const scope = getPermissionScope(permissions, "tickets.reply");
  if (!scope || !hasPermission(permissions, "customers.view")) {
    throw new Error("TICKET_COMMERCIAL_LINK_FORBIDDEN");
  }
  if (unitId !== null && !UUID.test(unitId)) {
    throw new Error("TICKET_COMMERCIAL_UNIT_INVALID");
  }
  await requireTicketAccess(actorUserId, scope, ticketId);
  const db = getDatabase();
  const source = sourceSystem();
  await db.transaction(async (tx) => {
    if (unitId === null) {
      await tx.execute(sql`
        DELETE FROM ticket_commercial_unit_links
        WHERE ticket_id = ${ticketId}::uuid
      `);
    } else {
      const saved = await tx.execute(sql`
        INSERT INTO ticket_commercial_unit_links (
          ticket_id, customer_unit_id, linked_by
        )
        SELECT ${ticketId}::uuid, u.id, ${actorUserId}::uuid
        FROM customer_units u
        JOIN customer_groups g ON g.id = u.group_id
        WHERE u.id = ${unitId}::uuid
          AND u.source_system = ${source}
          AND g.source_system = ${source}
        ON CONFLICT (ticket_id) DO UPDATE SET
          customer_unit_id = excluded.customer_unit_id,
          linked_by = excluded.linked_by,
          updated_at = now()
        RETURNING ticket_id
      `);
      if ((saved as unknown as Array<{ ticket_id: string }>).length !== 1) {
        throw new Error("TICKET_COMMERCIAL_UNIT_NOT_FOUND");
      }
    }
    await tx.update(tickets).set({ updatedAt: new Date() }).where(eq(tickets.id, ticketId));
    await tx.insert(ticketEvents).values({
      ticketId,
      actorUserId,
      eventType: unitId ? "ticket.commercial_unit.linked" : "ticket.commercial_unit.unlinked",
      metadata: unitId ? { customerUnitId: unitId } : {},
    });
  });
}
