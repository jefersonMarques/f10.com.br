import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";

type Row = Record<string, unknown>;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function rows(value: unknown): Row[] {
  return value as Row[];
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createManualCustomerContact(input: {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
}): Promise<string> {
  const name = input.name.trim().slice(0, 120);
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim().slice(0, 40);
  const whatsapp = input.whatsapp.trim().slice(0, 40);

  if (name.length < 2 || !validateEmail(email) ||
      input.name.trim().length > 120 || input.email.trim().length > 254 ||
      input.phone.trim().length > 40 || input.whatsapp.trim().length > 40) {
    throw new Error("CUSTOMER_MANUAL_CONTACT_INVALID");
  }

  return getDatabase().transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${email}))`);
    const existing = rows(await tx.execute(sql`
      SELECT id FROM customer_contacts
      WHERE active = true AND lower(email) = ${email}
      LIMIT 2
    `));
    if (existing.length > 0) {
      throw new Error("CUSTOMER_EMAIL_ALREADY_REGISTERED");
    }
    const created = rows(await tx.execute(sql`
      INSERT INTO customer_contacts(name, email, phone, whatsapp)
      VALUES (${name}, ${email}, ${phone || null}, ${whatsapp || null})
      RETURNING id::text AS id
    `));
    if (typeof created[0]?.id !== "string") {
      throw new Error("CUSTOMER_MANUAL_CONTACT_CREATE_FAILED");
    }
    return created[0].id;
  });
}

export async function getCustomerContactIdentity(contactId: string) {
  if (!UUID_PATTERN.test(contactId)) throw new Error("CUSTOMER_CONTACT_INVALID");
  const [row] = rows(await getDatabase().execute(sql`
    SELECT c.id::text AS "contactId", c.name, c.email, c.active,
      EXISTS (
        SELECT 1 FROM customer_f10_identities f
        WHERE f.customer_contact_id = c.id
      ) OR EXISTS (
        SELECT 1 FROM customer_auth_identities a
        WHERE a.customer_contact_id = c.id 
      ) AS "hasLogin",
      EXISTS (
        SELECT 1 FROM customer_contact_merges m
        WHERE m.source_contact_id = c.id
      ) AS "wasMerged",
      (SELECT count(*)::int FROM customer_contract_access access
        WHERE access.customer_contact_id = c.id) AS "contractCount"
    FROM customer_contacts c WHERE c.id = ${contactId}::uuid
  `));
  return row ?? null;
}

export async function listMergeCandidates(contactId: string, query: string) {
  if (!UUID_PATTERN.test(contactId)) throw new Error("CUSTOMER_CONTACT_INVALID");
  const pattern = "%" + query.trim().slice(0, 100) + "%";
  if (query.trim().length < 2) return [];
  return rows(await getDatabase().execute(sql`
    SELECT c.id::text AS id, c.name, c.email,
      EXISTS (SELECT 1 FROM customer_f10_identities f
        WHERE f.customer_contact_id = c.id)
      OR EXISTS (SELECT 1 FROM customer_auth_identities a
        WHERE a.customer_contact_id = c.id )
      AS "hasLogin"
    FROM customer_contacts c
    WHERE c.active = true AND c.id <> ${contactId}::uuid
      AND (c.name ILIKE ${pattern} OR c.email ILIKE ${pattern})
      AND NOT EXISTS (SELECT 1 FROM customer_contact_merges m
        WHERE m.source_contact_id = c.id)
    ORDER BY c.name LIMIT 20
  `));
}

export async function mergeCustomerContacts(
  actorUserId: string,
  sourceId: string,
  targetId: string,
): Promise<void> {
  if (![actorUserId, sourceId, targetId].every((id) => UUID_PATTERN.test(id)) ||
      sourceId === targetId) {
    throw new Error("CUSTOMER_MERGE_INVALID");
  }

  await getDatabase().transaction(async (tx) => {
    const contacts = rows(await tx.execute(sql`
      SELECT id::text AS id, active,
        EXISTS (SELECT 1 FROM customer_f10_identities f
          WHERE f.customer_contact_id = c.id)
        OR EXISTS (SELECT 1 FROM customer_auth_identities a
          WHERE a.customer_contact_id = c.id )
        AS "hasLogin"
      FROM customer_contacts c
      WHERE id IN (${sourceId}::uuid, ${targetId}::uuid)
      ORDER BY id FOR UPDATE OF c
    `));

    const source = contacts.find((contact) => contact.id === sourceId);
    const target = contacts.find((contact) => contact.id === targetId);
    if (!source?.active || !target?.active) throw new Error("CUSTOMER_MERGE_NOT_FOUND");
    if (source.hasLogin) throw new Error("CUSTOMER_MERGE_LOGIN_SOURCE_FORBIDDEN");

    const linked = rows(await tx.execute(sql`
      SELECT source_contact_id::text AS id
      FROM customer_contact_merges
      WHERE source_contact_id IN (${sourceId}::uuid, ${targetId}::uuid)
        OR target_contact_id = ${sourceId}::uuid
      LIMIT 1
    `));
    if (linked.length > 0) throw new Error("CUSTOMER_MERGE_CHAIN_FORBIDDEN");

    await tx.execute(sql`
      INSERT INTO customer_contact_merges
        (source_contact_id, target_contact_id, merged_by)
      VALUES (${sourceId}::uuid, ${targetId}::uuid, ${actorUserId}::uuid)
    `);
    await tx.execute(sql`
      INSERT INTO customer_contract_access
        (customer_contact_id, unit_id, contract_id, granted_by)
      SELECT ${targetId}::uuid, unit_id, contract_id, ${actorUserId}::uuid
      FROM customer_contract_access WHERE customer_contact_id = ${sourceId}::uuid
      ON CONFLICT (customer_contact_id, unit_id, contract_id) DO NOTHING
    `);
    await tx.execute(sql`
      UPDATE customer_contacts SET active = false, updated_at = now()
      WHERE id = ${sourceId}::uuid
    `);
  });
}
