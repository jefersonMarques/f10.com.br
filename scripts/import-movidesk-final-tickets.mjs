import postgres from "postgres";

const API_BASE = "https://api.movidesk.com/public/v1";
const FINAL_STATUSES = new Set(["Resolved", "Closed"]);
const ROUTES = { current: "/tickets", past: "/tickets/past" };
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
  const options = { apply: false, limit: 25, offset: 0, status: "resolved", route: "past", queue: "support" };
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (key === "--apply") options.apply = true;
    else if (key === "--limit") options.limit = Number(args[++index]);
    else if (key === "--offset") options.offset = Number(args[++index]);
    else if (key === "--status") options.status = args[++index];
    else if (key === "--route") options.route = args[++index];
    else if (key === "--queue") options.queue = args[++index];
    else throw new Error("UNKNOWN_ARGUMENT");
  }
  if (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 100) {
    throw new Error("INVALID_LIMIT");
  }
  if (!Number.isSafeInteger(options.offset) || options.offset < 0 || options.offset > 1000000) {
    throw new Error("INVALID_OFFSET");
  }
  if (!["resolved", "closed"].includes(options.status)) throw new Error("INVALID_STATUS");
  if (!Object.hasOwn(ROUTES, options.route)) throw new Error("INVALID_ROUTE");
  if (!/^[a-z0-9_-]{1,64}$/.test(options.queue)) throw new Error("INVALID_QUEUE");
  return options;
}

function statusFor(baseStatus) {
  if (baseStatus === "Resolved") return "resolved";
  if (baseStatus === "Closed") return "closed";
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

  async discover(options) {
    const path = ROUTES[options.route];
    const baseStatus = options.status === "resolved" ? "Resolved" : "Closed";
    const response = await this.get(path, {
      $select: "id,baseStatus,lastUpdate,origin",
      $filter: "baseStatus eq '" + baseStatus + "'",
      $orderby: "lastUpdate desc,id desc",
      $top: options.limit,
      $skip: options.offset,
    });
    if (!Array.isArray(response) || response.length > options.limit) {
      throw new Error("INVALID_SOURCE_LIST");
    }
    const ids = new Set();
    return response.map((item) => {
      const ticket = object(item);
      const id = personId(ticket);
      if (!/^\\d+$/.test(id) || ticket.baseStatus !== baseStatus || ids.has(id)) {
        throw new Error("INVALID_SOURCE_PAGE");
      }
      ids.add(id);
      return { id, path, baseStatus, origin: ticket.origin };
    });
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

async function authorFor(tx, action, clients) {
  const person = object(action.createdBy);
  if ([1, 3].includes(Number(person.profileType))) {
    const userId = await uniqueAgent(tx, person);
    if (userId) return { authorType: "user", userId, contactId: null };
  }
  if (Number(person.profileType) === 2 || clients.some((client) =>
    personId(client) && personId(client) === personId(person))) {
    return {
      authorType: "customer",
      userId: null,
      contactId: await historicalContact(tx, person),
    };
  }
  return { authorType: "system", userId: null, contactId: null };
}

async function importActions(tx, ticket, ticketId, clients) {
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
    const author = await authorFor(tx, action, clients);
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

function activeClientPeople(ticket) {
  const unique = new Map();
  for (const source of list(ticket.clients)) {
    const person = object(source);
    const id = personId(person);
    if (id && person.isDeleted !== true && !unique.has(id)) {
      unique.set(id, person);
    }
  }
  for (const sourceAction of list(ticket.actions)) {
    const author = object(object(sourceAction).createdBy);
    const id = personId(author);
    if (id && Number(author.profileType) === 2 && !unique.has(id)) {
      unique.set(id, author);
    }
  }
  return [...unique.values()];
}

function primaryClient(ticket, clients) {
  const byId = new Map(clients.map((person) => [personId(person), person]));
  const creatorId = personId(ticket.createdBy);
  if (byId.has(creatorId)) return byId.get(creatorId);
  const orderedActions = list(ticket.actions)
    .filter((action) => object(action).isDeleted !== true)
    .sort((left, right) =>
      String(object(left).createdDate ?? "").localeCompare(String(object(right).createdDate ?? "")));
  for (const action of orderedActions) {
    const authorId = personId(object(action).createdBy);
    if (byId.has(authorId)) return byId.get(authorId);
  }
  return clients.length === 1 ? clients[0] : null;
}

async function insertParticipant(tx, ticketId, identity) {
  await tx.unsafe(
    "INSERT INTO ticket_participants " +
    "(ticket_id, participant_type, customer_contact_id, user_id, source_system, source_person_id) " +
    "VALUES ($1::uuid, $2, $3::uuid, $4::uuid, 'movidesk', $5) " +
    "ON CONFLICT DO NOTHING",
    [ticketId, identity.type, identity.contactId, identity.userId, identity.sourceId],
  );
}

async function importParticipants(tx, ticket, ticketId, clients) {
  let customerCount = 0;
  let operatorCount = 0;
  for (const client of clients) {
    const contactId = client ? await historicalContact(tx, client) : null;
    await insertParticipant(tx, ticketId, {
      type: "customer", contactId, userId: null, sourceId: personId(client),
    });
    customerCount += 1;
  }

  const agents = new Map();
  for (const person of [ticket.owner, ticket.createdBy,
    ...list(ticket.actions).map((action) => object(action).createdBy)]) {
    const agent = object(person);
    if ([1, 3].includes(Number(agent.profileType)) && personId(agent)) {
      agents.set(personId(agent), agent);
    }
  }
  for (const agent of agents.values()) {
    const userId = await uniqueAgent(tx, agent);
    if (!userId) continue;
    await insertParticipant(tx, ticketId, {
      type: "operator", contactId: null, userId, sourceId: personId(agent),
    });
    operatorCount += 1;
  }
  return { customerCount, operatorCount, unmatchedOperators: agents.size - operatorCount };
}

async function importTicket(db, ticket, queueId) {
  const id = personId(ticket);
  if (!FINAL_STATUSES.has(trimmed(ticket.baseStatus))) {
    return { id, result: "not_final", actions: 0 };
  }
  if (Number(ticket.origin) === 5) {
    return { id, result: "requires_chat_migration", actions: 0 };
  }
  const clients = activeClientPeople(ticket);
  if (clients.length === 0) {
    return { id, result: "requires_customer_review", actions: 0 };
  }
  const client = primaryClient(ticket, clients);
  const createdAt = safeDate(ticket.createdDate);
  if (!createdAt) throw new Error("INVALID_CREATED_DATE");
  return db.begin(async (tx) => {
    await tx.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", ["movidesk:" + id]);
    const existing = await tx.unsafe(
      "SELECT ticket_id::text FROM movidesk_ticket_imports WHERE source_ticket_id = $1",
      [id],
    );
    const contactId = client ? await historicalContact(tx, client) : null;
    let ticketId = existing[0]?.ticket_id;
    let result = "history_updated";
    if (!ticketId) {
      const ownerId = await uniqueAgent(tx, ticket.owner);
      const updatedAt = safeDate(ticket.lastUpdate, createdAt);
      const subject = trimmed(ticket.subject).slice(0, 350) || "Ticket Movidesk " + id;
      const created = await tx.unsafe(
        "INSERT INTO tickets (customer_contact_id, queue_id, assigned_user_id, " +
        "subject, status, priority, channel, created_at, updated_at, resolved_at, closed_at) " +
        "VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, 'normal', $6, $7, $8, $9, $10) RETURNING id::text",
        [
          contactId, queueId, ownerId, subject, statusFor(ticket.baseStatus),
          channelFor(ticket.origin), createdAt, updatedAt,
          safeDate(ticket.resolvedIn), safeDate(ticket.closedIn),
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
        sourceClientId: client ? personId(client) : null,
        sourceClientEmail: client ? trimmed(client.email) || null : null,
        sourceClientIds: clients.map(personId),
        primaryClientRequiresReview: !client,
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
    const participants = await importParticipants(tx, ticket, ticketId, clients);
    const actions = await importActions(tx, ticket, ticketId, clients);
    return { id, ticketId, result, actions, participants,
      primaryClientRequiresReview: !client };
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
      const participants = await tx.unsafe(
        "SELECT to_regclass('public.ticket_participants') IS NOT NULL AS ready",
      );
      if (options.apply && !participants[0].ready) throw new Error("MIGRATION_0106_REQUIRED");
      return rows[0];
    });
    const references = await api.discover(options);
    const results = [];
    for (const reference of references) {
      try {
        const ticket = object(await api.get(reference.path, { id: reference.id }));
        if (personId(ticket) !== reference.id) throw new Error("SOURCE_ID_MISMATCH");
        if (ticket.baseStatus !== reference.baseStatus) {
          results.push({ id: reference.id, result: "status_changed" });
          continue;
        }
        if (Number(ticket.origin) === 5) {
          results.push({ id: reference.id, result: "requires_chat_migration" });
          continue;
        }
        if (options.apply) {
          results.push(await importTicket(db, ticket, queue.id));
        } else {
          results.push({
            id: reference.id,
            result: "preview",
            baseStatus: ticket.baseStatus,
            clients: activeClientPeople(ticket).length,
            primaryClientId: personId(primaryClient(ticket, activeClientPeople(ticket))) || null,
            requiresPrimaryClientReview:
              primaryClient(ticket, activeClientPeople(ticket)) === null,
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
      route: options.route,
      status: options.status,
      offset: options.offset,
      limit: options.limit,
      nextOffset: options.offset + references.length,
      pageComplete: references.length < options.limit,
      discovered: references.length,
      requests: api.count,
      created: results.filter((row) => row.result === "created").length,
      updatedHistory: results.filter((row) => row.result === "history_updated").length,
      failed: results.filter((row) => row.result === "failed").length,
      chatsSkipped: results.filter((row) => row.result === "requires_chat_migration").length,
      results,
      notes: [
        "Multiple historical customer participants are preserved; uncertain primary contacts remain unassigned.",
        "Historical customer contacts have no login email.",
        "Messages remain internal until their original visibility is restored after portal authorization review.",
        "Original visibility and attachment metadata are preserved.",
        "Existing ticket statuses are not overwritten on re-import.",
        "Chat-origin tickets are excluded until a dedicated chat migration.",
        "Canceled tickets require a separate status mapping decision.",
        "Pagination offsets refer to each route/status independently; avoid changing the source while migrating.",
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
