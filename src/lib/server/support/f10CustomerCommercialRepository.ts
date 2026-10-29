import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import type { ParsedCustomerImport } from "$lib/server/support/customerImportFile";
import { toF10CommercialRecord } from "$lib/server/support/f10CustomerCommercialFields";

type DatabaseRow = Record<string, unknown>;
const PAGE_SIZE = 20;
const SHEET_PAGE_SIZE = 20;

function rowsOf(result: unknown): DatabaseRow[] {
  return result as DatabaseRow[];
}

function sourceSystem(unitId: number): string {
  // Compatível com grupos da planilha já importados para a unidade 1.
  return unitId === 1 ? "f10_sheet" : "f10_sheet_unit_" + unitId;
}

export async function stageF10CustomerSheet(
  unitId: number, actorId: string, fileName: string, parsed: ParsedCustomerImport,
): Promise<string> {
  const db = getDatabase();
  // Descarta apenas prévias antigas; perfis e vínculos aplicados continuam persistidos.
  await db.execute(sql`
    DELETE FROM f10_customer_sheet_batches
    WHERE created_at < now() - interval '90 days'
  `);
  const available = rowsOf(await db.execute(sql`
    SELECT EXISTS(
      SELECT 1 FROM f10_customer_contracts WHERE unit_id = ${unitId}
    ) AS has_contracts
  `));
  if (!available[0]?.has_contracts) throw new Error("F10_CONTRACTS_NOT_IMPORTED");

  return db.transaction(async (tx) => {
    const batches = rowsOf(await tx.execute(sql`
      INSERT INTO f10_customer_sheet_batches (unit_id, created_by, file_name, file_hash, total_rows)
      VALUES (${unitId}, ${actorId}::uuid, ${fileName.slice(0, 180)}, ${parsed.fileHash}, ${parsed.rows.length})
      RETURNING id
    `));
    const batchId = String(batches[0].id);

    for (let i = 0; i < parsed.rows.length; i += 100) {
      const items = parsed.rows.slice(i, i + 100);
      const entries = items.map(({ lineNumber, record }) => sql`(
        ${batchId}::uuid, ${lineNumber}, ${record.sourceId},
        ${JSON.stringify(toF10CommercialRecord(record))}::jsonb
      )`);
      await tx.execute(sql`
        INSERT INTO f10_customer_sheet_rows (batch_id, line_number, source_id, record)
        VALUES ${sql.join(entries, sql`, `)}
      `);
    }

    // Aceita apenas número comercial EXATO e único em ambas as origens.
    await tx.execute(sql`
      WITH candidate AS (
        SELECT r.id,
          (SELECT count(*)::int FROM f10_customer_sheet_rows other
           WHERE other.batch_id = ${batchId}::uuid AND other.source_id = r.source_id) AS sheet_count,
          (SELECT count(*)::int FROM f10_customer_contracts c
           WHERE c.unit_id = ${unitId} AND c.numero_contrato = r.source_id) AS contract_count,
          (SELECT min(c.contract_id) FROM f10_customer_contracts c
           WHERE c.unit_id = ${unitId} AND c.numero_contrato = r.source_id) AS found_id
        FROM f10_customer_sheet_rows r WHERE r.batch_id = ${batchId}::uuid
      )
      UPDATE f10_customer_sheet_rows r
      SET match_status = CASE
            WHEN candidate.sheet_count > 1 OR candidate.contract_count > 1 THEN 'ambiguous'
            WHEN candidate.contract_count = 1 THEN 'matched'
            ELSE 'not_found' END,
          contract_id = CASE WHEN candidate.sheet_count = 1 AND candidate.contract_count = 1
                             THEN candidate.found_id ELSE NULL END
      FROM candidate WHERE r.id = candidate.id
    `);
    return batchId;
  });
}

export async function getF10CustomerSheetPage(
  unitId: number, selectedBatch: string | null, requestedPage: number,
) {
  const db = getDatabase();
  const batches = rowsOf(await db.execute(sql`
    SELECT id, status, total_rows, created_at, applied_at
    FROM f10_customer_sheet_batches
    WHERE unit_id = ${unitId}
    ORDER BY created_at DESC LIMIT 10
  `));
  const batchId = selectedBatch ?? (batches[0] ? String(batches[0].id) : null);
  if (!batchId) return { batches, batch: null, summary: null, rows: [], page: 1, pages: 1 };

  const found = rowsOf(await db.execute(sql`
    SELECT id, file_name, status, total_rows, created_at, applied_at
    FROM f10_customer_sheet_batches
    WHERE id = ${batchId}::uuid AND unit_id = ${unitId}
  `));
  if (!found.length) return { batches, batch: null, summary: null, rows: [], page: 1, pages: 1 };

  const summary = rowsOf(await db.execute(sql`
    SELECT count(*) FILTER (WHERE match_status='matched')::int AS matched,
           count(*) FILTER (WHERE match_status='not_found')::int AS missing,
           count(*) FILTER (WHERE match_status='ambiguous')::int AS ambiguous,
           count(*) FILTER (WHERE applied_at IS NOT NULL)::int AS applied
    FROM f10_customer_sheet_rows WHERE batch_id = ${batchId}::uuid
  `));
  const pages = Math.max(1, Math.ceil(Number(found[0].total_rows) / SHEET_PAGE_SIZE));
  const page = Math.max(1, Math.min(requestedPage, pages));
  const rows = rowsOf(await db.execute(sql`
    SELECT r.line_number, r.source_id, r.record, r.match_status, r.contract_id,
           c.pessoa_id, c.titular_id, c.x_status AS api_status
    FROM f10_customer_sheet_rows r
    LEFT JOIN f10_customer_contracts c ON c.unit_id = ${unitId} AND c.contract_id = r.contract_id
    WHERE r.batch_id = ${batchId}::uuid
    ORDER BY CASE WHEN r.match_status = 'matched' THEN 1 ELSE 0 END, r.line_number
    LIMIT ${SHEET_PAGE_SIZE} OFFSET ${(page - 1) * SHEET_PAGE_SIZE}
  `));
  return { batches, batch: found[0], summary: summary[0], rows, page, pages };
}

export async function applyF10CustomerSheet(unitId: number, batchId: string): Promise<boolean> {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const batch = rowsOf(await tx.execute(sql`
      SELECT id, file_hash FROM f10_customer_sheet_batches
      WHERE id = ${batchId}::uuid AND unit_id = ${unitId} AND status = 'review'
      FOR UPDATE
    `));
    if (!batch.length) return false;

    // A origem pode ter mudado desde a prévia. Nunca confirmar um vínculo obsoleto.
    const changed = rowsOf(await tx.execute(sql`
      SELECT count(*)::int AS total FROM f10_customer_sheet_rows r
      WHERE r.batch_id = ${batchId}::uuid AND r.match_status = 'matched'
        AND NOT EXISTS (
          SELECT 1 FROM f10_customer_contracts c
          WHERE c.unit_id = ${unitId} AND c.contract_id = r.contract_id
            AND c.numero_contrato = r.source_id
        )
    `));
    if (Number(changed[0]?.total ?? 0) > 0) throw new Error("F10_SHEET_SOURCE_CHANGED");

    const source = sourceSystem(unitId);
    await tx.execute(sql`
      INSERT INTO customer_groups (source_system, source_group_id, name)
      SELECT ${source}, r.record ->> 'sourceGroupId',
             coalesce(nullif(min(r.record ->> 'groupName'), ''), r.record ->> 'sourceGroupId')
      FROM f10_customer_sheet_rows r
      WHERE r.batch_id = ${batchId}::uuid AND r.match_status = 'matched'
        AND nullif(r.record ->> 'sourceGroupId', '') IS NOT NULL
      GROUP BY r.record ->> 'sourceGroupId'
      ON CONFLICT (source_system, source_group_id) DO NOTHING
    `);

    // Razão social não é inferida do Aluno, Titular ou Apelido.
    await tx.execute(sql`
      INSERT INTO f10_customer_contract_profiles (
        unit_id, contract_id, apelido, group_id, customer_unit_id,
        spreadsheet_student_name, spreadsheet_holder_name, commercial_status,
        contracted_plan, city, account_executive, source_file_hash
      )
      SELECT ${unitId}, r.contract_id,
             left(nullif(r.record ->> 'apelido', ''), 240),
             g.id, u.id,
             nullif(r.record ->> 'unitName', ''),
             nullif(r.record ->> 'holderName', ''),
             nullif(r.record ->> 'commercialStatus', ''),
             nullif(r.record ->> 'plan', ''),
             nullif(r.record ->> 'city', ''),
             nullif(r.record ->> 'accountExecutive', ''),
             ${String(batch[0].file_hash)}
      FROM f10_customer_sheet_rows r
      JOIN f10_customer_contracts c ON c.unit_id = ${unitId} AND c.contract_id = r.contract_id
        AND c.numero_contrato = r.source_id
      LEFT JOIN customer_groups g ON g.source_system = ${source}
        AND g.source_group_id = r.record ->> 'sourceGroupId'
      LEFT JOIN customer_units u ON u.source_system = ${source} AND u.source_id = r.source_id
      WHERE r.batch_id = ${batchId}::uuid AND r.match_status = 'matched'
      ON CONFLICT (unit_id, contract_id) DO UPDATE SET
        apelido = excluded.apelido,
        group_id = excluded.group_id,
        customer_unit_id = coalesce(excluded.customer_unit_id,
                                    f10_customer_contract_profiles.customer_unit_id),
        spreadsheet_student_name = excluded.spreadsheet_student_name,
        spreadsheet_holder_name = excluded.spreadsheet_holder_name,
        commercial_status = excluded.commercial_status,
        contracted_plan = excluded.contracted_plan,
        city = excluded.city,
        account_executive = excluded.account_executive,
        source_file_hash = excluded.source_file_hash,
        updated_at = now()
    `);
    await tx.execute(sql`
      UPDATE f10_customer_sheet_rows SET applied_at = now()
      WHERE batch_id = ${batchId}::uuid AND match_status = 'matched'
    `);
    await tx.execute(sql`
      UPDATE f10_customer_sheet_batches SET status = 'applied', applied_at = now()
      WHERE id = ${batchId}::uuid
    `);
    return true;
  });
}

export async function getF10CustomerContractDirectory(
  unitId: number, query: string, requestedPage: number,
) {
  const db = getDatabase();
  const search = "%" + query.trim().slice(0, 120) + "%";
  const filtered = sql`
    c.unit_id = ${unitId} AND
    (${!query.trim()} OR
      c.numero_contrato ILIKE ${search} OR
      c.pessoa_id::text ILIKE ${search} OR
      coalesce(p.apelido, '') ILIKE ${search} OR
      coalesce(g.name, '') ILIKE ${search})
  `;
  const base = sql`
    FROM f10_customer_contracts c
    LEFT JOIN f10_customer_contract_profiles p
      ON p.unit_id = c.unit_id AND p.contract_id = c.contract_id
    LEFT JOIN customer_groups g ON g.id = p.group_id
  `;
  const summary = rowsOf(await db.execute(sql`
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE p.apelido IS NOT NULL)::int AS with_nickname,
           count(*) FILTER (WHERE g.id IS NOT NULL)::int AS with_group
    ${base} WHERE c.unit_id = ${unitId}
  `));
  const matches = rowsOf(await db.execute(sql`
    SELECT count(*)::int AS total ${base} WHERE ${filtered}
  `));
  const pages = Math.max(1, Math.ceil(Number(matches[0]?.total ?? 0) / PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), pages);
  const rows = rowsOf(await db.execute(sql`
    SELECT c.contract_id, c.numero_contrato, c.pessoa_id, c.titular_id,
           c.x_status, c.data_cancelamento, p.apelido, p.razao_social,
           p.spreadsheet_student_name, p.commercial_status, p.contracted_plan,
           p.city, g.name AS group_name,
           (SELECT r.customer_name
            FROM f10_customer_sync_rows r
            JOIN f10_customer_sync_batches b ON b.id = r.batch_id
            WHERE b.unit_id = c.unit_id AND r.person_id = c.pessoa_id
              AND nullif(r.customer_name, '') IS NOT NULL
            ORDER BY b.created_at DESC LIMIT 1) AS person_name
    ${base}
    WHERE ${filtered}
    ORDER BY coalesce(p.apelido, c.numero_contrato, ''), c.contract_id
    LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}
  `));
  return { summary: summary[0], rows, page, pages, matchedTotal: Number(matches[0]?.total ?? 0) };
}
