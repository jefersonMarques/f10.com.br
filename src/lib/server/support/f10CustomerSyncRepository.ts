import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { classifyF10CustomerMatch, type F10ContractOwner, type F10CustomerPerson } from "$lib/server/integrations/f10/f10CustomerSyncParsing";
import { getF10CustomerPerson, listF10CustomerContractOwners } from "$lib/server/integrations/f10/f10CustomerApi";

type DatabaseRow = Record<string, unknown>;
const PAGE_SIZE = 50;
const CHUNK_SIZE = 20;

function rowsOf(value: unknown): DatabaseRow[] {
  return value as DatabaseRow[];
}

function messageCode(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "F10_SYNC_UNEXPECTED_ERROR";
  return /^F10_[A-Z_]+$/.test(code) ? code : "F10_SYNC_UNEXPECTED_ERROR";
}

export async function queueF10CustomerSync(actorUserId: string): Promise<string> {
  const db = getDatabase();
  const created = rowsOf(await db.execute(sql`
    INSERT INTO f10_customer_sync_batches (created_by)
    VALUES (${actorUserId}::uuid)
    ON CONFLICT DO NOTHING
    RETURNING id
  `));
  if (created.length) return String(created[0].id);
  const current = rowsOf(await db.execute(sql`
    SELECT id FROM f10_customer_sync_batches
    WHERE status IN ('queued', 'scanning')
    ORDER BY created_at DESC LIMIT 1
  `));
  if (!current.length) throw new Error("F10_SYNC_QUEUE_FAILED");
  return String(current[0].id);
}

export async function getF10CustomerSyncPreview(batchId: string | null, requestedPage: number) {
  const db = getDatabase();
  const batches = rowsOf(await db.execute(sql`
    SELECT id, status, total_contracts, total_people, processed_people, last_error_code, created_at
    FROM f10_customer_sync_batches ORDER BY created_at DESC LIMIT 12
  `));
  const selectedId = batchId ?? (batches[0] ? String(batches[0].id) : null);
  if (!selectedId) return { batches, batch: null, summary: null, rows: [], page: 1, pages: 1 };

  const found = rowsOf(await db.execute(sql`
    SELECT id, status, total_contracts, skipped_contracts, total_people,
           processed_people, last_error_code, created_at, completed_at
    FROM f10_customer_sync_batches WHERE id = ${selectedId}::uuid
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
    SELECT person_id, contract_ids, active_contracts, customer_name, email, phone,
           whatsapp, result, matched_contact_id, potential_match_count, error_code
    FROM f10_customer_sync_rows
    WHERE batch_id = ${selectedId}::uuid
    ORDER BY person_id LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `));
  return { batches, batch: found[0], summary: summaryRows[0], rows, page, pages };
}

async function seedF10CustomerSync(batchId: string): Promise<void> {
  const db = getDatabase();
  const claimed = rowsOf(await db.execute(sql`
    UPDATE f10_customer_sync_batches SET status = 'scanning', started_at = now(), updated_at = now()
    WHERE id = ${batchId}::uuid AND status = 'queued'
    RETURNING id
  `));
  if (!claimed.length) return;

  try {
    const contracts = await listF10CustomerContractOwners();
    await db.transaction(async (tx) => {
      for (let index = 0; index < contracts.owners.length; index += 100) {
        const batch = contracts.owners.slice(index, index + 100);
        const entries = batch.map((owner: F10ContractOwner) => sql`(
          ${batchId}::uuid, ${owner.personId}, ${JSON.stringify(owner.contractIds)}::jsonb,
          ${owner.activeContracts}
        )`);
        await tx.execute(sql`
          INSERT INTO f10_customer_sync_rows
            (batch_id, person_id, contract_ids, active_contracts)
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

async function classifyPerson(person: F10CustomerPerson) {
  const db = getDatabase();
  const mapped = rowsOf(await db.execute(sql`
    SELECT c.id, c.name, c.email, c.phone, c.whatsapp
    FROM f10_customer_external_identities i
    JOIN customer_contacts c ON c.id = i.customer_contact_id
    WHERE i.unit_id = 1 AND i.person_id = ${person.personId}
  `));
  const existing = mapped[0] ?? null;
  const phoneDigits = person.whatsapp.replace(/\D/g, "") || person.phone.replace(/\D/g, "");

  let candidates: DatabaseRow[] = [];
  if (!existing && (person.email || phoneDigits.length >= 10)) {
    candidates = rowsOf(await db.execute(sql`
      SELECT c.id FROM customer_contacts c
      WHERE
        (${person.email} <> '' AND lower(btrim(coalesce(c.email, ''))) = ${person.email})
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

async function scanPerson(batchId: string, personId: number): Promise<void> {
  const db = getDatabase();
  try {
    const person = await getF10CustomerPerson(personId);
    const comparison = await classifyPerson(person);
    const applied = rowsOf(await db.execute(sql`
      UPDATE f10_customer_sync_rows SET
        customer_name = ${person.name}, email = ${person.email}, phone = ${person.phone},
        whatsapp = ${person.whatsapp}, result = ${comparison.result},
        matched_contact_id = ${comparison.matchedContactId}::uuid,
        potential_match_count = ${comparison.candidateCount}, checked_at = now()
      WHERE batch_id = ${batchId}::uuid AND person_id = ${personId} AND result = 'pending'
      RETURNING person_id
    `));
    if (!applied.length) return;
  } catch (cause) {
    await db.execute(sql`
      UPDATE f10_customer_sync_rows SET result = 'failed', error_code = ${messageCode(cause)},
        checked_at = now()
      WHERE batch_id = ${batchId}::uuid AND person_id = ${personId} AND result = 'pending'
    `);
  }
  await db.execute(sql`
    UPDATE f10_customer_sync_batches
    SET processed_people = processed_people + 1, updated_at = now()
    WHERE id = ${batchId}::uuid
  `);
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

export async function processF10CustomerSyncOnce(): Promise<void> {
  const db = getDatabase();
  const current = rowsOf(await db.execute(sql`
    SELECT id, status, total_people FROM f10_customer_sync_batches
    WHERE status IN ('queued','scanning')
    ORDER BY created_at LIMIT 1
  `));
  if (!current.length) return;
  const batchId = String(current[0].id);

  if (current[0].status === "queued") await seedF10CustomerSync(batchId);
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
    await Promise.all(group.map((row) => scanPerson(batchId, Number(row.person_id))));
  }
}
