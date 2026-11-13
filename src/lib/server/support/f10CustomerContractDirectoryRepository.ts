import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { listF10CustomerContractOwners } from "$lib/server/integrations/f10/f10CustomerApi";

type DatabaseRow = Record<string, unknown>;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const IMPORT_CHUNK_SIZE = 100;

function rowsOf(result: unknown): DatabaseRow[] {
  return result as DatabaseRow[];
}

function sourceSystem(unitId: number): string {
  return unitId === 1 ? "f10_sheet" : "f10_sheet_unit_" + unitId;
}

export async function refreshMissingF10Contracts(unitId: number) {
  // Concluir toda a paginação da API antes de escrever no banco.
  const snapshot = await listF10CustomerContractOwners(unitId);
  const db = getDatabase();
  let created = 0;

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('f10_customer_contract_refresh'), ${unitId}::integer)`);

    for (let offset = 0; offset < snapshot.contracts.length; offset += IMPORT_CHUNK_SIZE) {
      const batch = snapshot.contracts.slice(offset, offset + IMPORT_CHUNK_SIZE);
      const values = batch.map((contract) => sql`(
        ${unitId}, ${contract.contractId}, ${contract.contractNumber},
        ${contract.personId}, ${contract.holderId}, ${contract.status},
        ${contract.statusLabel}, ${contract.courseId}, ${contract.sourceId},
        ${contract.sellerId}, ${contract.telemarketingId},
        ${contract.enrollmentDate}, ${contract.completionDate},
        ${contract.cancellationDate}, ${JSON.stringify(contract.sourceRecord)}::jsonb
      )`);

      const inserted = rowsOf(await tx.execute(sql`
        INSERT INTO f10_customer_contracts (
          unit_id, contract_id, numero_contrato, pessoa_id, titular_id,
          status, x_status, curso_id, fonte_id, vendedor_id, telemarketing_id,
          matricula, conclusao, data_cancelamento, source_record
        )
        VALUES ${sql.join(values, sql`, `)}
        ON CONFLICT (unit_id, contract_id) DO NOTHING
        RETURNING contract_id
      `));
      created += inserted.length;
    }
  });

  return { imported: created, foundInApi: snapshot.contractsCount };
}

export async function listF10CustomerContractUnits(options: {
  unitId: number;
  query: string;
  page: number;
  groupId?: string;
  status?: string;
  pageSize?: number;
}) {
  const db = getDatabase();
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(10, options.pageSize ?? DEFAULT_PAGE_SIZE));
  const query = options.query.trim().slice(0, 120);
  const searchPattern = "%" + query + "%";
  const sheetSource = sourceSystem(options.unitId);

  // O contrato da API é a identidade principal; a planilha complementa.
  // Se o número comercial é ambíguo, não criar associação automática.
  const directory = sql`
    WITH directory AS (
      SELECT
        c.unit_id,
        c.contract_id,
        c.numero_contrato,
        c.pessoa_id AS f10_person_id,
        c.titular_id AS f10_holder_id,
        sheet.id AS sheet_unit_id,
        coalesce(nullif(p.apelido, ''), nullif(sheet.apelido, ''), '') AS apelido,
        coalesce(nullif(c.x_status, ''), CASE WHEN c.status = 1 THEN 'Ativo'
          ELSE c.status::text END, 'Não informado') AS commercial_status,
        coalesce(nullif(p.contracted_plan, ''), nullif(sheet.contracted_plan, '')) AS contracted_plan,
        g.id AS group_id,
        g.name AS group_name,
        coalesce(
          nullif(contact.name, ''),
          nullif(person.customer_name, ''),
          nullif(c.source_record ->> 'nome', ''),
          nullif(p.spreadsheet_student_name, ''),
          nullif(sheet.client_name, ''),
          'Pessoa F10 #' || c.pessoa_id::text,
          'Contrato F10 #' || c.contract_id::text
        ) AS client_name,
        coalesce(contact.email, person.email, sheet.unit_email, '') AS customer_email,
        coalesce(sheet.holder_name, '') AS holder_name,
        coalesce(sheet.holder_email, '') AS holder_email,
        coalesce(contact.id, sheet.customer_contact_id) AS customer_contact_id
      FROM f10_customer_contracts c
      LEFT JOIN f10_customer_contract_profiles p
        ON p.unit_id = c.unit_id AND p.contract_id = c.contract_id
      LEFT JOIN LATERAL (
        SELECT
          u.id, u.group_id, u.apelido, u.name, u.contracted_plan,
          o.name AS client_name, general.email AS unit_email,
          holder.name AS holder_name, holder.email AS holder_email,
          general.customer_contact_id
        FROM customer_units u
        JOIN customer_organizations o ON o.id = u.organization_id
        LEFT JOIN customer_unit_contacts general
          ON general.unit_id = u.id AND general.contact_kind = 'general'
        LEFT JOIN customer_unit_contacts holder
          ON holder.unit_id = u.id AND holder.contact_kind = 'holder'
        WHERE u.source_system = ${sheetSource}
          AND (
            (u.f10_unit_id = c.unit_id AND u.f10_contract_id = c.contract_id)
            OR (
              u.source_id = c.numero_contrato AND c.numero_contrato IS NOT NULL
              AND (
                SELECT count(*) FROM f10_customer_contracts unique_number
                WHERE unique_number.unit_id = c.unit_id
                  AND unique_number.numero_contrato = c.numero_contrato
              ) = 1
            )
          )
        ORDER BY
          CASE WHEN u.f10_unit_id = c.unit_id AND u.f10_contract_id = c.contract_id
            THEN 0 ELSE 1 END,
          u.id
        LIMIT 1
      ) sheet ON true
      LEFT JOIN customer_groups g
        ON g.id = coalesce(p.group_id, sheet.group_id)
      LEFT JOIN f10_customer_external_identities identity
        ON identity.unit_id = c.unit_id AND identity.person_id = c.pessoa_id
      LEFT JOIN customer_contacts contact
        ON contact.id = identity.customer_contact_id
      LEFT JOIN LATERAL (
        SELECT r.customer_name, nullif(r.email, '') AS email
        FROM f10_customer_sync_rows r
        JOIN f10_customer_sync_batches b ON b.id = r.batch_id
        WHERE b.unit_id = c.unit_id
          AND r.person_id = c.pessoa_id
          AND nullif(r.customer_name, '') IS NOT NULL
        ORDER BY b.created_at DESC
        LIMIT 1
      ) person ON true
      WHERE c.unit_id = ${options.unitId}
    )
  `;

  const filters = [
    ...(query ? [sql`(
      coalesce(apelido, '') ILIKE ${searchPattern}
      OR coalesce(numero_contrato, '') ILIKE ${searchPattern}
      OR contract_id::text ILIKE ${searchPattern}
      OR coalesce(f10_person_id::text, '') ILIKE ${searchPattern}
      OR coalesce(client_name, '') ILIKE ${searchPattern}
      OR coalesce(customer_email, '') ILIKE ${searchPattern}
      OR coalesce(holder_name, '') ILIKE ${searchPattern}
      OR coalesce(holder_email, '') ILIKE ${searchPattern}
      OR coalesce(group_name, '') ILIKE ${searchPattern}
    )`] : []),
    ...(options.groupId ? [sql`group_id = ${options.groupId}::uuid`] : []),
    ...(options.status ? [sql`commercial_status = ${options.status}`] : []),
  ];

  const where = filters.length > 0
    ? sql`WHERE ${sql.join(filters, sql` AND `)}`
    : sql``;

  try {
    const summary = rowsOf(await db.execute(sql`
      ${directory}
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE lower(commercial_status) = 'ativo')::int AS active,
        count(DISTINCT group_id)::int AS groups,
        count(*) FILTER (WHERE sheet_unit_id IS NOT NULL)::int AS with_sheet
      FROM directory
    `));

    const count = rowsOf(await db.execute(sql`
      ${directory} SELECT count(*)::int AS total FROM directory ${where}
    `));
    const totalMatched = Number(count[0]?.total ?? 0);
    const pageCount = Math.max(1, Math.ceil(totalMatched / pageSize));
    const page = Math.min(Math.max(1, options.page), pageCount);

    const rows = rowsOf(await db.execute(sql`
      ${directory}
      SELECT unit_id, contract_id, numero_contrato, f10_person_id,
        f10_holder_id, sheet_unit_id, apelido, commercial_status,
        contracted_plan, group_name, client_name, customer_contact_id
      FROM directory ${where}
      ORDER BY coalesce(nullif(apelido, ''), client_name),
        numero_contrato NULLS LAST, contract_id
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
    `));

    const groups = rowsOf(await db.execute(sql`
      ${directory}
      SELECT group_id AS id, group_name AS name, count(*)::int AS units
      FROM directory
      WHERE group_id IS NOT NULL
      GROUP BY group_id, group_name
      ORDER BY group_name
    `));

    const statuses = rowsOf(await db.execute(sql`
      ${directory}
      SELECT commercial_status AS value, count(*)::int AS total
      FROM directory
      GROUP BY commercial_status
      ORDER BY commercial_status
    `));

    return {
      rows,
      summary: summary[0] ?? { total: 0, active: 0, groups: 0, with_sheet: 0 },
      groups, statuses, totalMatched, page, pageCount, unavailable: false,
    };
  } catch (cause) {
    const code = cause && typeof cause === "object" && "code" in cause &&
      typeof cause.code === "string" ? cause.code : "UNEXPECTED";
    console.error("[f10.customers.contracts]", { code });
    return {
      rows: [],
      summary: { total: 0, active: 0, groups: 0, with_sheet: 0 },
      groups: [], statuses: [], totalMatched: 0, page: 1, pageCount: 1,
      unavailable: true,
    };
  }
}
