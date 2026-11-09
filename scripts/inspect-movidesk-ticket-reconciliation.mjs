import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const API_BASE = "https://api.movidesk.com/public/v1";
const SAMPLE_PATH = "f10-movidesk-pilot-report.json";
const REPORT_PATH = "f10-movidesk-reconciliation-report.json";
const SAMPLE_SIZE = 10;
const REQUEST_INTERVAL_MS = 7000;
const ALLOWED_ROUTES = new Set(["/tickets", "/tickets/past"]);

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function normalizedEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function personId(person) {
  const value = object(person).id;
  return value === undefined || value === null ? "" : String(value);
}

function requiredEnvironment(name, alternate) {
  const value = (process.env[name] || (alternate && process.env[alternate]) || "").trim();
  if (!value) throw new Error(name + "_MISSING");
  return value;
}

function matchContact(person, contacts) {
  const id = personId(person);
  const email = normalizedEmail(object(person).email);
  const identities = id
    ? contacts.filter((row) => row.import_source === "movidesk" && row.import_source_id === id)
    : [];

  if (identities.length > 1) return { result: "ambiguous_source_id", requiresReview: true };
  if (identities.length === 1) {
    return { result: "source_id_match", contactId: identities[0].id, requiresReview: false };
  }
  if (!email) return { result: "missing_email", requiresReview: true };

  const candidates = contacts.filter((row) => normalizedEmail(row.email) === email);
  if (candidates.length > 1) return { result: "ambiguous_email", requiresReview: true };
  if (candidates.length === 1) {
    return { result: "email_candidate", contactId: candidates[0].id, requiresReview: true };
  }
  return { result: "new_contact_candidate", requiresReview: true };
}

function matchAgent(person, users) {
  const email = normalizedEmail(object(person).email);
  if (!email) return { result: "missing_email" };
  const matches = users.filter((row) => normalizedEmail(row.email) === email);
  if (matches.length > 1) return { result: "ambiguous_email" };
  if (matches.length === 0) return { result: "not_found" };
  return {
    result: matches[0].status === "active" ? "active_user_match" : "inactive_user_match",
    userId: matches[0].id,
  };
}

function summarize(ticket, route, db) {
  const clients = list(ticket.clients);
  const actions = list(ticket.actions);
  const customerMatches = clients.map((person) => ({
    sourceId: personId(person) || null,
    ...matchContact(person, db.contacts),
  }));

  const confirmedCustomer = clients.length === 1
    && customerMatches[0].result === "source_id_match";

  return {
    sourceTicketId: String(ticket.id),
    sourceRoute: route,
    sourceIdentity: "movidesk:" + String(ticket.id),
    clientCount: clients.length,
    customerMatches,
    customerReviewRequired: !confirmedCustomer,
    owner: {
      sourceId: personId(ticket.owner) || null,
      ...matchAgent(ticket.owner, db.users),
    },
    actionAuthors: actions.map((action) => ({
      actionId: action.id ?? null,
      ...matchAgent(action.createdBy, db.users),
    })),
    actionCount: actions.length,
    actionTypes: [...new Set(actions.map((action) => String(action.type)))].sort(),
    ownerHistoryCount: list(ticket.ownerHistories).length,
    statusHistoryCount: list(ticket.statusHistories).length,
    attachmentMetadataCount: actions.reduce(
      (sum, action) => sum + list(action.attachments).length,
      0,
    ),
    nativeTicketNumberCollisionCount: db.ticketNumbers.filter(
      (number) => String(number) === String(ticket.id),
    ).length,
    unitMatch: "not_verified",
    actionVisibility: "unverified",
    accessDecision: "blocked_until_identity_and_visibility_review",
  };
}

async function readDatabase() {
  const connection = requiredEnvironment("DATABASE_URL");
  const sql = postgres(connection, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    return await sql.begin(async (transaction) => {
      await transaction.unsafe("SET TRANSACTION READ ONLY");
      const columns = await transaction.unsafe(
        "SELECT column_name FROM information_schema.columns " +
        "WHERE table_schema = current_schema() AND table_name = 'customer_contacts'",
      );
      const hasSourceIdentity = ["import_source", "import_source_id"].every(
        (name) => columns.some((column) => column.column_name === name),
      );
      const contacts = await transaction.unsafe(
        hasSourceIdentity
          ? "SELECT id::text AS id, email, import_source, import_source_id FROM customer_contacts"
          : "SELECT id::text AS id, email, NULL::text AS import_source, " +
            "NULL::text AS import_source_id FROM customer_contacts",
      );
      const users = await transaction.unsafe(
        "SELECT id::text AS id, email, status FROM users",
      );
      const ticketRows = await transaction.unsafe(
        "SELECT ticket_number FROM tickets",
      );
      return {
        contacts,
        users,
        ticketNumbers: ticketRows.map((row) => row.ticket_number),
        sourceIdentityAvailable: hasSourceIdentity,
      };
    });
  } finally {
    await sql.end();
  }
}

async function readSample() {
  const pilot = JSON.parse(await readFile(resolve(SAMPLE_PATH), "utf8"));
  if (pilot.reportType !== "movidesk_ticket_readonly_pilot" || pilot.readOnly !== true) {
    throw new Error("INVALID_PILOT_REPORT");
  }
  const tickets = list(pilot.tickets);
  if (tickets.length !== SAMPLE_SIZE) throw new Error("INVALID_SAMPLE_SIZE");
  const ids = new Set();
  return tickets.map((ticket) => {
    const id = String(ticket.sourceTicketId);
    const route = ticket.sourceRoute;
    if (!/^\d+$/.test(id) || !ALLOWED_ROUTES.has(route) || ids.has(id)) {
      throw new Error("INVALID_SAMPLE_REFERENCE");
    }
    ids.add(id);
    return { id, route };
  });
}

async function fetchTicket(reference, token) {
  const url = new URL(API_BASE + reference.route);
  url.searchParams.set("token", token);
  url.searchParams.set("id", reference.id);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("MOVIDESK_HTTP_" + response.status);
  const ticket = await response.json();
  if (String(object(ticket).id) !== reference.id) {
    throw new Error("SOURCE_TICKET_ID_MISMATCH");
  }
  return ticket;
}

function countBy(items, property) {
  const result = {};
  for (const item of items) {
    const key = String(item[property]);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

async function main() {
  const references = await readSample();
  const database = await readDatabase();
  const token = requiredEnvironment("MOVIDESK_KB_API_TOKEN", "MOVIDESK_API_TOKEN")
    .replace(/^Bearer\s+/i, "");
  const tickets = [];
  const errors = [];

  for (const [index, reference] of references.entries()) {
    if (index > 0) {
      await new Promise((done) => setTimeout(done, REQUEST_INTERVAL_MS));
    }
    try {
      const source = await fetchTicket(reference, token);
      tickets.push(summarize(source, reference.route, database));
    } catch (error) {
      errors.push({
        sourceTicketId: reference.id,
        code: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      });
    }
  }

  const customers = tickets.flatMap((ticket) => ticket.customerMatches);
  const owners = tickets.map((ticket) => ticket.owner);
  const authors = tickets.flatMap((ticket) => ticket.actionAuthors);
  const summary = {
    customerMatches: countBy(customers, "result"),
    ownerMatches: countBy(owners, "result"),
    actionAuthorMatches: countBy(authors, "result"),
    ticketsRequiringCustomerReview: tickets.filter((ticket) => ticket.customerReviewRequired).length,
    ticketsBlockedFromCustomerVisibility: tickets.length,
    actionsWithUnverifiedVisibility: tickets.reduce((sum, ticket) => sum + ticket.actionCount, 0),
    attachmentMetadataOnly: tickets.reduce((sum, ticket) => sum + ticket.attachmentMetadataCount, 0),
    nativeTicketNumberCollisions: tickets.reduce(
      (sum, ticket) => sum + ticket.nativeTicketNumberCollisionCount,
      0,
    ),
  };
  const report = {
    reportType: "movidesk_f10_reconciliation_readonly",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    sourceTicketCount: references.length,
    analyzedTickets: tickets.length,
    sourceIdentityAvailable: database.sourceIdentityAvailable,
    summary,
    tickets,
    errors,
    limitations: [
      "Email matching does not grant customer portal or chat access.",
      "Message visibility and Movidesk action types are not yet verified.",
      "Commercial unit ownership must be verified independently.",
      "Ticket number collisions are not proof of duplicated imported tickets.",
      "Attachments and historic chat downloads have not been validated.",
    ],
  };

  const path = resolve(REPORT_PATH);
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", {
    mode: 0o600,
    flag: "wx",
  });
  console.log(JSON.stringify({
    report: path,
    readOnly: true,
    analyzedTickets: tickets.length,
    summary,
    errors,
  }, null, 2));
  if (errors.length > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
