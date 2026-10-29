import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { classifyF10CustomerMatch, type F10ContractOwner, type F10CustomerPerson } from "$lib/server/integrations/f10/f10CustomerSyncParsing";
import { getF10CustomerPerson, listF10CustomerContractOwners } from "$lib/server/integrations/f10/f10CustomerApi";

type DatabaseRow = Record<string, unknown>;
const PAGE_SIZE = 20;
const CHUNK_SIZE = 20;

function rowsOf(value: unknown): DatabaseRow[] {
  return value as DatabaseRow[];
}

function messageCode(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "F10_SYNC_UNEXPECTED_ERROR";
  return /^F10_[A-Z_]+$/.test(code) ? code : "F10_SYNC_UNEXPECTED_ERROR";
}

export async function queueF10CustomerSync(actorUserId: string, unitId: number): Promise<string> {
  const db = getDatabase();
  // As prévias contêm dados pessoais mínimos e expiram após 30 dias.
  await db.execute(sql`
    DELETE FROM f10_customer_sync_batches
    WHERE status IN ('review', 'failed') AND created_at < now() - interval '30 days'
  `);
  const created = rowsOf(await db.execute(sql`
    INSERT INTO f10_customer_sync_batches (created_by, unit_id)
    VALUES (${actorUserId}::uuid, ${unitId})
    ON CONFLICT DO NOTHING
    RETURNING id
  `));
  if (created.length) return String(created[0].id);
  const current = rowsOf(await db.execute(sql`
    SELECT id FROM f10_customer_sync_batches
    WHERE unit_id = ${unitId} AND status IN ('queued', 'scanning')
    ORDER BY created_at DESC LIMIT 1
  `));
  if (!current.length) throw new Error("F10_SYNC_QUEUE_FAILED");
  return String(current[0].id);
}

export async function getF10CustomerSyncState(unitId: number) {
  const rows = rowsOf(await getDatabase().execute(sql`
    SELECT id, status, last_error_code, created_at, processed_people, total_people
    FROM f10_customer_sync_batches WHERE unit_id = ${unitId}
    ORDER BY created_at DESC LIMIT 1
  `));
  return { batch: rows[0] ?? null };
}

export async function getF10CustomerSyncPreview(batchId: string | null, requestedPage: number, unitId: number) {
  const db = getDatabase();
  const batches = rowsOf(await db.execute(sql`
    SELECT id, unit_id, status, total_contracts, total_people, processed_people, last_error_code, created_at
    FROM f10_customer_sync_batches WHERE unit_id = ${unitId} ORDER BY created_at DESC LIMIT 12
  `));
  const selectedId = batchId ?? (batches[0] ? String(batches[0].id) : null);
  if (!selectedId) return { batches, batch: null, summary: null, rows: [], page: 1, pages: 1 };

  const found = rowsOf(await db.execute(sql`
    SELECT id, unit_id, status, total_contracts, skipped_contracts, total_people,
           processed_people, last_error_code, created_at, completed_at
    FROM f10_customer_sync_batches WHERE id = ${selectedId}::uuid AND unit_id = ${unitId}
  `));
  if (!found.length) return { batches, batch: null, summary: null, rows: [], page: 1, pages: 1 };

  const summaryRows = rowsOf(await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE result = 'create')::int AS create_count,
      count(*) FILTER (WHERE result = 'update')::int AS update_count,
      count(*) FILTER (WHERE result = 'unchanged')::int AS unchanged_count,
      count(*) FILTER (WHERE result = 'possible_match')::int AS review_count,
      count(*) FILTER (WHERE result = 'failed')::int AS failed_count,
      count(*) FILTER (WHERE result = 'pending')::int AS pending_count
    FROM f10_customer_sync_rows WHERE batch_id = ${selectedId}::uuid
  `));
  const total = Number(found[0].total_people ?? 0);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(requestedPage, 1), pages);
  const offset = (page - 1) * PAGE_SIZE;

  const rows = rowsOf(await db.execute(sql`
    SELECT person_id, contract_ids, contract_numbers, active_contracts, customer_name, email, phone,
           whatsapp, result, matched_contact_id, potential_match_count, error_code
    FROM f10_customer_sync_rows
    WHERE batch_id = ${selectedId}::uuid
    ORDER BY person_id LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `));
  return { batches, batch: found[0], summary: summaryRows[0], rows, page, pages };
}

async function seedF10CustomerSync(batchId: string, unitId: number): Promise<void> {
  const db = getDatabase();
  const claimed = rowsOf(await db.execute(sql`
    UPDATE f10_customer_sync_batches SET status = 'scanning', started_at = now(), updated_at = now()
    WHERE id = ${batchId}::uuid AND status = 'queued'
    RETURNING id
  `));
  if (!claimed.length) return;

  try {
    const contracts = await listF10CustomerContractOwners(unitId);
    await db.transaction(async (tx) => {
      // Contratos e prévia entram juntos; uma falha não deixa um lote parcial.
      for (let index = 0; index < contracts.contracts.length; index += 100) {
        const batch = contracts.contracts.slice(index, index + 100);
        const entries = batch.map((contract) => sql`(
          ${unitId}, ${contract.contractId}, ${contract.contractNumber},
          ${contract.personId}, ${contract.holderId}, ${contract.status}, ${contract.statusLabel},
          ${contract.courseId}, ${contract.sourceId}, ${contract.sellerId}, ${contract.telemarketingId},
          ${contract.enrollmentDate}, ${contract.completionDate}, ${contract.cancellationDate},
          ${JSON.stringify(contract.sourceRecord)}::jsonb, ${batchId}::uuid
        )`);
        await tx.execute(sql`
          INSERT INTO f10_customer_contracts (
            unit_id, contract_id, numero_contrato, pessoa_id, titular_id, status, x_status,
            curso_id, fonte_id, vendedor_id, telemarketing_id, matricula, conclusao,
            data_cancelamento, source_record, last_batch_id
          ) VALUES ${sql.join(entries, sql`, `)}
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
            last_batch_id = excluded.last_batch_id,
            last_seen_at = now()
        `);
      }
      // A planilha pode ter sido importada antes desta consulta: enriquecer vínculos depois.
      // Só usar número comercial que seja único na unidade da API.
      const sheetSource = unitId === 1 ? "f10_sheet" : "f10_sheet_unit_" + unitId;
      await tx.execute(sql`
        WITH unique_contract AS (
          SELECT numero_contrato, min(contract_id) AS contract_id
          FROM f10_customer_contracts
          WHERE unit_id = ${unitId} AND numero_contrato IS NOT NULL
          GROUP BY numero_contrato HAVING count(*) = 1
        )
        UPDATE customer_units u
        SET f10_unit_id = ${unitId},
            f10_contract_id = c.contract_id,
            f10_person_id = c.pessoa_id,
            f10_holder_id = c.titular_id,
            updated_at = now()
        FROM unique_contract link
        JOIN f10_customer_contracts c ON c.unit_id = ${unitId}
          AND c.contract_id = link.contract_id
        WHERE u.source_system = ${sheetSource} AND u.source_id = link.numero_contrato
          AND (u.f10_contract_id IS DISTINCT FROM c.contract_id
            OR u.f10_person_id IS DISTINCT FROM c.pessoa_id
            OR u.f10_holder_id IS DISTINCT FROM c.titular_id)
      `);
      await tx.execute(sql`
        WITH unique_contract AS (
          SELECT numero_contrato, min(contract_id) AS contract_id
          FROM f10_customer_contracts
          WHERE unit_id = ${unitId} AND numero_contrato IS NOT NULL
          GROUP BY numero_contrato HAVING count(*) = 1
        )
        INSERT INTO f10_customer_contract_profiles (
          unit_id, contract_id, apelido, group_id, customer_unit_id,
          spreadsheet_student_name, commercial_status, contracted_plan,
          city, account_executive
        )
        SELECT ${unitId}, c.contract_id, u.apelido, u.group_id, u.id,
               o.name, u.commercial_status, u.contracted_plan,
               u.city, u.account_executive
        FROM customer_units u
        JOIN unique_contract link ON link.numero_contrato = u.source_id
        JOIN f10_customer_contracts c ON c.unit_id = ${unitId}
          AND c.contract_id = link.contract_id
        JOIN customer_organizations o ON o.id = u.organization_id
        WHERE u.source_system = ${sheetSource}
        ON CONFLICT (unit_id, contract_id) DO UPDATE SET
          apelido = excluded.apelido,
          group_id = excluded.group_id,
          customer_unit_id = excluded.customer_unit_id,
          spreadsheet_student_name = excluded.spreadsheet_student_name,
          commercial_status = excluded.commercial_status,
          contracted_plan = excluded.contracted_plan,
          city = excluded.city,
          account_executive = excluded.account_executive,
          updated_at = now()
      `);
      for (let index = 0; index < contracts.owners.length; index += 100) {
        const batch = contracts.owners.slice(index, index + 100);
        const entries = batch.map((owner: F10ContractOwner) => sql`(
          ${batchId}::uuid, ${owner.personId}, ${JSON.stringify(owner.contractIds)}::jsonb,
          ${JSON.stringify(owner.contractNumbers)}::jsonb, ${owner.activeContracts}
        )`);
        await tx.execute(sql`
          INSERT INTO f10_customer_sync_rows
            (batch_id, person_id, contract_ids, contract_numbers, active_contracts)
          VALUES ${sql.join(entries, sql`, `)}
          ON CONFLICT (batch_id, person_id) DO NOTHING
        `);
      }
      await tx.execute(sql`
        UPDATE f10_customer_sync_batches
        SET total_contracts = ${contracts.contractsCount},
            skipped_contracts = ${contracts.skippedContracts},
            total_people = ${contracts.owners.length}, updated_at = now()
        WHERE id = ${batchId}::uuid
      `);
    });
  } catch (cause) {
    await db.execute(sql`
      UPDATE f10_customer_sync_batches
      SET status = 'failed', last_error_code = ${messageCode(cause)}, updated_at = now(),
          completed_at = now()
      WHERE id = ${batchId}::uuid
    `);
  }
}

async function classifyPerson(unitId: number, person: F10CustomerPerson) {
  const db = getDatabase();
  const mapped = rowsOf(await db.execute(sql`
    SELECT c.id, c.name, c.email, c.phone, c.whatsapp
    FROM f10_customer_external_identities i
    JOIN customer_contacts c ON c.id = i.customer_contact_id
    WHERE i.unit_id = ${unitId} AND i.person_id = ${person.personId}
  `));
  const existing = mapped[0] ?? null;
  const phoneDigits = person.whatsapp.replace(/\D/g, "") || person.phone.replace(/\D/g, "");

  let candidates: DatabaseRow[] = [];
  if (!existing && (person.email || phoneDigits.length >= 10)) {
    candidates = rowsOf(await db.execute(sql`
      SELECT c.id FROM customer_contacts c
      WHERE
        (${person.email} <> '' AND lower(btrim(coalesce(c.email, ''))) = ${person.email})
        OR (lower(btrim(c.name)) = ${person.name.toLowerCase()})
        OR (${phoneDigits.length >= 10} AND (
          regexp_replace(coalesce(c.whatsapp, ''), '[^0-9]', '', 'g') = ${phoneDigits}
          OR regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = ${phoneDigits}
        ))
      LIMIT 6
    `));
  }

  const result = classifyF10CustomerMatch({
    mappedContact: existing ? {
      id: String(existing.id),
      name: String(existing.name ?? ""),
      email: existing.email as string | null,
      phone: existing.phone as string | null,
      whatsapp: existing.whatsapp as string | null,
    } : null,
    candidates: candidates.map((candidate) => ({ id: String(candidate.id) })),
    person,
  });
  return { result, matchedContactId: existing ? String(existing.id) : null, candidateCount: candidates.length };
}

async function scanPerson(batchId: string, unitId: number, personId: number): Promise<"ok" | "fatal"> {
  const db = getDatabase();
  try {
    const person = await getF10CustomerPerson(unitId, personId);
    const comparison = await classifyPerson(unitId, person);
    const applied = rowsOf(await db.execute(sql`
      UPDATE f10_customer_sync_rows SET
        customer_name = ${person.name}, email = ${person.email}, phone = ${person.phone},
        whatsapp = ${person.whatsapp}, result = ${comparison.result},
        matched_contact_id = ${comparison.matchedContactId}::uuid,
        potential_match_count = ${comparison.candidateCount}, checked_at = now()
      WHERE batch_id = ${batchId}::uuid AND person_id = ${personId} AND result = 'pending'
      RETURNING person_id
    `));
    if (!applied.length) return "ok";
  } catch (cause) {
    const code = messageCode(cause);
    if (["F10_API_UNAUTHORIZED", "F10_API_NOT_CONFIGURED", "F10_API_RATE_LIMITED"].includes(code)) {
      await db.execute(sql`
        UPDATE f10_customer_sync_batches SET status = 'failed',
          last_error_code = ${code}, completed_at = now(), updated_at = now()
        WHERE id = ${batchId}::uuid AND status = 'scanning'
      `);
      return "fatal";
    }
    const failed = rowsOf(await db.execute(sql`
      UPDATE f10_customer_sync_rows SET result = 'failed', error_code = ${code},
        checked_at = now()
      WHERE batch_id = ${batchId}::uuid AND person_id = ${personId} AND result = 'pending'
      RETURNING person_id
    `));
    if (!failed.length) return "ok";
  }
  await db.execute(sql`
    UPDATE f10_customer_sync_batches
    SET processed_people = processed_people + 1, updated_at = now()
    WHERE id = ${batchId}::uuid
  `);
  return "ok";
}
async function completeF10CustomerSync(batchId: string): Promise<void> {
  const db = getDatabase();
  await db.transaction(async (tx) => {
    // Um e-mail compartilhado entre pessoas da origem nunca autoriza criação automática.
    await tx.execute(sql`
      UPDATE f10_customer_sync_rows r
      SET result = 'possible_match'
      WHERE r.batch_id = ${batchId}::uuid AND r.result = 'create' AND r.email <> ''
      AND EXISTS (
        SELECT 1 FROM f10_customer_sync_rows other
        WHERE other.batch_id = r.batch_id AND other.person_id <> r.person_id
          AND other.email = r.email AND other.result IN ('create', 'possible_match')
      )
    `);
    await tx.execute(sql`
      UPDATE f10_customer_sync_batches SET status = 'review',
        completed_at = now(), updated_at = now()
      WHERE id = ${batchId}::uuid AND status = 'scanning'
    `);
  });
}

export async function processF10CustomerSyncOnce(unitId?: number): Promise<void> {
  const db = getDatabase();
  const current = rowsOf(await db.execute(sql`
    SELECT id, unit_id, status, total_people FROM f10_customer_sync_batches
    WHERE (${unitId ?? null}::integer IS NULL OR unit_id = ${unitId ?? null})
      AND status IN ('queued','scanning')
    ORDER BY created_at LIMIT 1
  `));
  if (!current.length) return;
  const batchId = String(current[0].id);
  const sourceUnitId = Number(current[0].unit_id);

  if (current[0].status === "queued") await seedF10CustomerSync(batchId, sourceUnitId);
  const batch = rowsOf(await db.execute(sql`
    SELECT status, total_people, started_at, updated_at FROM f10_customer_sync_batches WHERE id = ${batchId}::uuid
  `));
  if (batch[0]?.status !== "scanning") return;

  // Uma interrupção durante a leitura inicial é recuperada na próxima execução.
  if (Number(batch[0]?.total_people ?? 0) === 0) {
    const lastUpdate = new Date(String(batch[0]?.updated_at ?? "")).getTime();
    if (Date.now() - lastUpdate > 90_000) {
      await db.execute(sql`
        UPDATE f10_customer_sync_batches SET status = 'queued', updated_at = now()
        WHERE id = ${batchId}::uuid AND status = 'scanning' AND total_people = 0
      `);
    }
    return;
  }

  const pending = rowsOf(await db.execute(sql`
    SELECT person_id FROM f10_customer_sync_rows WHERE batch_id = ${batchId}::uuid
      AND result = 'pending' ORDER BY person_id LIMIT ${CHUNK_SIZE}
  `));
  if (!pending.length) {
    await completeF10CustomerSync(batchId);
    return;
  }
  for (let offset = 0; offset < pending.length; offset += 4) {
    const group = pending.slice(offset, offset + 4);
    const outcomes = await Promise.all(group.map((row) => scanPerson(batchId, sourceUnitId, Number(row.person_id))));
    if (outcomes.includes("fatal")) return;
  }
}
