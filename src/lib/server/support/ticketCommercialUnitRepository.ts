import { and, eq, sql } from "drizzle-orm";
import type { TicketCommercialUnit } from "$lib/components/operations/tickets/types";
import { getDatabase } from "$lib/server/db";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";
import { getPermissionScope, hasPermission } from "$lib/server/auth/permissions";
import { requireTicketAccess, type SupportPermissionMap } from "$lib/server/support/supportAccess";
import { customerContacts, ticketEvents, tickets } from "$lib/server/db/supportSchema";

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

export type SuggestedTicketCommercialUnit = Pick<
  TicketCommercialUnit, "id" | "name" | "contractNumber"
>;

export async function getSuggestedTicketCommercialUnit(
  contactId: string,
  ticketId: string,
): Promise<SuggestedTicketCommercialUnit | null> {
  const rows = await getDatabase().execute(sql`
    SELECT DISTINCT u.id::text AS id,
      coalesce(nullif(u.apelido, ''), u.name) AS name,
      u.source_id AS contract_number
    FROM ticket_commercial_unit_links history
    JOIN tickets previous ON previous.id = history.ticket_id
    LEFT JOIN ticket_requester_profiles requester
      ON requester.ticket_id = previous.id
    JOIN customer_units u ON u.id = history.customer_unit_id
    WHERE coalesce(requester.customer_contact_id, previous.customer_contact_id) =
      ${contactId}::uuid
      AND previous.id <> ${ticketId}::uuid
      AND history.linked_by IS NOT NULL
      AND u.source_system = ${sourceSystem()}
    ORDER BY u.id
    LIMIT 2
  `);
  const units = rows as unknown as Array<{
    id: string;
    name: string;
    contract_number: string;
  }>;
  if (units.length !== 1) return null;

  return {
    id: units[0].id,
    name: units[0].name,
    contractNumber: units[0].contract_number,
  };
}

export async function reuseTicketCommercialUnit(
  ticketId: string,
  customerContactId: string | null,
  expectedUnitName: string | null = null,
): Promise<void> {
  if (!customerContactId) return;

  const suggested = await getSuggestedTicketCommercialUnit(customerContactId, ticketId);
  if (!suggested) return;

  if (expectedUnitName?.trim()) {
    const requestedName = expectedUnitName.trim().toLocaleLowerCase("pt-BR");
    const savedName = suggested.name.trim().toLocaleLowerCase("pt-BR");
    if (requestedName !== savedName) return;
  }

  const db = getDatabase();
  await db.transaction(async (tx) => {
    const inserted = await tx.execute(sql`
      INSERT INTO ticket_commercial_unit_links (ticket_id, customer_unit_id)
      VALUES (${ticketId}::uuid, ${suggested.id}::uuid)
      ON CONFLICT (ticket_id) DO NOTHING
      RETURNING ticket_id
    `);
    if ((inserted as unknown as unknown[]).length === 0) return;

    await tx.insert(ticketEvents).values({
      ticketId,
      eventType: "ticket.commercial_unit.reused",
      metadata: { customerUnitId: suggested.id, source: "confirmed_history" },
    });
    await tx.update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, ticketId));
  });
}

export type CommercialUnitProfile = {
  id: string;
  name: string;
  contractNumber: string;
  organizationName: string;
  groupName: string;
  status: string;
  plan: string | null;
  city: string | null;
  generalEmail: string | null;
  generalContactId: string | null;
  holderName: string | null;
  holderEmail: string | null;
};

export async function getCommercialUnitProfile(unitId: string): Promise<CommercialUnitProfile | null> {
  if (!UUID.test(unitId)) return null;

  const rows = await getDatabase().execute(sql`
    SELECT u.id::text AS id,
      coalesce(nullif(u.apelido, ''), u.name) AS name,
      u.source_id AS contract_number,
      o.name AS organization_name,
      g.name AS group_name,
      u.commercial_status AS status,
      u.contracted_plan AS plan,
      u.city,
      general.email AS general_email,
      general.customer_contact_id::text AS general_contact_id,
      holder.name AS holder_name,
      holder.email AS holder_email
    FROM customer_units u
    JOIN customer_groups g ON g.id = u.group_id
    JOIN customer_organizations o ON o.id = u.organization_id
    LEFT JOIN customer_unit_contacts general
      ON general.unit_id = u.id AND general.contact_kind = 'general'
    LEFT JOIN customer_unit_contacts holder
      ON holder.unit_id = u.id AND holder.contact_kind = 'holder'
    WHERE u.id = ${unitId}::uuid AND u.source_system = ${sourceSystem()}
    LIMIT 1
  `);
  const row = (rows as unknown as Array<{
    id: string;
    name: string;
    contract_number: string;
    organization_name: string;
    group_name: string;
    status: string;
    plan: string | null;
    city: string | null;
    general_email: string | null;
    general_contact_id: string | null;
    holder_name: string | null;
    holder_email: string | null;
  }>)[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    contractNumber: row.contract_number,
    organizationName: row.organization_name,
    groupName: row.group_name,
    status: row.status,
    plan: row.plan,
    city: row.city,
    generalEmail: row.general_email,
    generalContactId: row.general_contact_id,
    holderName: row.holder_name,
    holderEmail: row.holder_email,
  };
}

export async function findUniqueCustomerContactByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;

  const contacts = await getDatabase().select({ id: customerContacts.id })
    .from(customerContacts)
    .where(and(
      eq(customerContacts.active, true),
      sql`lower(${customerContacts.email}) = ${normalized}`,
    ))
    .limit(2);
  return contacts.length === 1 ? contacts[0].id : null;
}
