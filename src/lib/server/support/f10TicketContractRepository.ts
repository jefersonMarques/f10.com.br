import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";

type DatabaseRow = Record<string, unknown>;
type Database = ReturnType<typeof getDatabase>;
type DatabaseTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

function rowsOf(result: unknown): DatabaseRow[] {
  return result as DatabaseRow[];
}

function sourceSystem(unitId: number): string {
  return unitId === 1 ? "f10_sheet" : "f10_sheet_unit_" + unitId;
}

export async function searchF10TicketContracts(unitId: number, search: string) {
  const query = search.trim().slice(0, 120);
  if (query.length < 2 && !/^[0-9]$/.test(query)) return [];
  const pattern = "%" + query + "%";
  const sheetSource = sourceSystem(unitId);

  const rows = await getDatabase().execute(sql`
    SELECT
      c.contract_id::text AS "contractId",
      c.numero_contrato AS "contractNumber",
      coalesce(nullif(api_holder.name, ''),
        nullif(c.source_record ->> 'nome_fantasia', ''),
        nullif(p.spreadsheet_student_name, ''), nullif(sheet.account_name, ''),
        nullif(person.customer_name, ''),
        'Contrato F10 #' || c.contract_id::text) AS "displayName",
      coalesce(nullif(person.customer_name, ''), nullif(c.source_record ->> 'nome', '')) AS "personName",
      coalesce(nullif(api_holder.name, ''), nullif(p.spreadsheet_holder_name, ''), nullif(sheet.holder_name, '')) AS "holderName",
      coalesce(nullif(p.apelido, ''), nullif(sheet.nickname, '')) AS "nickname",
      g.name AS "groupName",
      coalesce(nullif(c.x_status, ''), c.status::text, 'Não informado') AS "status"
    FROM f10_customer_contracts c
    LEFT JOIN f10_customer_contract_profiles p
      ON p.unit_id = c.unit_id AND p.contract_id = c.contract_id
    LEFT JOIN f10_customer_holder_profiles api_holder
      ON api_holder.unit_id = c.unit_id AND api_holder.holder_id = c.titular_id
    LEFT JOIN LATERAL (
      SELECT o.name AS account_name, u.apelido AS nickname,
        holder.name AS holder_name, u.group_id
      FROM customer_units u
      JOIN customer_organizations o ON o.id = u.organization_id
      LEFT JOIN customer_unit_contacts holder
        ON holder.unit_id = u.id AND holder.contact_kind = 'holder'
      WHERE u.source_system = ${sheetSource}
        AND (
          (u.f10_unit_id = c.unit_id AND u.f10_contract_id = c.contract_id)
          OR (
            u.source_id = c.numero_contrato AND c.numero_contrato IS NOT NULL
            AND (
              SELECT count(*) FROM f10_customer_contracts other
              WHERE other.unit_id = c.unit_id AND other.numero_contrato = c.numero_contrato
            ) = 1
          )
        )
      ORDER BY
        CASE WHEN u.f10_unit_id = c.unit_id AND u.f10_contract_id = c.contract_id
          THEN 0 ELSE 1 END, u.id
      LIMIT 1
    ) sheet ON true
    LEFT JOIN customer_groups g ON g.id = coalesce(p.group_id, sheet.group_id)
    LEFT JOIN LATERAL (
      SELECT r.customer_name
      FROM f10_customer_sync_rows r
      JOIN f10_customer_sync_batches b ON b.id = r.batch_id
      WHERE b.unit_id = c.unit_id AND r.person_id = c.pessoa_id
        AND nullif(r.customer_name, '') IS NOT NULL
      ORDER BY b.created_at DESC LIMIT 1
    ) person ON true
    WHERE c.unit_id = ${unitId}
      AND (
        coalesce(c.numero_contrato, '') ILIKE ${pattern}
        OR c.contract_id::text ILIKE ${pattern}
        OR c.pessoa_id::text ILIKE ${pattern}
        OR coalesce(p.spreadsheet_student_name, '') ILIKE ${pattern}
        OR coalesce(p.spreadsheet_holder_name, '') ILIKE ${pattern}
        OR coalesce(api_holder.name, '') ILIKE ${pattern}
        OR coalesce(api_holder.email, '') ILIKE ${pattern}
        OR coalesce(p.apelido, '') ILIKE ${pattern}
        OR coalesce(sheet.account_name, '') ILIKE ${pattern}
        OR coalesce(sheet.nickname, '') ILIKE ${pattern}
        OR coalesce(sheet.holder_name, '') ILIKE ${pattern}
        OR coalesce(person.customer_name, '') ILIKE ${pattern}
        OR coalesce(c.source_record ->> 'nome', '') ILIKE ${pattern}
        OR coalesce(c.source_record ->> 'nome_fantasia', '') ILIKE ${pattern}
      )
    ORDER BY
      (c.numero_contrato = ${query}) DESC,
      coalesce(nullif(api_holder.name, ''),
        nullif(p.spreadsheet_student_name, ''), nullif(sheet.account_name, ''),
        nullif(person.customer_name, ''), c.numero_contrato),
      c.contract_id
    LIMIT 30
  `);

  return rowsOf(rows);
}

export type ResolvedF10TicketContract = {
  contactId: string;
  unitId: number;
  contractId: number;
  name: string;
};

export async function resolveF10TicketContract(
  tx: DatabaseTransaction,
  unitId: number,
  contractId: number,
): Promise<ResolvedF10TicketContract> {
  const contractRows = rowsOf(await tx.execute(sql`
    SELECT c.contract_id, c.numero_contrato, c.pessoa_id,
      coalesce(
        nullif(person.customer_name, ''),
        nullif(c.source_record ->> 'nome', ''),
        nullif(profile.spreadsheet_student_name, ''),
        'Contato do contrato F10 #' || c.contract_id::text
      ) AS contact_name,
      nullif(person.email, '') AS contact_email
    FROM f10_customer_contracts c
    LEFT JOIN f10_customer_contract_profiles profile
      ON profile.unit_id = c.unit_id AND profile.contract_id = c.contract_id
    LEFT JOIN LATERAL (
      SELECT r.customer_name, r.email
      FROM f10_customer_sync_rows r
      JOIN f10_customer_sync_batches b ON b.id = r.batch_id
      WHERE b.unit_id = c.unit_id AND r.person_id = c.pessoa_id
        AND nullif(r.customer_name, '') IS NOT NULL
      ORDER BY b.created_at DESC LIMIT 1
    ) person ON true
    WHERE c.unit_id = ${unitId} AND c.contract_id = ${contractId}
    LIMIT 1
  `));

  const contract = contractRows[0];
  if (!contract) throw new Error("F10_TICKET_CONTRACT_NOT_FOUND");

  const personId = contract.pessoa_id === null ? null : String(contract.pessoa_id);
  const source = personId ? "f10_api:" + unitId : "f10_contract:" + unitId;
  const sourceId = personId ?? String(contractId);
  const name = String(contract.contact_name ?? "Contato F10 #" + sourceId).slice(0, 120);
  const email = typeof contract.contact_email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contract.contact_email)
    ? contract.contact_email.trim().toLowerCase() : null;

  let contactId: string | null = null;
  if (personId) {
    const mapped = rowsOf(await tx.execute(sql`
      SELECT contact.id::text AS id
      FROM f10_customer_external_identities identity
      JOIN customer_contacts contact ON contact.id = identity.customer_contact_id
      WHERE identity.unit_id = ${unitId}
        AND identity.person_id = ${personId}::bigint
        AND contact.active = true
      LIMIT 1
    `));
    contactId = mapped.length === 1 ? String(mapped[0].id) : null;
  }

  if (!contactId) {
    await tx.execute(sql`
      INSERT INTO customer_contacts (
        name, email, active, import_source, import_source_id
      )
      VALUES (${name}, ${email}, true, ${source}, ${sourceId})
      ON CONFLICT (import_source, import_source_id)
        WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL
      DO NOTHING
    `);

    const contacts = rowsOf(await tx.execute(sql`
      SELECT id::text AS id FROM customer_contacts
      WHERE import_source = ${source}
        AND import_source_id = ${sourceId}
        AND active = true
      LIMIT 1
    `));
    contactId = contacts.length === 1 ? String(contacts[0].id) : null;
  }

  if (!contactId) throw new Error("F10_TICKET_CONTACT_UNAVAILABLE");
  return { contactId, unitId, contractId, name };
}
