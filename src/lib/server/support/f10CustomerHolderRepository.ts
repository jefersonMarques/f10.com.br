import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  getConfiguredF10UnitId,
  getF10ContractHolder,
  isF10CustomerApiConfigured,
} from "$lib/server/integrations/f10/f10CustomerApi";
import type { F10ContractHolder } from "$lib/server/integrations/f10/f10CustomerSyncParsing";

type DatabaseRow = Record<string, unknown>;

const BATCH_SIZE = 4;
const SEED_INTERVAL_MS = 60_000;
const RATE_LIMIT_BACKOFF_MS = 5 * 60_000;
const AUTH_BACKOFF_MS = 60 * 60_000;

let lastSeedAt = 0;
let suspendedUntil = 0;

function rowsOf(value: unknown): DatabaseRow[] {
  return value as DatabaseRow[];
}

async function saveHolder(unitId: number, holder: F10ContractHolder): Promise<void> {
  await getDatabase().execute(sql`
    INSERT INTO f10_customer_holder_profiles (
      unit_id, holder_id, name, email, phone, mobile, document,
      postal_code, street, neighborhood, city, state, address_complement,
      status, error_code, next_attempt_at, synced_at
    ) VALUES (
      ${unitId}, ${holder.personId}, ${holder.name},
      ${holder.email}, ${holder.phone}, ${holder.whatsapp},
      ${holder.document}, ${holder.postalCode}, ${holder.street},
      ${holder.neighborhood}, ${holder.city}, ${holder.state},
      ${holder.addressComplement}, 'synced', NULL,
      now() + interval '30 days', now()
    )
    ON CONFLICT (unit_id, holder_id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      phone = excluded.phone,
      mobile = excluded.mobile,
      document = excluded.document,
      postal_code = excluded.postal_code,
      street = excluded.street,
      neighborhood = excluded.neighborhood,
      city = excluded.city,
      state = excluded.state,
      address_complement = excluded.address_complement,
      status = 'synced',
      error_code = NULL,
      next_attempt_at = excluded.next_attempt_at,
      synced_at = now()
  `);
}

export async function refreshF10ContractHolder(
  unitId: number,
  contractId: number,
): Promise<void> {
  const rows = rowsOf(await getDatabase().execute(sql`
    SELECT titular_id::text AS holder_id
    FROM f10_customer_contracts
    WHERE unit_id = ${unitId} AND contract_id = ${contractId}
    LIMIT 1
  `));
  if (!rows.length) throw new Error("F10_CONTRACT_NOT_FOUND");
  const holderId = Number(rows[0].holder_id);
  if (!Number.isSafeInteger(holderId) || holderId < 1) {
    throw new Error("F10_CONTRACT_HOLDER_UNAVAILABLE");
  }
  const holder = await getF10ContractHolder(unitId, holderId);
  await saveHolder(unitId, holder);
}

async function seedMissingHolders(unitId: number): Promise<void> {
  await getDatabase().execute(sql`
    INSERT INTO f10_customer_holder_profiles(unit_id, holder_id)
    SELECT DISTINCT c.unit_id, c.titular_id
    FROM f10_customer_contracts c
    WHERE c.unit_id = ${unitId}
      AND c.titular_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM f10_customer_holder_profiles holder
        WHERE holder.unit_id = c.unit_id AND holder.holder_id = c.titular_id
      )
    ON CONFLICT (unit_id, holder_id) DO NOTHING
  `);
}

function failureCode(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : "";
  return /^F10_[A-Z_]+$/.test(message) ? message : "F10_HOLDER_FETCH_FAILED";
}

async function synchronizeHolder(unitId: number, holderId: number): Promise<void> {
  try {
    const holder = await getF10ContractHolder(unitId, holderId);
    await saveHolder(unitId, holder);
  } catch (cause) {
    const code = failureCode(cause);
    const blocked = code === "F10_API_RATE_LIMITED" ||
      code === "F10_API_UNAUTHORIZED" ||
      code === "F10_API_NOT_CONFIGURED";
    if (blocked) {
      suspendedUntil = Date.now() + (code === "F10_API_RATE_LIMITED"
        ? RATE_LIMIT_BACKOFF_MS : AUTH_BACKOFF_MS);
    }
    await getDatabase().execute(sql`
      UPDATE f10_customer_holder_profiles SET
        status = CASE WHEN name IS NOT NULL THEN 'synced' ELSE 'failed' END,
        error_code = ${code},
        next_attempt_at = now() + interval '1 day'
      WHERE unit_id = ${unitId} AND holder_id = ${holderId}
    `);
  }
}

export async function processF10HolderSyncOnce(): Promise<void> {
  if (Date.now() < suspendedUntil || !isF10CustomerApiConfigured()) return;
  const unitId = getConfiguredF10UnitId();

  if (Date.now() - lastSeedAt > SEED_INTERVAL_MS) {
    await seedMissingHolders(unitId);
    lastSeedAt = Date.now();
  }

  const pending = rowsOf(await getDatabase().execute(sql`
    SELECT holder_id::text AS holder_id
    FROM f10_customer_holder_profiles
    WHERE unit_id = ${unitId}
      AND next_attempt_at <= now()
    ORDER BY
      CASE status WHEN 'pending' THEN 0 WHEN 'failed' THEN 1 ELSE 2 END,
      holder_id
    LIMIT ${BATCH_SIZE}
  `));

  for (let offset = 0; offset < pending.length; offset += 2) {
    if (Date.now() < suspendedUntil) break;
    const chunk = pending.slice(offset, offset + 2);
    await Promise.all(chunk.map((row) =>
      synchronizeHolder(unitId, Number(row.holder_id))));
  }
}
