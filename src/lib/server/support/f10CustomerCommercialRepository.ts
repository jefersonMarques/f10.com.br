import { sql } from "drizzle-orm";
import { isF10CustomerApiConfigured, listF10CustomerContractOwners } from "$lib/server/integrations/f10/f10CustomerApi";
import { matchSheetContractNumbers } from "$lib/server/support/f10SheetContractMatching";
import { getDatabase } from "$lib/server/db";
import type { ParsedCustomerImport } from "$lib/server/support/customerImportFile";
import { toF10CommercialRecord } from "$lib/server/support/f10CustomerCommercialFields";

type DatabaseRow = Record<string, unknown>;
const PAGE_SIZE = 20;

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
  let fresh: Awaited<ReturnType<typeof listF10CustomerContractOwners>> | null = null;
  let apiMatchSource = "not_configured";
  let apiErrorCode: string | null = null;
  if (isF10CustomerApiConfigured()) {
    try {
      fresh = await listF10CustomerContractOwners(unitId);
      apiMatchSource = "live";
    } catch (cause) {
      apiMatchSource = "unavailable";
      const code = cause instanceof Error ? cause.message : "";
      apiErrorCode = /^F10_[A-Z_]+$/.test(code) ? code : "F10_API_UNAVAILABLE";
    }
  }
  const freshMatches = fresh
    ? matchSheetContractNumbers(parsed.rows.map(({ record }) => record.sourceId), fresh.contracts)
    : null;
  return db.transaction(async (tx) => {
    const batches = rowsOf(await tx.execute(sql`
      INSERT INTO f10_customer_sheet_batches (
        unit_id, created_by, file_name, file_hash, total_rows, record_version,
        api_match_source, api_contract_count, api_error_code, api_checked_at
      )
      VALUES (
        ${unitId}, ${actorId}::uuid, ${fileName.slice(0, 180)}, ${parsed.fileHash},
        ${parsed.rows.length}, 2, ${apiMatchSource}, ${fresh?.contractsCount ?? null},
        ${apiErrorCode}, ${fresh ? new Date() : null}
      )
      RETURNING id
    `));
    const batchId = String(batches[0].id);

    const sourceIds = new Set<string>();
    for (const { record } of parsed.rows) {
      if (sourceIds.has(record.sourceId)) throw new Error("F10_SHEET_DUPLICATE_IDS");
      sourceIds.add(record.sourceId);
    }

    if (fresh && freshMatches) {
      const matchedIds = new Set(
        [...freshMatches.values()]
          .filter((value) => value.status === "matched")
          .map((value) => value.contractId),
      );
      const matchedContracts = fresh.contracts.filter(
        (contract) => matchedIds.has(contract.contractId),
      );
      // Apenas os contratos conciliados precisam ser persistidos para aplicação.
      for (let i = 0; i < matchedContracts.length; i += 100) {
        const chunk = matchedContracts.slice(i, i + 100);
        const values = chunk.map((contract) => sql`(
          ${unitId}, ${contract.contractId}, ${contract.contractNumber},
          ${contract.personId}, ${contract.holderId}, ${contract.status},
          ${contract.statusLabel}, ${contract.courseId}, ${contract.sourceId},
          ${contract.sellerId}, ${contract.telemarketingId},
          ${contract.enrollmentDate}, ${contract.completionDate},
          ${contract.cancellationDate}, ${JSON.stringify(contract.sourceRecord)}::jsonb
        )`);
        await tx.execute(sql`
          INSERT INTO f10_customer_contracts (
            unit_id, contract_id, numero_contrato, pessoa_id, titular_id, status,
            x_status, curso_id, fonte_id, vendedor_id, telemarketing_id,
            matricula, conclusao, data_cancelamento, source_record
          ) VALUES ${sql.join(values, sql`, `)}
          ON CONFLICT (unit_id, contract_id) DO UPDATE SET
            numero_contrato = excluded.numero_contrato,
            pessoa_id = excluded.pessoa_id,
            titular_id = excluded.titular_id,
            status = excluded.status,
            x_status = excluded.x_status,
            curso_id = excluded.curso_id,
            fonte_id = excluded.fonte_id,
            vendedor_id = excluded.vendedor_id,
            telemarketing_id = excluded.telemarketing_id,
            matricula = excluded.matricula,
            conclusao = excluded.conclusao,
            data_cancelamento = excluded.data_cancelamento,
            source_record = excluded.source_record,
            last_seen_at = now()
        `);
      }
    }

    for (let i = 0; i < parsed.rows.length; i += 100) {
      const items = parsed.rows.slice(i, i + 100);
      const entries = items.map(({ lineNumber, record }) => {
        const match = freshMatches?.get(record.sourceId);
        return sql`(
          ${batchId}::uuid, ${lineNumber}, ${record.sourceId},
          ${JSON.stringify(toF10CommercialRecord(record))}::jsonb,
          ${match?.status ?? "pending"}, ${match?.contractId ?? null}
        )`;
      });
      await tx.execute(sql`
        INSERT INTO f10_customer_sheet_rows (
          batch_id, line_number, source_id, record, match_status, contract_id
        ) VALUES ${sql.join(entries, sql`, `)}
      `);
    }

    if (!fresh) {
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
    }
    return batchId;
  });
}

export async function getF10CustomerSheetPage(
  unitId: number, selectedBatch: string | null,
) {
  const db = getDatabase();
  const batches = rowsOf(await db.execute(sql`
    SELECT id, status, total_rows, record_version, created_at, applied_at
    FROM f10_customer_sheet_batches
    WHERE unit_id = ${unitId}
    ORDER BY created_at DESC LIMIT 10
  `));
  const batchId = selectedBatch ?? (batches[0] ? String(batches[0].id) : null);
  if (!batchId) return { batches, batch: null, summary: null };

  const found = rowsOf(await db.execute(sql`
    SELECT id, file_name, status, total_rows, record_version, created_at, applied_at
    FROM f10_customer_sheet_batches
    WHERE id = ${batchId}::uuid AND unit_id = ${unitId}
  `));
  if (!found.length) return { batches, batch: null, summary: null, rows: [], page: 1, pages: 1 };

  const source = sourceSystem(unitId);
  const summary = rowsOf(await db.execute(sql`
    SELECT count(*) FILTER (WHERE r.match_status='matched')::int AS matched,
           count(*) FILTER (WHERE r.match_status='not_found')::int AS missing,
           count(*) FILTER (WHERE r.match_status='ambiguous')::int AS ambiguous,
           count(*) FILTER (WHERE r.applied_at IS NOT NULL)::int AS applied,
           count(*) FILTER (WHERE u.id IS NULL)::int AS create_count,
           count(*) FILTER (WHERE u.id IS NOT NULL)::int AS update_count
    FROM f10_customer_sheet_rows r
    LEFT JOIN customer_units u ON u.source_system = ${source} AND u.source_id = r.source_id
    WHERE r.batch_id = ${batchId}::uuid
  `));
  // A prévia é agregada: não enviar telefones, emails ou links financeiros ao navegador.
  return { batches, batch: found[0], summary: summary[0] };

}

export async function applyF10CustomerSheet(unitId: number, batchId: string): Promise<boolean> {
  const db = getDatabase();
  const source = sourceSystem(unitId);
  const apiSource = "f10_api:" + unitId;
  const sheetSource = "f10_sheet:" + unitId;
  return db.transaction(async (tx) => {
    // Uma importação por unidade; o lock protege também de lotes simultâneos.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${source}), hashtext('f10_sheet_import'))`);
    const batch = rowsOf(await tx.execute(sql`
      SELECT id, file_hash FROM f10_customer_sheet_batches
      WHERE id = ${batchId}::uuid AND unit_id = ${unitId} AND status = 'review'
        AND record_version = 2
      FOR UPDATE
    `));
    if (!batch.length) return false;

    const conflicts = rowsOf(await tx.execute(sql`
      SELECT count(*)::int AS total FROM f10_customer_sheet_rows r
      WHERE r.batch_id = ${batchId}::uuid
        AND r.match_status = 'matched' AND NOT EXISTS (
          SELECT 1 FROM f10_customer_contracts c
          WHERE c.unit_id = ${unitId} AND c.contract_id = r.contract_id
            AND c.numero_contrato = r.source_id
        )
    `));
    if (Number(conflicts[0]?.total ?? 0)) throw new Error("F10_SHEET_REVIEW_REQUIRED");

    // Cadastro principal: sempre considerar TODAS as linhas da planilha.
    await tx.execute(sql`
      INSERT INTO customer_groups (source_system, source_group_id, name)
      SELECT ${source}, r.record ->> 'sourceGroupId',
             coalesce(nullif(min(r.record ->> 'groupName'), ''), r.record ->> 'sourceGroupId')
      FROM f10_customer_sheet_rows r
      WHERE r.batch_id = ${batchId}::uuid
        AND nullif(r.record ->> 'sourceGroupId', '') IS NOT NULL
      GROUP BY r.record ->> 'sourceGroupId'
      ON CONFLICT (source_system, source_group_id) DO UPDATE SET name = excluded.name
    `);

    // Organização independente por unidade contratual: nunca fundir pela semelhança de nomes.
    await tx.execute(sql`
      INSERT INTO customer_organizations (name, external_reference, active)
      SELECT r.record ->> 'unitName', ${source} || ':' || r.source_id,
             r.record ->> 'commercialStatus' = 'Ativo'
      FROM f10_customer_sheet_rows r
      LEFT JOIN customer_units u ON u.source_system = ${source} AND u.source_id = r.source_id
      WHERE r.batch_id = ${batchId}::uuid AND u.id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM customer_organizations o
          WHERE o.external_reference = ${source} || ':' || r.source_id
        )
    `);

    await tx.execute(sql`
      INSERT INTO customer_units (
        organization_id, group_id, source_system, source_id, name, apelido,
        commercial_status, contracted_plan, city, account_executive,
        cancellation_reason, cancellation_date, billing_access_url,
        f10_unit_id, f10_contract_id, f10_person_id, f10_holder_id
      )
      SELECT coalesce(existing.organization_id, o.id), g.id, ${source}, r.source_id,
             coalesce(nullif(r.record ->> 'apelido', ''), r.record ->> 'unitName'),
             nullif(r.record ->> 'apelido', ''),
             r.record ->> 'commercialStatus',
             nullif(r.record ->> 'plan', ''), nullif(r.record ->> 'city', ''),
             nullif(r.record ->> 'accountExecutive', ''),
             nullif(r.record ->> 'cancellationReason', ''),
             nullif(r.record ->> 'cancellationDate', ''),
             nullif(r.record ->> 'billingUrl', ''),
             ${unitId}, c.contract_id, c.pessoa_id, c.titular_id
      FROM f10_customer_sheet_rows r
      LEFT JOIN customer_units existing
        ON existing.source_system = ${source} AND existing.source_id = r.source_id
      LEFT JOIN LATERAL (
        SELECT id FROM customer_organizations o
        WHERE o.external_reference = ${source} || ':' || r.source_id
        ORDER BY created_at, id LIMIT 1
      ) o ON true
      LEFT JOIN customer_groups g ON g.source_system = ${source}
        AND g.source_group_id = r.record ->> 'sourceGroupId'
      LEFT JOIN f10_customer_contracts c ON c.unit_id = ${unitId}
        AND c.contract_id = r.contract_id AND c.numero_contrato = r.source_id
      WHERE r.batch_id = ${batchId}::uuid
      ON CONFLICT (source_system, source_id) DO UPDATE SET
        group_id = excluded.group_id,
        name = excluded.name,
        apelido = excluded.apelido,
        commercial_status = excluded.commercial_status,
        contracted_plan = excluded.contracted_plan,
        city = excluded.city,
        account_executive = excluded.account_executive,
        cancellation_reason = excluded.cancellation_reason,
        cancellation_date = excluded.cancellation_date,
        billing_access_url = excluded.billing_access_url,
        f10_unit_id = excluded.f10_unit_id,
        f10_contract_id = coalesce(excluded.f10_contract_id, customer_units.f10_contract_id),
        f10_person_id = coalesce(excluded.f10_person_id, customer_units.f10_person_id),
        f10_holder_id = coalesce(excluded.f10_holder_id, customer_units.f10_holder_id),
        updated_at = now()
    `);

    // Um cliente da API pode possuir muitas unidades, cada uma mantendo seu contrato.
    // Para contratos ausentes na API a identidade é o ID da própria planilha.
    await tx.execute(sql`
      WITH candidate AS (
        SELECT r.source_id, r.record, r.line_number, u.organization_id,
               c.pessoa_id,
               CASE WHEN c.pessoa_id IS NOT NULL THEN ${apiSource} ELSE ${sheetSource} END AS identity_source,
               coalesce(c.pessoa_id::text, r.source_id) AS identity_id,
               row_number() OVER (
                 PARTITION BY CASE WHEN c.pessoa_id IS NOT NULL
                   THEN 'api:' || c.pessoa_id::text ELSE 'sheet:' || r.source_id END
                 ORDER BY (r.record ->> 'commercialStatus' = 'Ativo') DESC, r.line_number
               ) AS choice
        FROM f10_customer_sheet_rows r
        JOIN customer_units u ON u.source_system = ${source} AND u.source_id = r.source_id
        LEFT JOIN f10_customer_contracts c ON c.unit_id = ${unitId}
          AND c.contract_id = r.contract_id AND c.numero_contrato = r.source_id
        WHERE r.batch_id = ${batchId}::uuid
      )
      INSERT INTO customer_contacts (
        organization_id, name, email, phone, whatsapp, active, import_source, import_source_id
      )
      SELECT candidate.organization_id, candidate.record ->> 'unitName',
             nullif(candidate.record ->> 'unitEmail', ''),
             nullif(candidate.record ->> 'unitPhone', ''),
             nullif(candidate.record ->> 'unitMobile', ''),
             candidate.record ->> 'commercialStatus' = 'Ativo',
             candidate.identity_source, candidate.identity_id
      FROM candidate
      LEFT JOIN f10_customer_external_identities linked
        ON linked.unit_id = ${unitId} AND linked.person_id = candidate.pessoa_id
      WHERE candidate.choice = 1 AND linked.customer_contact_id IS NULL
      ON CONFLICT (import_source, import_source_id)
        WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL
      DO UPDATE SET
        name = excluded.name,
        email = coalesce(excluded.email, customer_contacts.email),
        phone = coalesce(excluded.phone, customer_contacts.phone),
        whatsapp = coalesce(excluded.whatsapp, customer_contacts.whatsapp),
        active = excluded.active,
        updated_at = now()
    `);

    // Se um contato já tinha vínculo explícito com a API, respeitá-lo.
    await tx.execute(sql`
      INSERT INTO f10_customer_external_identities (unit_id, person_id, customer_contact_id)
      SELECT DISTINCT ${unitId}, c.pessoa_id, imported.id
      FROM f10_customer_sheet_rows r
      JOIN f10_customer_contracts c ON c.unit_id = ${unitId}
        AND c.contract_id = r.contract_id AND c.numero_contrato = r.source_id
      JOIN customer_contacts imported ON imported.import_source = ${apiSource}
        AND imported.import_source_id = c.pessoa_id::text
      WHERE r.batch_id = ${batchId}::uuid AND c.pessoa_id IS NOT NULL
      ON CONFLICT DO NOTHING
    `);

    await tx.execute(sql`
      INSERT INTO customer_unit_contacts (
        unit_id, contact_kind, name, email, phone, mobile, commercial_phone, customer_contact_id
      )
      SELECT u.id, 'general', nullif(r.record ->> 'unitName', ''),
             nullif(r.record ->> 'unitEmail', ''),
             nullif(r.record ->> 'unitPhone', ''),
             nullif(r.record ->> 'unitMobile', ''),
             nullif(r.record ->> 'unitCommercialPhone', ''),
             coalesce(linked.customer_contact_id, imported.id)
      FROM f10_customer_sheet_rows r
      JOIN customer_units u ON u.source_system = ${source} AND u.source_id = r.source_id
      LEFT JOIN f10_customer_contracts c ON c.unit_id = ${unitId}
        AND c.contract_id = r.contract_id AND c.numero_contrato = r.source_id
      LEFT JOIN f10_customer_external_identities linked
        ON linked.unit_id = ${unitId} AND linked.person_id = c.pessoa_id
      LEFT JOIN customer_contacts imported ON
        imported.import_source = CASE WHEN c.pessoa_id IS NOT NULL
          THEN ${apiSource} ELSE ${sheetSource} END
        AND imported.import_source_id = coalesce(c.pessoa_id::text, r.source_id)
      WHERE r.batch_id = ${batchId}::uuid
      ON CONFLICT (unit_id, contact_kind) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        mobile = excluded.mobile,
        commercial_phone = excluded.commercial_phone,
        customer_contact_id = coalesce(excluded.customer_contact_id,
                                       customer_unit_contacts.customer_contact_id)
    `);

    await tx.execute(sql`
      INSERT INTO customer_unit_contacts (
        unit_id, contact_kind, name, email, phone, mobile, commercial_phone
      )
      SELECT u.id, 'holder', nullif(r.record ->> 'holderName', ''),
             nullif(r.record ->> 'holderEmail', ''),
             nullif(r.record ->> 'holderPhone', ''),
             nullif(r.record ->> 'holderMobile', ''),
             nullif(r.record ->> 'holderCommercialPhone', '')
      FROM f10_customer_sheet_rows r
      JOIN customer_units u ON u.source_system = ${source} AND u.source_id = r.source_id
      WHERE r.batch_id = ${batchId}::uuid AND (
        nullif(r.record ->> 'holderName', '') IS NOT NULL
        OR nullif(r.record ->> 'holderEmail', '') IS NOT NULL
        OR nullif(r.record ->> 'holderPhone', '') IS NOT NULL
        OR nullif(r.record ->> 'holderMobile', '') IS NOT NULL
      )
      ON CONFLICT (unit_id, contact_kind) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        phone = excluded.phone,
        mobile = excluded.mobile,
        commercial_phone = excluded.commercial_phone
    `);

    // Só associa contratos quando a API confirma número e ID sem ambiguidade.
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
      JOIN customer_units u ON u.source_system = ${source} AND u.source_id = r.source_id
      LEFT JOIN customer_groups g ON g.source_system = ${source}
        AND g.source_group_id = r.record ->> 'sourceGroupId'
      WHERE r.batch_id = ${batchId}::uuid AND r.match_status = 'matched'
      ON CONFLICT (unit_id, contract_id) DO UPDATE SET
        apelido = excluded.apelido,
        group_id = excluded.group_id,
        customer_unit_id = excluded.customer_unit_id,
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
      WHERE batch_id = ${batchId}::uuid
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
