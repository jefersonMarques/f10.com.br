import postgres from "postgres";

const SOURCE_ID = "25439";
const API_BASE = "https://api.movidesk.com/public/v1";
const PATHS = ["/tickets", "/tickets/past"];

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sourceId(value) {
  const id = record(value).id;
  return id == null ? null : String(id);
}

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clientSummary(value, position) {
  const client = record(value);
  return {
    position,
    id: sourceId(client),
    name: stringValue(client.name),
    businessName: stringValue(client.businessName),
    email: stringValue(client.email).toLowerCase(),
    profileType: client.profileType ?? null,
    isDeleted: client.isDeleted === true,
    organization: stringValue(client.organization),
  };
}

async function fetchTicket(token) {
  for (const path of PATHS) {
    const url = new URL(API_BASE + path);
    url.searchParams.set("token", token);
    url.searchParams.set("id", SOURCE_ID);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(30000),
    });
    if (response.status === 404) continue;
    if (!response.ok) throw new Error("MOVIDESK_HTTP_" + response.status);
    const ticket = record(await response.json());
    if (sourceId(ticket) !== SOURCE_ID) throw new Error("SOURCE_TICKET_ID_MISMATCH");
    return { ticket, path };
  }
  throw new Error("SOURCE_TICKET_NOT_FOUND");
}

async function inspectF10(db, clients) {
  const ids = clients.map((client) => client.id).filter(Boolean);
  const emails = clients.map((client) => client.email).filter(Boolean);
  const names = clients.flatMap((client) => [client.name, client.businessName]).filter(Boolean);
  return db.begin(async (tx) => {
    await tx.unsafe("SET TRANSACTION READ ONLY");

    const existingTicket = await tx.unsafe(
      "SELECT i.ticket_id::text AS ticket_id, t.ticket_number, " +
      "t.customer_contact_id::text AS customer_contact_id " +
      "FROM movidesk_ticket_imports i JOIN tickets t ON t.id = i.ticket_id " +
      "WHERE i.source_ticket_id = $1",
      [SOURCE_ID],
    );
    const contacts = await tx.unsafe(
      "SELECT id::text, name, email, import_source_id " +
      "FROM customer_contacts WHERE (import_source = 'movidesk' " +
      "AND import_source_id = ANY($1::text[])) " +
      "OR lower(email) = ANY($2::text[])",
      [ids, emails],
    );
    const units = await tx.unsafe(
      "SELECT u.id::text, u.source_id, u.name AS unit_name, " +
      "o.name AS organization_name, g.name AS group_name, " +
      "g.source_group_id, u.source_system " +
      "FROM customer_units u " +
      "JOIN customer_organizations o ON o.id = u.organization_id " +
      "LEFT JOIN customer_groups g ON g.id = u.group_id " +
      "WHERE lower(u.name) = ANY($1::text[]) " +
      "OR lower(o.name) = ANY($1::text[]) " +
      "OR lower(g.name) = ANY($1::text[]) " +
      "LIMIT 30",
      [names.map((name) => name.toLowerCase())],
    );
    return { existingTicket, contacts, units };
  });
}

async function main() {
  if (process.argv.length > 2) throw new Error("UNKNOWN_ARGUMENT");
  const token = (process.env.MOVIDESK_KB_API_TOKEN ||
    process.env.MOVIDESK_API_TOKEN || "").trim().replace(/^Bearer\s+/i, "");
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!token || !databaseUrl) throw new Error("ENVIRONMENT_NOT_CONFIGURED");

  const { ticket, path } = await fetchTicket(token);
  const allClients = Array.isArray(ticket.clients) ? ticket.clients : [];
  const clients = allClients.map(clientSummary);
  const db = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const f10 = await inspectF10(db, clients);
    console.log(JSON.stringify({
      readOnly: true,
      sourceTicketId: SOURCE_ID,
      path,
      subject: stringValue(ticket.subject),
      baseStatus: stringValue(ticket.baseStatus),
      origin: ticket.origin ?? null,
      clientsTotal: clients.length,
      activeClients: clients.filter((client) => !client.isDeleted).length,
      clients,
      f10: {
        existingTicket: f10.existingTicket,
        matchingContacts: f10.contacts,
        exactNameCommercialCandidates: f10.units,
      },
      decision: "manual_review_required",
      notes: [
        "Multiple Movidesk clients do not establish a head-office/branch relationship.",
        "Exact name and email matches are candidates only, not identity proof.",
        "No ticket, customer, organization or portal visibility was modified.",
      ],
    }, null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
