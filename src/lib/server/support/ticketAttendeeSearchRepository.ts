import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { customerContacts } from "$lib/server/db/supportSchema";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";

export async function searchAuthorizedTicketAttendees(
  search: string,
  contractIds: number[],
) {
  const query = search.trim().slice(0, 120);
  const uniqueIds = [...new Set(contractIds)];

  if (query.length < 2 || uniqueIds.length === 0) return [];
  if (uniqueIds.length > 500 ||
      uniqueIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("SUPPORT_CONTRACT_SELECTION_INVALID");
  }

  const unitId = getConfiguredF10UnitId();
  const pattern = `%${query}%`;
  const contractParameters = sql.join(
    uniqueIds.map((id) => sql`${id}`),
    sql`, `,
  );

  return getDatabase()
    .select({
      id: customerContacts.id,
      name: customerContacts.name,
      email: customerContacts.email,
    })
    .from(customerContacts)
    .where(and(
      eq(customerContacts.active, true),
      or(
        ilike(customerContacts.name, pattern),
        ilike(customerContacts.email, pattern),
      ),
      sql`NOT EXISTS (
        SELECT 1 FROM customer_contact_merges merged
        WHERE merged.source_contact_id = ${customerContacts.id}
      )`,
      sql`(
        SELECT count(*)::int
        FROM customer_contract_access access
        WHERE access.customer_contact_id = ${customerContacts.id}
          AND access.unit_id = ${unitId}
          AND access.contract_id IN (${contractParameters})
      ) = ${uniqueIds.length}`,
    ))
    .orderBy(asc(customerContacts.name), asc(customerContacts.id))
    .limit(20);
}
