import { sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { getConfiguredF10UnitId } from "$lib/server/integrations/f10/f10CustomerApi";

type Row = Record<string, unknown>;
type Db = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CONTRACT_SELECTION = 500;

function rows(value: unknown): Row[] {
  return value as Row[];
}

function validId(id: string): boolean {
  return UUID_PATTERN.test(id);
}

export function parseContractSelection(values: string[], maximum = MAX_CONTRACT_SELECTION): number[] {
  if (values.length > maximum) throw new Error("SUPPORT_CONTRACT_SELECTION_LIMIT");
  const ids: number[] = [];
  const unique = new Set<number>();

  for (const value of values) {
    if (!/^[1-9][0-9]*$/.test(value)) throw new Error("SUPPORT_CONTRACT_SELECTION_INVALID");
    const contractId = Number(value);
    if (!Number.isSafeInteger(contractId)) throw new Error("SUPPORT_CONTRACT_SELECTION_INVALID");
    if (unique.has(contractId)) continue;
    unique.add(contractId);
    ids.push(contractId);
  }
  return ids;
}

export function readContractSelection(form: FormData, name: string): number[] {
  return parseContractSelection(form.getAll(name)
    .filter((value): value is string => typeof value === "string"));
}

async function assertContact(
  tx: Transaction,
  contactId: string,
): Promise<void> {
  if (!validId(contactId)) throw new Error("SUPPORT_CONTACT_INVALID");
  const matches = rows(await tx.execute(sql`
    SELECT id FROM customer_contacts
    WHERE id = ${contactId}::uuid AND active = true
    FOR UPDATE
  `));
  if (matches.length !== 1) throw new Error("SUPPORT_CONTACT_NOT_FOUND");
}

async function assertContracts(
  tx: Transaction,
  unitId: number,
  contractIds: number[],
): Promise<void> {
  if (contractIds.length === 0) return;
  const found = rows(await tx.execute(sql`
    SELECT contract_id::text AS contract_id
    FROM f10_customer_contracts
    WHERE unit_id = ${unitId}
      AND contract_id IN (${sql.join(contractIds.map((id) => sql`${id}`), sql`, `)})
  `));
  if (found.length !== contractIds.length) {
    throw new Error("SUPPORT_CONTRACT_NOT_FOUND");
  }
}

export async function getContactContractAccess(contactId: string) {
  if (!validId(contactId)) throw new Error("SUPPORT_CONTACT_INVALID");
  const unitId = getConfiguredF10UnitId();
  return rows(await getDatabase().execute(sql`
    SELECT access.contract_id::text AS "contractId",
      c.numero_contrato AS "contractNumber",
      coalesce(nullif(holder.name, ''),
        nullif(c.source_record ->> 'nome_fantasia', ''),
        nullif(c.source_record ->> 'razao_social', ''),
        'Contrato F10 #' || c.contract_id::text) AS name,
      coalesce(nullif(c.x_status, ''), c.status::text) AS status
    FROM customer_contract_access access
    JOIN f10_customer_contracts c
      ON c.unit_id = access.unit_id AND c.contract_id = access.contract_id
    LEFT JOIN f10_customer_holder_profiles holder
      ON holder.unit_id = c.unit_id AND holder.holder_id = c.titular_id
    WHERE access.customer_contact_id = ${contactId}::uuid
      AND access.unit_id = ${unitId}
    ORDER BY name, access.contract_id
  `));
}

export async function replaceContactContractAccess(
  actorUserId: string,
  contactId: string,
  contractIds: number[],
): Promise<void> {
  if (!validId(actorUserId) || !validId(contactId)) {
    throw new Error("SUPPORT_CONTACT_INVALID");
  }
  if (contractIds.length > MAX_CONTRACT_SELECTION ||
      new Set(contractIds).size !== contractIds.length ||
      contractIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("SUPPORT_CONTRACT_SELECTION_INVALID");
  }

  const unitId = getConfiguredF10UnitId();
  await getDatabase().transaction(async (tx) => {
    await assertContact(tx, contactId);
    await assertContracts(tx, unitId, contractIds);

    await tx.execute(sql`
      DELETE FROM customer_contract_access
      WHERE customer_contact_id = ${contactId}::uuid
        AND unit_id = ${unitId}
    `);

    for (const contractId of contractIds) {
      await tx.execute(sql`
        INSERT INTO customer_contract_access
          (customer_contact_id, unit_id, contract_id, granted_by)
        VALUES (${contactId}::uuid, ${unitId}, ${contractId}, ${actorUserId}::uuid)
      `);
    }
  });
}

export async function getTicketContractLinks(ticketId: string) {
  if (!validId(ticketId)) throw new Error("SUPPORT_TICKET_INVALID");
  const unitId = getConfiguredF10UnitId();
  return rows(await getDatabase().execute(sql`
    SELECT link.contract_id::text AS "contractId",
      link.is_primary AS "isPrimary",
      c.numero_contrato AS "contractNumber",
      coalesce(nullif(holder.name, ''),
        nullif(c.source_record ->> 'nome_fantasia', ''),
        nullif(c.source_record ->> 'razao_social', ''),
        'Contrato F10 #' || c.contract_id::text) AS name
    FROM ticket_contract_links link
    JOIN f10_customer_contracts c
      ON c.unit_id = link.unit_id AND c.contract_id = link.contract_id
    LEFT JOIN f10_customer_holder_profiles holder
      ON holder.unit_id = c.unit_id AND holder.holder_id = c.titular_id
    WHERE link.ticket_id = ${ticketId}::uuid AND link.unit_id = ${unitId}
    ORDER BY link.is_primary DESC, name
  `));
}

async function assertContactAccess(
  tx: Transaction,
  contactId: string,
  unitId: number,
  contractIds: number[],
): Promise<void> {
  if (contractIds.length === 0) throw new Error("SUPPORT_TICKET_CONTRACT_REQUIRED");

  const access = rows(await tx.execute(sql`
    SELECT contract_id::text AS contract_id
    FROM customer_contract_access
    WHERE customer_contact_id = ${contactId}::uuid
      AND unit_id = ${unitId}
      AND contract_id IN (${sql.join(contractIds.map((id) => sql`${id}`), sql`, `)})
  `));
  if (access.length !== contractIds.length) {
    throw new Error("SUPPORT_TICKET_CONTRACT_FORBIDDEN");
  }
}

export async function saveTicketContracts(
  tx: Transaction,
  ticketId: string,
  contactId: string,
  actorUserId: string,
  contractIds: number[],
): Promise<void> {
  if (!validId(ticketId) || !validId(contactId) || !validId(actorUserId)) {
    throw new Error("SUPPORT_TICKET_CONTRACT_INVALID");
  }
  const unitId = getConfiguredF10UnitId();
  await assertContact(tx, contactId);
  await assertContactAccess(tx, contactId, unitId, contractIds);
  await assertContracts(tx, unitId, contractIds);

  await tx.execute(sql`DELETE FROM ticket_contract_links WHERE ticket_id = ${ticketId}::uuid`);
  await tx.execute(sql`DELETE FROM ticket_f10_contract_links WHERE ticket_id = ${ticketId}::uuid`);

  for (const [index, contractId] of contractIds.entries()) {
    await tx.execute(sql`
      INSERT INTO ticket_contract_links
        (ticket_id, unit_id, contract_id, is_primary, linked_by)
      VALUES (${ticketId}::uuid, ${unitId}, ${contractId},
        ${index === 0}, ${actorUserId}::uuid)
    `);
  }

  await tx.execute(sql`
    INSERT INTO ticket_f10_contract_links(ticket_id, unit_id, contract_id)
    VALUES (${ticketId}::uuid, ${unitId}, ${contractIds[0]})
  `);

  // Revogar acesso externo quando a nova abrangência exceder a autorização.
  await tx.execute(sql`
    UPDATE ticket_participants participant
    SET portal_access_enabled = false, notifications_enabled = false
    WHERE participant.ticket_id = ${ticketId}::uuid
      AND participant.participant_type = 'customer'
      AND EXISTS (
        SELECT 1 FROM ticket_contract_links link
        WHERE link.ticket_id = participant.ticket_id
          AND NOT EXISTS (
            SELECT 1 FROM customer_contract_access access
            WHERE access.customer_contact_id = participant.customer_contact_id
              AND access.unit_id = link.unit_id
              AND access.contract_id = link.contract_id
          )
      )
  `);
}

export async function replaceTicketContractLinks(
  ticketId: string,
  actorUserId: string,
  contractIds: number[],
): Promise<void> {
  if (!validId(ticketId) || !validId(actorUserId)) {
    throw new Error("SUPPORT_TICKET_INVALID");
  }
  await getDatabase().transaction(async (tx) => {
    const ticket = rows(await tx.execute(sql`
      SELECT customer_contact_id::text AS contact_id
      FROM tickets WHERE id = ${ticketId}::uuid FOR UPDATE
    `))[0];
    if (!ticket || typeof ticket.contact_id !== "string") {
      throw new Error("SUPPORT_TICKET_REQUESTER_REQUIRED");
    }

    await saveTicketContracts(
      tx, ticketId, ticket.contact_id, actorUserId, contractIds,
    );
    await tx.execute(sql`
      INSERT INTO ticket_events (ticket_id, actor_user_id, event_type, metadata)
      VALUES (${ticketId}::uuid, ${actorUserId}::uuid,
        'ticket.contracts.updated', ${JSON.stringify({ contractIds })}::jsonb)
    `);
    await tx.execute(sql`
      UPDATE tickets SET updated_at = now() WHERE id = ${ticketId}::uuid
    `);
  });
}

export async function getContractTicketCounts(unitId: number, contractId: number) {
  const result = rows(await getDatabase().execute(sql`
    SELECT count(DISTINCT t.id)::int AS total,
      count(DISTINCT t.id) FILTER (
        WHERE t.status NOT IN ('resolved', 'closed')
      )::int AS open
    FROM ticket_contract_links link
    JOIN tickets t ON t.id = link.ticket_id
    WHERE link.unit_id = ${unitId} AND link.contract_id = ${contractId}
  `));
  return { total: Number(result[0]?.total ?? 0), open: Number(result[0]?.open ?? 0) };
}

export async function listContractTickets(unitId: number, contractId: number) {
  return rows(await getDatabase().execute(sql`
    SELECT t.id::text AS id, t.ticket_number AS "ticketNumber",
      t.subject, t.status, t.updated_at AS "updatedAt"
    FROM ticket_contract_links link
    JOIN tickets t ON t.id = link.ticket_id
    WHERE link.unit_id = ${unitId} AND link.contract_id = ${contractId}
    ORDER BY t.updated_at DESC
    LIMIT 50
  `));
}

export async function listTicketCustomers(ticketId: string) {
  if (!validId(ticketId)) throw new Error("SUPPORT_TICKET_INVALID");
  return rows(await getDatabase().execute(sql`
    SELECT p.customer_contact_id::text AS "contactId", c.name, c.email,
      p.portal_access_enabled AS "portalAccessEnabled",
      p.notifications_enabled AS "notificationsEnabled"
    FROM ticket_participants p
    JOIN customer_contacts c ON c.id = p.customer_contact_id
    WHERE p.ticket_id = ${ticketId}::uuid AND p.participant_type = 'customer'
    ORDER BY c.name
  `));
}

export async function addTicketCustomerParticipant(
  ticketId: string,
  contactId: string,
  actorUserId: string,
): Promise<void> {
  if (![ticketId, contactId, actorUserId].every(validId)) {
    throw new Error("SUPPORT_PARTICIPANT_INVALID");
  }
  await getDatabase().transaction(async (tx) => {
    await assertContact(tx, contactId);
    const ticket = rows(await tx.execute(sql`
      SELECT customer_contact_id::text AS contact_id
      FROM tickets WHERE id = ${ticketId}::uuid FOR UPDATE
    `))[0];
    if (!ticket) throw new Error("SUPPORT_TICKET_NOT_FOUND");
    if (ticket.contact_id === contactId) throw new Error("SUPPORT_PARTICIPANT_IS_REQUESTER");

    const contractCount = rows(await tx.execute(sql`
      SELECT count(*)::int AS total FROM ticket_contract_links
      WHERE ticket_id = ${ticketId}::uuid
    `));
    if (Number(contractCount[0]?.total ?? 0) === 0) {
      throw new Error("SUPPORT_TICKET_CONTRACT_REQUIRED");
    }

    const matches = rows(await tx.execute(sql`
      SELECT count(*)::int AS total
      FROM ticket_contract_links t
      WHERE t.ticket_id = ${ticketId}::uuid AND NOT EXISTS (
        SELECT 1 FROM customer_contract_access a
        WHERE a.customer_contact_id = ${contactId}::uuid
          AND a.unit_id = t.unit_id AND a.contract_id = t.contract_id
      )
    `));
    if (Number(matches[0]?.total ?? 0) > 0) {
      throw new Error("SUPPORT_PARTICIPANT_CONTRACT_FORBIDDEN");
    }

    await tx.execute(sql`
      INSERT INTO ticket_participants(
        ticket_id, participant_type, customer_contact_id, added_by_user_id,
        portal_access_enabled, notifications_enabled
      )
      VALUES (${ticketId}::uuid, 'customer', ${contactId}::uuid,
        ${actorUserId}::uuid, true, false)
      ON CONFLICT (ticket_id, customer_contact_id)
        WHERE customer_contact_id IS NOT NULL DO NOTHING
    `);
    await tx.execute(sql`
      INSERT INTO ticket_events(ticket_id, actor_user_id, event_type, metadata)
      VALUES (${ticketId}::uuid, ${actorUserId}::uuid, 'ticket.participant.added',
        ${JSON.stringify({ contactId })}::jsonb)
    `);
  });
}

export async function removeTicketCustomerParticipant(
  ticketId: string,
  contactId: string,
  actorUserId: string,
): Promise<void> {
  if (![ticketId, contactId, actorUserId].every(validId)) {
    throw new Error("SUPPORT_PARTICIPANT_INVALID");
  }
  await getDatabase().transaction(async (tx) => {
    await tx.execute(sql`
      DELETE FROM ticket_participants WHERE ticket_id = ${ticketId}::uuid
        AND customer_contact_id = ${contactId}::uuid
        AND participant_type = 'customer'
    `);
    await tx.execute(sql`
      INSERT INTO ticket_events(ticket_id, actor_user_id, event_type, metadata)
      VALUES (${ticketId}::uuid, ${actorUserId}::uuid, 'ticket.participant.removed',
        ${JSON.stringify({ contactId })}::jsonb)
    `);
  });
}

export async function addInitialTicketParticipants(
  tx: Transaction,
  ticketId: string,
  requesterId: string,
  actorUserId: string,
  participantIds: string[],
  contractIds: number[],
): Promise<void> {
  if (participantIds.length > 20 ||
      new Set(participantIds).size !== participantIds.length) {
    throw new Error("SUPPORT_PARTICIPANT_INVALID");
  }

  const unitId = getConfiguredF10UnitId();
  for (const contactId of participantIds) {
    if (!validId(contactId) || contactId === requesterId) {
      throw new Error("SUPPORT_PARTICIPANT_INVALID");
    }
    await assertContact(tx, contactId);
    await assertContactAccess(tx, contactId, unitId, contractIds);
    await tx.execute(sql`
      INSERT INTO ticket_participants(
        ticket_id, participant_type, customer_contact_id, added_by_user_id,
        portal_access_enabled, notifications_enabled
      ) VALUES (${ticketId}::uuid, 'customer', ${contactId}::uuid,
        ${actorUserId}::uuid, true, false)
      ON CONFLICT (ticket_id, customer_contact_id)
        WHERE customer_contact_id IS NOT NULL DO NOTHING
    `);
  }
}
