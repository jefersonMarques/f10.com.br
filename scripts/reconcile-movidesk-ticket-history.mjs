import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import postgres from "postgres";

const DEFAULT_DIRECTORY = "/var/lib/f10/movidesk-final-snapshot";

function parseOptions(argv) {
  const options = { ticket: "42746", directory: DEFAULT_DIRECTORY, apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--ticket") options.ticket = argv[++index];
    else if (argument === "--directory") options.directory = argv[++index];
    else if (argument === "--apply") options.apply = true;
    else throw new Error("UNKNOWN_ARGUMENT");
  }
  if (!/^[0-9]+$/.test(options.ticket ?? "") || !options.directory?.startsWith("/")) {
    throw new Error("INVALID_ARGUMENTS");
  }
  return options;
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function textValue(value) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim() : "";
}

function personId(person) {
  const id = object(person).id;
  return id === undefined || id === null ? "" : String(id);
}

function personName(person) {
  const value = object(person);
  return textValue(value.businessName) || textValue(value.name);
}

function personDetail(person, role) {
  const value = object(person);
  const id = personId(value);
  if (!id) return null;
  return {
    sourceId: id,
    name: personName(value).slice(0, 200),
    email: textValue(value.email).slice(0, 254) || null,
    role,
  };
}

function primaryClient(ticket) {
  const clients = list(ticket.clients).filter((person) => personId(person) && person.isDeleted !== true);
  if (!clients.length) return null;
  const creator = clients.find((person) => personId(person) === personId(ticket.createdBy));
  if (creator) return creator;

  const actions = list(ticket.actions)
    .filter((action) => action.isDeleted !== true)
    .sort((a, b) => String(a.createdDate ?? "").localeCompare(String(b.createdDate ?? "")));
  for (const action of actions) {
    const client = clients.find((person) => personId(person) === personId(action.createdBy));
    if (client) return client;
  }
  return clients.length === 1 ? clients[0] : null;
}

function historicalPeople(ticket) {
  const byId = new Map();
  function register(person, role) {
    const item = personDetail(person, role);
    if (!item) return;
    const current = byId.get(item.sourceId);
    if (current) {
      if (!current.roles.includes(role)) current.roles.push(role);
      if (!current.name) current.name = item.name;
      if (!current.email) current.email = item.email;
    } else {
      byId.set(item.sourceId, { ...item, roles: [role] });
      byId.get(item.sourceId).role = undefined;
    }
  }

  for (const person of list(ticket.clients)) {
    if (person?.isDeleted !== true) register(person, "customer");
  }
  register(ticket.owner, "owner");
  register(ticket.createdBy, "creator");
  for (const action of list(ticket.actions)) {
    if (action?.isDeleted !== true) register(action.createdBy, "author");
  }
  return [...byId.values()].map(({ role: _role, ...person }) => person);
}

function historicalOrganization(client) {
  const value = object(object(client).organization);
  const id = personId(value);
  if (!id) return null;
  return {
    sourceId: id,
    name: personName(value).slice(0, 200),
    email: textValue(value.email).slice(0, 254) || null,
  };
}

async function readSnapshot(directory, sourceId) {
  const stream = createReadStream(directory + "/tickets.jsonl", { encoding: "utf8" });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of reader) {
      if (!line.includes('"sourceId":"' + sourceId + '"')) continue;
      const record = JSON.parse(line);
      if (String(record.sourceId) !== sourceId || String(record.ticket?.id) !== sourceId) {
        throw new Error("SNAPSHOT_SOURCE_ID_MISMATCH");
      }
      return record.ticket;
    }
  } finally {
    reader.close();
    stream.destroy();
  }
  throw new Error("SOURCE_TICKET_NOT_FOUND");
}

async function uniqueOperator(tx, person) {
  const email = textValue(object(person).email).toLowerCase();
  if (!email) return null;
  const matches = await tx.unsafe(
    "SELECT id::text FROM users WHERE lower(email) = $1 LIMIT 2",
    [email],
  );
  return matches.length === 1 ? matches[0].id : null;
}

async function sourceContact(tx, person, apply) {
  const id = personId(person);
  if (!id) return null;
  const rows = await tx.unsafe(
    "SELECT id::text FROM customer_contacts " +
    "WHERE import_source = 'movidesk' AND import_source_id = $1 LIMIT 2",
    [id],
  );
  if (rows.length > 1) throw new Error("HISTORICAL_CONTACT_AMBIGUOUS");
  if (rows.length) return rows[0].id;
  if (!apply) return null;

  const inserted = await tx.unsafe(
    "INSERT INTO customer_contacts (name, email, import_source, import_source_id) " +
    "VALUES ($1, NULL, 'movidesk', $2) " +
    "ON CONFLICT DO NOTHING RETURNING id::text",
    [personName(person).slice(0, 200) || "Contato histórico Movidesk", id],
  );
  if (inserted.length) return inserted[0].id;

  const retry = await tx.unsafe(
    "SELECT id::text FROM customer_contacts " +
    "WHERE import_source = 'movidesk' AND import_source_id = $1 LIMIT 2",
    [id],
  );
  if (retry.length !== 1) throw new Error("HISTORICAL_CONTACT_CONFLICT");
  return retry[0].id;
}

async function linkedActions(tx, sourceId, ticketId) {
  return tx.unsafe(
    "SELECT a.source_action_id, a.source_visibility, m.id::text AS message_id, " +
    "m.visibility, m.external_metadata, m.external_message_id " +
    "FROM movidesk_ticket_action_imports a " +
    "JOIN ticket_messages m ON m.id = a.message_id " +
    "WHERE a.source_ticket_id = $1 AND m.ticket_id = $2::uuid",
    [sourceId, ticketId],
  );
}

async function reconcile(tx, sourceId, ticket, apply) {
  const [mapping] = await tx.unsafe(
    "SELECT i.ticket_id::text, t.customer_contact_id::text " +
    "FROM movidesk_ticket_imports i " +
    "JOIN tickets t ON t.id = i.ticket_id " +
    "WHERE i.source_ticket_id = $1 FOR UPDATE OF t",
    [sourceId],
  );
  if (!mapping) throw new Error("IMPORTED_TICKET_NOT_FOUND");

  const entries = await linkedActions(tx, sourceId, mapping.ticket_id);
  const byId = new Map(entries.map((row) => [Number(row.source_action_id), row]));
  const activeActions = list(ticket.actions).filter((action) => action.isDeleted !== true);
  const restoreIds = [];

  for (const action of activeActions) {
    const expected = Number(action.type) === 2 ? "public" : "internal";
    const row = byId.get(Number(action.id));
    if (!row) throw new Error("IMPORTED_ACTION_NOT_FOUND:" + action.id);
    if (row.source_visibility !== expected ||
        row.external_message_id !== "movidesk:" + sourceId + ":" + action.id ||
        row.external_metadata?.sourceTicketId !== sourceId ||
        Number(row.external_metadata?.sourceActionId) !== Number(action.id) ||
        row.external_metadata?.sourceVisibility !== expected) {
      throw new Error("IMPORTED_ACTION_MAPPING_MISMATCH:" + action.id);
    }
    if (expected === "public" && row.visibility === "internal") {
      if (row.external_metadata?.portalAccessApproved !== false) {
        throw new Error("PUBLIC_ACTION_REQUIRES_PORTAL_REVIEW:" + action.id);
      }
      restoreIds.push(row.message_id);
    }
  }

  const client = primaryClient(ticket);
  const organization = historicalOrganization(client);
  const people = historicalPeople(ticket);
  const clients = list(ticket.clients)
    .filter((person) => person?.isDeleted !== true)
    .map((person) => personDetail(person, "customer"))
    .filter(Boolean);

  const [existingHistory] = await tx.unsafe(
    "SELECT id::text FROM ticket_events " +
    "WHERE ticket_id = $1::uuid AND event_type = 'movidesk.ticket.reconciled' LIMIT 1",
    [mapping.ticket_id],
  );
  const [requesterProfile] = await tx.unsafe(
    "SELECT ticket_id::text FROM ticket_requester_profiles WHERE ticket_id = $1::uuid",
    [mapping.ticket_id],
  );

  const preview = {
    state: apply ? "updated" : "preview",
    sourceTicketId: sourceId,
    ticketId: mapping.ticket_id,
    originalClient: client ? personDetail(client, "customer") : null,
    originalOrganization: organization,
    people,
    publicMessagesToRestore: restoreIds.length,
    internalMessagesPreserved: activeActions.filter((action) => Number(action.type) !== 2).length,
    currentCustomerLinked: Boolean(mapping.customer_contact_id),
    missingRequesterProfile: !requesterProfile,
    historicalContextRecorded: Boolean(existingHistory),
    portalAccessGranted: false,
  };
  if (!apply) return preview;

  for (const messageId of restoreIds) {
    const updated = await tx.unsafe(
      "UPDATE ticket_messages SET visibility = 'public' " +
      "WHERE id = $1::uuid AND visibility = 'internal' " +
      "AND external_metadata->>'portalAccessApproved' = 'false' RETURNING id",
      [messageId],
    );
    if (updated.length !== 1) throw new Error("VISIBILITY_UPDATE_FAILED");
  }

  if (client && !requesterProfile) {
    await tx.unsafe(
      "INSERT INTO ticket_requester_profiles " +
      "(ticket_id, display_name, display_email) VALUES ($1::uuid, $2, $3) " +
      "ON CONFLICT (ticket_id) DO NOTHING",
      [mapping.ticket_id, personName(client) || null, textValue(client.email) || null],
    );
  }

  for (const item of list(ticket.clients)) {
    if (!personId(item) || item.isDeleted === true) continue;
    const contactId = await sourceContact(tx, item, true);
    await tx.unsafe(
      "INSERT INTO ticket_participants " +
      "(ticket_id, participant_type, customer_contact_id, source_system, source_person_id) " +
      "VALUES ($1::uuid, 'customer', $2::uuid, 'movidesk', $3) ON CONFLICT DO NOTHING",
      [mapping.ticket_id, contactId, personId(item)],
    );
  }

  if (!mapping.customer_contact_id && client) {
    const contactId = await sourceContact(tx, client, true);
    await tx.unsafe(
      "UPDATE tickets SET customer_contact_id = $2::uuid " +
      "WHERE id = $1::uuid AND customer_contact_id IS NULL",
      [mapping.ticket_id, contactId],
    );
  }

  const operators = [ticket.owner, ticket.createdBy,
    ...activeActions.map((action) => action.createdBy)];
  const operatorsById = new Map(operators
    .filter((person) => [1, 3].includes(Number(object(person).profileType)) && personId(person))
    .map((person) => [personId(person), person]));

  let linkedOperators = 0;
  for (const person of operatorsById.values()) {
    const userId = await uniqueOperator(tx, person);
    if (!userId) continue;
    const inserted = await tx.unsafe(
      "INSERT INTO ticket_participants " +
      "(ticket_id, participant_type, user_id, source_system, source_person_id) " +
      "VALUES ($1::uuid, 'operator', $2::uuid, 'movidesk', $3) " +
      "ON CONFLICT DO NOTHING RETURNING id",
      [mapping.ticket_id, userId, personId(person)],
    );
    linkedOperators += inserted.length;
  }

  if (!existingHistory) {
    const context = {
      source: "movidesk",
      sourceTicketId: sourceId,
      primaryClient: client ? personDetail(client, "customer") : null,
      organization,
      clients,
      people,
    };
    await tx.unsafe(
      "INSERT INTO ticket_events (ticket_id, event_type, metadata) " +
      "VALUES ($1::uuid, 'movidesk.ticket.reconciled', $2::jsonb)",
      [mapping.ticket_id, JSON.stringify(context)],
    );
  }

  return { ...preview, linkedOperators, restoredMessages: restoreIds.length };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL_MISSING");

  const ticket = await readSnapshot(options.directory, options.ticket);
  const db = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });
  try {
    const result = await db.begin(async (tx) => {
      if (options.apply) {
        await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", ["movidesk:" + options.ticket]);
      } else {
        await tx.unsafe("SET TRANSACTION READ ONLY");
      }
      return reconcile(tx, options.ticket, ticket, options.apply);
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await db.end({ timeout: 5 });
  }
}

main().catch((cause) => {
  console.error(JSON.stringify({
    state: "error",
    reason: cause instanceof Error ? cause.message : "UNKNOWN_ERROR",
  }));
  process.exitCode = 1;
});
