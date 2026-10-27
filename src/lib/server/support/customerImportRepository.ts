import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  CUSTOMER_IMPORT_SOURCE,
  type CustomerImportRecord,
  type ParsedCustomerImport,
} from "$lib/server/support/customerImportFile";

type DatabaseRow = Record<string, unknown>;
type Decision = "create" | "link" | "skip" | "review";

export type ImportPreviewRow = {
  id: string;
  line_number: number;
  source_id: string;
  source_group_id: string | null;
  record: CustomerImportRecord;
  warnings: string[];
  decision: Decision;
  target_organization_id: string | null;
  applied_at: Date | null;
  error_code: string | null;
  candidate_organizations: Array<{ id: string; name: string }>;
};

function rowsOf(result: unknown): DatabaseRow[] {
  return result as DatabaseRow[];
}

function readText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readRecord(value: unknown): CustomerImportRecord {
  return value as CustomerImportRecord;
}

function warningLabels(record: CustomerImportRecord, emailCounts: Map<string, number>): string[] {
  const warnings: string[] = [];
  if (!record.holderName) warnings.push("Responsável não identificado");
  if (!record.holderEmail && !record.unitEmail) warnings.push("Sem e-mail");
  if (record.commercialStatus !== "Ativo") warnings.push("Situação: " + record.commercialStatus);
  if (!record.sourceGroupId) warnings.push("Sem grupo de origem");
  if (record.holderEmail && (emailCounts.get(record.holderEmail) ?? 0) > 1) {
    warnings.push("E-mail compartilhado na planilha");
  }
  if (record.unitEmail && (emailCounts.get(record.unitEmail) ?? 0) > 1) {
    warnings.push("E-mail da unidade compartilhado");
  }
  if (record.billingUrl && !/^https:\/\//i.test(record.billingUrl)) {
    warnings.push("Link financeiro inválido");
  }
  return warnings;
}

export async function stageCustomerImport(
  actorUserId: string,
  fileName: string,
  parsed: ParsedCustomerImport,
): Promise<string> {
  const db = getDatabase();
  const existingUnits = rowsOf(await db.execute(sql`
    SELECT source_id FROM customer_units WHERE source_system = ${CUSTOMER_IMPORT_SOURCE}
  `));
  const knownIds = new Set(existingUnits.map((row) => readText(row.source_id)));
  const organizations = rowsOf(await db.execute(sql`
    SELECT id, name FROM customer_organizations
  `));
  const organizationNames = new Set(organizations.map((row) => readText(row.name).trim().toLowerCase()));

  const emailCounts = new Map<string, number>();
  const seenSourceIds = new Set<string>();
  const importedEmails = new Set<string>();
  for (const { record } of parsed.rows) {
    const emails = new Set([record.unitEmail, record.holderEmail].filter(Boolean));
    for (const email of emails) {
      emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
      importedEmails.add(email);
    }
  }

  const existingContactEmails = new Set<string>();
  if (importedEmails.size) {
    const emails = Array.from(importedEmails);
    const match = rowsOf(await db.execute(sql`
      SELECT DISTINCT lower(email) AS email
      FROM customer_contacts
      WHERE email IS NOT NULL
        AND lower(email) IN (${sql.join(emails.map((email) => sql`${email}`), sql`, `)})
    `));
    for (const entry of match) existingContactEmails.add(readText(entry.email));
  }

  return db.transaction(async (transaction) => {
    const created = rowsOf(await transaction.execute(sql`
      INSERT INTO customer_import_batches (created_by, file_name, file_hash, total_rows)
      VALUES (${actorUserId}::uuid, ${fileName.slice(0, 180)}, ${parsed.fileHash}, ${parsed.rows.length})
      RETURNING id
    `));
    const batchId = readText(created[0]?.id);
    if (!batchId) throw new Error("Não foi possível preparar a importação.");

    for (const { lineNumber, record } of parsed.rows) {
      const warnings = warningLabels(record, emailCounts);
      if (seenSourceIds.has(record.sourceId)) warnings.push("ID repetido na planilha");
      seenSourceIds.add(record.sourceId);
      if (organizationNames.has(record.unitName.trim().toLowerCase())) {
        warnings.push("Organização com mesmo nome já cadastrada");
      }
      if (record.holderEmail && existingContactEmails.has(record.holderEmail)) {
        warnings.push("E-mail do titular já cadastrado");
      }
      if (record.unitEmail && existingContactEmails.has(record.unitEmail)) {
        warnings.push("E-mail da unidade já cadastrado");
      }

      const decision: Decision = knownIds.has(record.sourceId)
        ? "skip"
        : warnings.length ? "review" : "create";
      if (knownIds.has(record.sourceId)) warnings.push("ID de origem já importado");

      await transaction.execute(sql`
        INSERT INTO customer_import_rows
          (batch_id, line_number, source_id, source_group_id, record, warnings, decision)
        VALUES (
          ${batchId}::uuid, ${lineNumber}, ${record.sourceId}, ${record.sourceGroupId || null},
          ${JSON.stringify(record)}::jsonb, ${JSON.stringify(warnings)}::jsonb, ${decision}
        )
      `);
    }
    await transaction.execute(sql`
      INSERT INTO customer_import_events (batch_id, actor_user_id, action, metadata)
      VALUES (${batchId}::uuid, ${actorUserId}::uuid, 'staged', ${JSON.stringify({ totalRows: parsed.rows.length })}::jsonb)
    `);
    return batchId;
  });
}

export async function getCustomerImportPage(batchId: string | null, page: number) {
  const db = getDatabase();
  const batches = rowsOf(await db.execute(sql`
    SELECT id, file_name, status, total_rows, created_at, confirmed_at, completed_at
    FROM customer_import_batches ORDER BY created_at DESC LIMIT 12
  `));
  const selectedId = batchId ?? readText(batches[0]?.id);
  const chosenBatch = batches.find((batch) => batch.id === selectedId);
  if (!chosenBatch) return { batches, batch: null, rows: [], summary: null, page: 1, pageCount: 1 };

  const summaryRows = rowsOf(await db.execute(sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE decision = 'review')::int AS review,
      count(*) FILTER (WHERE decision = 'create')::int AS create_count,
      count(*) FILTER (WHERE decision = 'link')::int AS link_count,
      count(*) FILTER (WHERE decision = 'skip')::int AS skip_count,
      count(*) FILTER (WHERE applied_at IS NOT NULL)::int AS processed,
      count(*) FILTER (WHERE error_code IS NOT NULL)::int AS failed
    FROM customer_import_rows WHERE batch_id = ${selectedId}::uuid
  `));
  const pageSize = 40;
  const total = Number(summaryRows[0]?.total ?? 0);
  const safePage = Math.max(1, Math.min(Math.ceil(total / pageSize), page));
  const preview = rowsOf(await db.execute(sql`
    SELECT id, line_number, source_id, source_group_id, record, warnings,
           decision, target_organization_id, applied_at, error_code
    FROM customer_import_rows
    WHERE batch_id = ${selectedId}::uuid
    ORDER BY line_number
    LIMIT ${pageSize} OFFSET ${(safePage - 1) * pageSize}
  `));

  const candidates = rowsOf(await db.execute(sql`
    SELECT r.id AS row_id, o.id, o.name
    FROM customer_import_rows r
    JOIN customer_organizations o ON lower(trim(o.name)) = lower(trim(r.record ->> 'unitName'))
    WHERE r.batch_id = ${selectedId}::uuid
      AND r.line_number BETWEEN ${(safePage - 1) * pageSize + 1} AND ${safePage * pageSize + 10}
    ORDER BY o.name LIMIT 100
  `));
  const byRow = new Map<string, Array<{ id: string; name: string }>>();
  for (const candidate of candidates) {
    const key = readText(candidate.row_id);
    const current = byRow.get(key) ?? [];
    current.push({ id: readText(candidate.id), name: readText(candidate.name) });
    byRow.set(key, current);
  }

  const rows: ImportPreviewRow[] = preview.map((row) => ({
    id: readText(row.id),
    line_number: Number(row.line_number),
    source_id: readText(row.source_id),
    source_group_id: row.source_group_id as string | null,
    record: { ...readRecord(row.record), billingUrl: "" },
    warnings: (row.warnings as string[]) ?? [],
    decision: row.decision as Decision,
    target_organization_id: row.target_organization_id as string | null,
    applied_at: row.applied_at as Date | null,
    error_code: row.error_code as string | null,
    candidate_organizations: byRow.get(readText(row.id)) ?? [],
  }));

  return {
    batches,
    batch: chosenBatch,
    rows,
    summary: summaryRows[0],
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function resolveCustomerImportRow(
  actorUserId: string,
  batchId: string,
  rowId: string,
  decision: Decision,
  targetOrganizationId: string | null,
): Promise<void> {
  if (!["create", "link", "skip"].includes(decision)) throw new Error("DECISION_INVALID");
  const db = getDatabase();
  if (decision === "link") {
    if (!targetOrganizationId) throw new Error("ORGANIZATION_REQUIRED");
    const matches = rowsOf(await db.execute(sql`
      SELECT id FROM customer_organizations WHERE id = ${targetOrganizationId}::uuid
    `));
    if (!matches.length) throw new Error("ORGANIZATION_NOT_FOUND");
  }
  const updated = rowsOf(await db.execute(sql`
    UPDATE customer_import_rows AS row
    SET decision = ${decision}, target_organization_id = ${decision === "link" ? targetOrganizationId : null}::uuid,
        error_code = NULL
    FROM customer_import_batches AS batch
    WHERE row.batch_id = batch.id
      AND batch.id = ${batchId}::uuid
      AND row.id = ${rowId}::uuid
      AND batch.status = 'review' AND batch.confirmed_at IS NULL
    RETURNING row.id
  `));
  if (!updated.length) throw new Error("ROW_NOT_EDITABLE");
  await db.execute(sql`
    INSERT INTO customer_import_events (batch_id, row_id, actor_user_id, action, metadata)
    VALUES (${batchId}::uuid, ${rowId}::uuid, ${actorUserId}::uuid, 'resolved',
            ${JSON.stringify({ decision, targetOrganizationId: decision === "link" ? targetOrganizationId : null })}::jsonb)
  `);
}

export async function confirmCustomerImport(actorUserId: string, batchId: string): Promise<boolean> {
  const db = getDatabase();
  return db.transaction(async (transaction) => {
    const result = rowsOf(await transaction.execute(sql`
      UPDATE customer_import_batches AS batch
      SET status = 'running', confirmed_at = now()
      WHERE batch.id = ${batchId}::uuid AND batch.status = 'review'
        AND NOT EXISTS (
          SELECT 1 FROM customer_import_rows AS row
          WHERE row.batch_id = batch.id AND row.decision = 'review'
        )
      RETURNING batch.id
    `));
    if (!result.length) return false;
    await transaction.execute(sql`
      INSERT INTO customer_import_events (batch_id, actor_user_id, action)
      VALUES (${batchId}::uuid, ${actorUserId}::uuid, 'confirmed')
    `);
    return true;
  });
}

async function applyCustomerImportRow(
  transaction: Parameters<Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]>[0],
  batchId: string,
  row: DatabaseRow,
): Promise<void> {
  const sourceId = readText(row.source_id);
  const record = readRecord(row.record);
  const rowId = readText(row.id);
  const decision = readText(row.decision);
  if (decision === "skip") {
    await transaction.execute(sql`
      UPDATE customer_import_rows SET applied_at = now() WHERE id = ${rowId}::uuid
    `);
    return;
  }

  await transaction.execute(sql`
    SELECT pg_advisory_xact_lock(hashtext(${CUSTOMER_IMPORT_SOURCE}), hashtext(${sourceId}))
  `);
  const alreadyImported = rowsOf(await transaction.execute(sql`
    SELECT id FROM customer_units
    WHERE source_system = ${CUSTOMER_IMPORT_SOURCE} AND source_id = ${sourceId}
  `));
  if (alreadyImported.length) {
    await transaction.execute(sql`
      UPDATE customer_import_rows SET applied_at = now() WHERE id = ${rowId}::uuid
    `);
    return;
  }

  let groupId: string | null = null;
  if (record.sourceGroupId) {
    await transaction.execute(sql`
      INSERT INTO customer_groups (source_system, source_group_id, name)
      VALUES (${CUSTOMER_IMPORT_SOURCE}, ${record.sourceGroupId}, ${record.groupName || record.sourceGroupId})
      ON CONFLICT (source_system, source_group_id) DO NOTHING
    `);
    const groups = rowsOf(await transaction.execute(sql`
      SELECT id FROM customer_groups
      WHERE source_system = ${CUSTOMER_IMPORT_SOURCE} AND source_group_id = ${record.sourceGroupId}
    `));
    groupId = readText(groups[0]?.id);
  }

  let organizationId = row.target_organization_id as string | null;
  if (decision === "create") {
    const created = rowsOf(await transaction.execute(sql`
      INSERT INTO customer_organizations (name, external_reference, active)
      VALUES (${record.unitName}, ${CUSTOMER_IMPORT_SOURCE + ":" + sourceId},
              ${record.commercialStatus === "Ativo"})
      RETURNING id
    `));
    organizationId = readText(created[0]?.id);
  }
  if (!organizationId) throw new Error("ORGANIZATION_REQUIRED");

  const units = rowsOf(await transaction.execute(sql`
    INSERT INTO customer_units (
      organization_id, group_id, source_system, source_id, name, commercial_status,
      contracted_plan, city, account_executive, cancellation_reason, cancellation_date, billing_access_url
    ) VALUES (
      ${organizationId}::uuid, ${groupId}::uuid, ${CUSTOMER_IMPORT_SOURCE}, ${sourceId},
      ${record.unitName}, ${record.commercialStatus}, ${record.plan || null},
      ${record.city || null}, ${record.accountExecutive || null}, ${record.cancellationReason || null},
      ${record.cancellationDate || null},
      ${/^https:\/\//i.test(record.billingUrl) ? record.billingUrl : null}
    )
    ON CONFLICT (source_system, source_id) DO NOTHING
    RETURNING id
  `));
  const unitId = readText(units[0]?.id);
  if (!unitId) throw new Error("UNIT_CONFLICT");

  if (record.unitEmail || record.unitPhone || record.unitMobile || record.unitCommercialPhone) {
    await transaction.execute(sql`
      INSERT INTO customer_unit_contacts (unit_id, contact_kind, email, phone, mobile, commercial_phone)
      VALUES (${unitId}::uuid, 'general', ${record.unitEmail || null},
              ${record.unitPhone || null}, ${record.unitMobile || null}, ${record.unitCommercialPhone || null})
    `);
  }
  if (record.holderName || record.holderEmail || record.holderPhone || record.holderMobile || record.holderCommercialPhone) {
    await transaction.execute(sql`
      INSERT INTO customer_unit_contacts (unit_id, contact_kind, name, email, phone, mobile, commercial_phone)
      VALUES (${unitId}::uuid, 'holder', ${record.holderName || null}, ${record.holderEmail || null},
              ${record.holderPhone || null}, ${record.holderMobile || null}, ${record.holderCommercialPhone || null})
    `);
  }
  await transaction.execute(sql`
    UPDATE customer_import_rows SET applied_at = now(), error_code = NULL WHERE id = ${rowId}::uuid
  `);
  await transaction.execute(sql`
    INSERT INTO customer_import_events (batch_id, row_id, action, metadata)
    VALUES (${batchId}::uuid, ${rowId}::uuid, ${decision === "link" ? "linked" : "created"},
            ${JSON.stringify({ sourceId, organizationId })}::jsonb)
  `);
}

export async function listRunningCustomerImportBatches(): Promise<string[]> {
  const result = await getDatabase().execute(sql`
    SELECT id FROM customer_import_batches
    WHERE status = 'running' AND confirmed_at IS NOT NULL
    ORDER BY confirmed_at LIMIT 3
  `);
  return rowsOf(result).map((row) => readText(row.id));
}

export async function retryCustomerImportRow(
  actorUserId: string,
  batchId: string,
  rowId: string,
): Promise<boolean> {
  const db = getDatabase();
  return db.transaction(async (transaction) => {
    const rows = rowsOf(await transaction.execute(sql`
      UPDATE customer_import_rows AS row
      SET error_code = NULL
      FROM customer_import_batches AS batch
      WHERE row.batch_id = batch.id AND row.id = ${rowId}::uuid
        AND batch.id = ${batchId}::uuid AND batch.confirmed_at IS NOT NULL
        AND row.applied_at IS NULL AND row.error_code IS NOT NULL
      RETURNING row.id
    `));
    if (!rows.length) return false;
    await transaction.execute(sql`
      UPDATE customer_import_batches SET status = 'running', completed_at = NULL
      WHERE id = ${batchId}::uuid
    `);
    await transaction.execute(sql`
      INSERT INTO customer_import_events (batch_id, row_id, actor_user_id, action)
      VALUES (${batchId}::uuid, ${rowId}::uuid, ${actorUserId}::uuid, 'retry')
    `);
    return true;
  });
}

export async function processCustomerImportBatch(batchId: string, actorUserId: string | null): Promise<number> {
  const db = getDatabase();
  let processed = 0;

  for (let index = 0; index < 25; index += 1) {
    let failedRowId: string | null = null;
    try {
      const performed = await db.transaction(async (transaction) => {
        const available = rowsOf(await transaction.execute(sql`
          SELECT row.id, row.source_id, row.record, row.decision, row.target_organization_id
          FROM customer_import_rows AS row
          JOIN customer_import_batches AS batch ON batch.id = row.batch_id
          WHERE row.batch_id = ${batchId}::uuid AND batch.status = 'running'
            AND batch.confirmed_at IS NOT NULL AND row.applied_at IS NULL
            AND row.error_code IS NULL AND row.decision <> 'review'
          ORDER BY row.line_number
          LIMIT 1 FOR UPDATE OF row SKIP LOCKED
        `));
        const row = available[0];
        if (!row) return false;
        failedRowId = readText(row.id);
        await applyCustomerImportRow(transaction, batchId, row);
        return true;
      });
      if (!performed) break;
      processed += 1;
    } catch {
      if (!failedRowId) throw new Error("IMPORT_BATCH_UNAVAILABLE");
      await db.execute(sql`
        UPDATE customer_import_rows
        SET error_code = 'ROW_FAILED'
        WHERE id = ${failedRowId}::uuid AND applied_at IS NULL
      `);
      await db.execute(sql`
        INSERT INTO customer_import_events (batch_id, row_id, action)
        VALUES (${batchId}::uuid, ${failedRowId}::uuid, 'failed')
      `);
    }
  }

  await db.execute(sql`
    UPDATE customer_import_batches AS batch
    SET status = CASE WHEN EXISTS (
      SELECT 1 FROM customer_import_rows AS row
      WHERE row.batch_id = batch.id AND row.error_code IS NOT NULL
    ) THEN 'failed' ELSE 'completed' END,
    completed_at = now()
    WHERE batch.id = ${batchId}::uuid AND batch.status = 'running'
      AND NOT EXISTS (
        SELECT 1 FROM customer_import_rows AS row
        WHERE row.batch_id = batch.id
          AND row.applied_at IS NULL AND row.error_code IS NULL
      )
  `);
  if (processed) {
    await db.execute(sql`
      INSERT INTO customer_import_events (batch_id, actor_user_id, action, metadata)
      VALUES (${batchId}::uuid, ${actorUserId}::uuid, 'processed',
              ${JSON.stringify({ processed })}::jsonb)
    `);
  }
  return processed;
}

export async function getCustomerImportReport(batchId: string) {
  const result = await getDatabase().execute(sql`
    SELECT line_number, source_id, source_group_id,
           record ->> 'unitName' AS unit_name,
           record ->> 'groupName' AS group_name,
           record ->> 'holderName' AS holder_name,
           record ->> 'commercialStatus' AS commercial_status,
           record ->> 'plan' AS plan,
           decision, warnings, error_code, applied_at
    FROM customer_import_rows
    WHERE batch_id = ${batchId}::uuid
    ORDER BY line_number
  `);
  return rowsOf(result).map((row) => ({
    lineNumber: Number(row.line_number),
    sourceId: readText(row.source_id),
    sourceGroupId: readText(row.source_group_id),
    unitName: readText(row.unit_name),
    groupName: readText(row.group_name),
    holderName: readText(row.holder_name),
    commercialStatus: readText(row.commercial_status),
    plan: readText(row.plan),
    decision: readText(row.decision),
    warnings: ((row.warnings as string[]) ?? []).join("; "),
    errorCode: readText(row.error_code),
    applied: Boolean(row.applied_at),
  }));
}

export async function listImportedCustomerUnits(query: string, limit = 100) {
  const db = getDatabase();
  return rowsOf(await db.execute(sql`
    SELECT u.id, u.name, u.source_id, u.commercial_status, u.contracted_plan,
           u.city, g.name AS group_name, o.id AS organization_id,
           (SELECT c.name FROM customer_unit_contacts c
            WHERE c.unit_id = u.id AND c.contact_kind = 'holder' LIMIT 1) AS holder_name
    FROM customer_units u
    JOIN customer_organizations o ON o.id = u.organization_id
    LEFT JOIN customer_groups g ON g.id = u.group_id
    WHERE ${!query.trim()} OR u.name ILIKE ${"%" + query.trim() + "%"}
       OR g.name ILIKE ${"%" + query.trim() + "%"}
    ORDER BY u.name LIMIT ${Math.min(100, Math.max(10, limit))}
  `));
}
