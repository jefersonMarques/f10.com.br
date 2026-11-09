import postgres from "postgres";

const API_BASE = "https://api.movidesk.com/public/v1";
const OPEN_STATUSES = new Set(["New", "InAttendance", "Stopped"]);
const ROUTES = ["/tickets", "/tickets/past"];
const WAIT_MS = 7000;

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

function personId(person) {
  const value = object(person).id;
  return value === null || value === undefined ? "" : String(value);
}

function safeDate(value, fallback = null) {
  const result = new Date(trimmed(value));
  return Number.isFinite(result.getTime()) ? result : fallback;
}

function parseOptions() {
  const args = process.argv.slice(2);
  const options = { apply: false, limit: 10, queue: "support" };
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (key === "--apply") options.apply = true;
    else if (key === "--limit") options.limit = Number(args[++index]);
    else if (key === "--queue") options.queue = args[++index];
    else throw new Error("UNKNOWN_ARGUMENT");
  }
  if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 500) {
    throw new Error("INVALID_LIMIT");
  }
  if (!/^[a-z0-9_-]{1,64}$/.test(options.queue)) throw new Error("INVALID_QUEUE");
  return options;
}

function statusFor(baseStatus) {
  if (baseStatus === "New") return "new";
  if (baseStatus === "InAttendance") return "in_progress";
  if (baseStatus === "Stopped") return "open";
  throw new Error("UNKNOWN_BASE_STATUS");
}

function channelFor(origin) {
  if ([3, 7].includes(Number(origin))) return "email";
  if ([18, 23].includes(Number(origin))) return "whatsapp";
  return "manual";
}

function contactName(person) {
  const fields = object(person);
  return (trimmed(fields.businessName) || trimmed(fields.name)
    || "Contato histórico Movidesk").slice(0, 200);
}

class MovideskApi {
  constructor(token) {
    this.token = token;
    this.nextAllowedAt = 0;
    this.count = 0;
  }

  async get(path, params) {
    const delay = Math.max(0, this.nextAllowedAt - Date.now());
    if (delay) await new Promise((done) => setTimeout(done, delay));
    this.nextAllowedAt = Date.now() + WAIT_MS;
    const url = new URL(API_BASE + path);
    url.searchParams.set("token", this.token);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(45000),
    });
    this.count += 1;
    if (!response.ok) {
      throw new Error("MOVIDESK_HTTP_" + response.status
        + "_RETRY_AFTER_" + (response.headers.get("retry-after") || "unknown"));
    }
    return response.json();
  }

  async discover(limit) {
    const ids = new Map();
    const filter = "baseStatus eq 'New' or baseStatus eq 'InAttendance' or baseStatus eq 'Stopped'";
    for (const path of ROUTES) {
      for (let page = 0; page < 1000; page += 1) {
        const response = await this.get(path, {
          $select: "id,baseStatus,lastUpdate",
          $filter: filter,
          $orderby: "lastUpdate desc",
          $top: 100,
          $skip: page * 100,
        });
        if (!Array.isArray(response)) throw new Error("INVALID_SOURCE_LIST");
        for (const ticket of response) {
          const id = personId(ticket);
          if (id && OPEN_STATUSES.has(object(ticket).baseStatus)) {
            ids.set(id, { id, path });
          }
        }
        if (ids.size >= limit || response.length < 100) break;
        if (page === 999) throw new Error("SOURCE_PAGINATION_LIMIT");
      }
      if (ids.size >= limit) break;
    }
    return [...ids.values()].slice(0, limit);
  }
}

async function uniqueAgent(tx, person) {
  const email = trimmed(object(person).email).toLowerCase();
  if (!email) return null;
  const users = await tx.unsafe(
    "SELECT id::text FROM users WHERE lower(email) = $1 LIMIT 2",
    [email],
  );
  return users.length === 1 ? users[0].id : null;
}

async function historicalContact(tx, person) {
  const id = personId(person);
  if (!id) return null;
  const existing = await tx.unsafe(
    "SELECT id::text, email FROM customer_contacts WHERE import_source = 'movidesk' AND import_source_id = $1",
    [id],
  );
  if (existing.length > 1 || existing[0]?.email) {
    throw new Error("SOURCE_CONTACT_AMBIGUOUS");
  }
  if (existing.length === 1) return existing[0].id;
  const created = await tx.unsafe(
    "INSERT INTO customer_contacts (name, email, import_source, import_source_id) " +
    "VALUES ($1, NULL, 'movidesk', $2) " +
    "ON CONFLICT (import_source, import_source_id) " +
    "WHERE import_source IS NOT NULL AND import_source_id IS NOT NULL " +
    "DO NOTHING RETURNING id::text",
    [contactName(person), id],
  );
  if (created.length === 1) return created[0].id;
  throw new Error("SOURCE_CONTACT_CONFLICT");
}

async function authorFor(tx, action, client, contactId) {
  const person = object(action.createdBy);
  if (personId(person) && personId(person) === personId(client)) {
    return { authorType: "customer", userId: null, contactId };
  }
  if ([1, 3].includes(Number(person.profileType))) {
    const userId = await uniqueAgent(tx, person);
    if (userId) return { authorType: "user", userId, contactId: null };
  }
  if (Number(person.profileType) === 2) {
    return {
      authorType: "customer",
      userId: null,
      contactId: await historicalContact(tx, person),
    };
  }
  return { authorType: "system", userId: null, contactId: null };
}

async function importActions(tx, ticket, ticketId, client, contactId) {
  let created = 0;
  for (const item of list(ticket.actions)) {
    const action = object(item);
    if (action.isDeleted === true) continue;
    const actionId = Number(action.id);
    if (!Number.isSafeInteger(actionId) || actionId < 1) throw new Error("INVALID_ACTION_ID");
    if (![1, 2].includes(Number(action.type))) throw new Error("INVALID_ACTION_TYPE");
    const existing = await tx.unsafe(
      "SELECT 1 FROM movidesk_ticket_action_imports " +
      "WHERE source_ticket_id = $1 AND source_action_id = $2",
      [personId(ticket), actionId],
    );
    if (existing.length) continue;
    const author = await authorFor(tx, action, client, contactId);
    const createdAt = safeDate(action.createdDate, safeDate(ticket.createdDate, new Date()));
    const sourceVisibility = Number(action.type) === 1 ? "internal" : "public";
    const metadata = {
      source: "movidesk",
      sourceTicketId: personId(ticket),
      sourceActionId: actionId,
      sourceVisibility,
      sourceAuthorId: personId(action.createdBy) || null,
      sourceAuthorName: contactName(action.createdBy),
      sourceAuthorEmail: trimmed(object(action.createdBy).email) || null,
      attachments: list(action.attachments).map((attachment) => ({
        id: object(attachment).id ?? null,
        name: trimmed(object(attachment).fileName || object(attachment).name),
      })),
      attachmentsImported: false,
    };
    const body = trimmed(action.description) || "[Ação histórica sem descrição textual]";
    const messages = await tx.unsafe(
      "INSERT INTO ticket_messages (ticket_id, author_type, author_user_id, " +
      "customer_contact_id, visibility, channel, body, external_message_id, " +
      "external_metadata, created_at, updated_at) " +
      "VALUES ($1::uuid, $2, $3::uuid, $4::uuid, 'internal', $5, $6, $7, $8::jsonb, $9, $9) " +
      "RETURNING id::text",
      [
        ticketId, author.authorType, author.userId, author.contactId,
        channelFor(ticket.origin), body,
        "movidesk:" + personId(ticket) + ":" + actionId,
        JSON.stringify(metadata), createdAt,
      ],
    );
    await tx.unsafe(
      "INSERT INTO movidesk_ticket_action_imports " +
      "(source_ticket_id, source_action_id, message_id, source_visibility) " +
      "VALUES ($1, $2, $3::uuid, $4)",
      [personId(ticket), actionId, messages[0].id, sourceVisibility],
    );
    created += 1;
  }
  return created;
}

async function importTicket(db, ticket, queueId) {
  const id = personId(ticket);
  if (!OPEN_STATUSES.has(trimmed(ticket.baseStatus))) {
    return { id, result: "not_open", actions: 0 };
  }
  const clients = list(ticket.clients).filter((person) => !object(person).isDeleted);
  if (clients.length !== 1 || !personId(clients[0])) {
    return { id, result: "requires_customer_review", actions: 0 };
  }
  const client = object(clients[0]);
  const createdAt = safeDate(ticket.createdDate);
  if (!createdAt) throw new Error("INVALID_CREATED_DATE");
  return db.begin(async (tx) => {
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", ["movidesk:" + id]);
    const existing = await tx.unsafe(
      "SELECT ticket_id::text FROM movidesk_ticket_imports WHERE source_ticket_id = $1",
      [id],
    );
    const contactId = await historicalContact(tx, client);
    let ticketId = existing[0]?.ticket_id;
    let result = "history_updated";
    if (!ticketId) {
      const ownerId = await uniqueAgent(tx, ticket.owner);
      const updatedAt = safeDate(ticket.lastUpdate, createdAt);
      const subject = trimmed(ticket.subject).slice(0, 350) || "Ticket Movidesk " + id;
      const created = await tx.unsafe(
        "INSERT INTO tickets (customer_contact_id, queue_id, assigned_user_id, " +
        "subject, status, priority, channel, created_at, updated_at) " +
        "VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'normal', $6, $7, $8) RETURNING id::text",
        [
          contactId, queueId, ownerId, subject, statusFor(ticket.baseStatus),
          channelFor(ticket.origin), createdAt, updatedAt,
        ],
      );
      ticketId = created[0].id;
      await tx.unsafe(
        "INSERT INTO movidesk_ticket_imports " +
        "(source_ticket_id, ticket_id, source_status, source_base_status, " +
        "source_protocol, source_last_update) " +
        "VALUES ($1, $2::uuid, $3, $4, $5, $6)",
        [id, ticketId, trimmed(ticket.status), ticket.baseStatus,
          trimmed(ticket.protocol) || null, updatedAt],
      );
      const event = {
        source: "movidesk",
        sourceTicketId: id,
        sourceClientId: personId(client),
        sourceClientEmail: trimmed(client.email) || null,
        sourceOwnerId: personId(ticket.owner),
        sourceStatus: trimmed(ticket.status),
        ownerHistories: list(ticket.ownerHistories),
        statusHistories: list(ticket.statusHistories),
        portalAccessApproved: false,
        attachmentsImported: false,
      };
      await tx.unsafe(
        "INSERT INTO ticket_events (ticket_id, event_type, metadata, created_at) " +
        "VALUES ($1::uuid, 'movidesk.ticket.imported', $2::jsonb, $3)",
        [ticketId, JSON.stringify(event), createdAt],
      );
      result = "created";
    }
    const actions = await importActions(tx, ticket, ticketId, client, contactId);
    return { id, ticketId, result, actions };
  });
}

async function main() {
  const options = parseOptions();
  const url = trimmed(process.env.DATABASE_URL);
  const token = trimmed(process.env.MOVIDESK_KB_API_TOKEN || process.env.MOVIDESK_API_TOKEN)
    .replace(/^Bearer\s+/i, "");
  if (!url || !token) throw new Error("DATABASE_URL_OR_MOVIDESK_TOKEN_MISSING");
  const db = postgres(url, { max: 1, prepare: false, connect_timeout: 10 });
  const api = new MovideskApi(token);
  try {
    const queue = await db.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION READ ONLY");
      const rows = await tx.unsafe(
        "SELECT id::text, active FROM support_queues WHERE code = $1",
        [options.queue],
      );
      const migration = await tx.unsafe(
        "SELECT to_regclass('public.movidesk_ticket_imports') IS NOT NULL AS ready",
      );
      if (!rows[0]?.active) throw new Error("QUEUE_NOT_FOUND_OR_INACTIVE");
      if (options.apply && !migration[0].ready) throw new Error("MIGRATION_0103_REQUIRED");
      return rows[0];
    });
    const references = await api.discover(options.limit);
    const results = [];
    for (const reference of references) {
      try {
        const ticket = object(await api.get(reference.path, { id: reference.id }));
        if (personId(ticket) !== reference.id) throw new Error("SOURCE_ID_MISMATCH");
        if (!OPEN_STATUSES.has(trimmed(ticket.baseStatus))) {
          results.push({ id: reference.id, result: "not_open" });
          continue;
        }
        if (options.apply) {
          results.push(await importTicket(db, ticket, queue.id));
        } else {
          results.push({
            id: reference.id,
            result: "preview",
            baseStatus: ticket.baseStatus,
            clients: list(ticket.clients).length,
            actions: list(ticket.actions).length,
          });
        }
      } catch (error) {
        results.push({
          id: reference.id,
          result: "failed",
          code: error instanceof Error ? error.message : "UNEXPECTED_ERROR",
        });
      }
    }
    console.log(JSON.stringify({
      mode: options.apply ? "apply" : "preview",
      discovered: references.length,
      requests: api.count,
      created: results.filter((row) => row.result === "created").length,
      updatedHistory: results.filter((row) => row.result === "history_updated").length,
      failed: results.filter((row) => row.result === "failed").length,
      results,
      notes: [
        "Historical customer contacts have no login email.",
        "All imported messages are internal in F10 pending portal access review.",
        "Original visibility and attachment metadata are preserved.",
        "Existing ticket statuses are not overwritten on re-import.",
        "Run this command again to append new Movidesk actions.",
      ],
    }, null, 2));
    if (results.some((row) => row.result === "failed")) process.exitCode = 2;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : "UNEXPECTED_ERROR");
  process.exitCode = 1;
});
