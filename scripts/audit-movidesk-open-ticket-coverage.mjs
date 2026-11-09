import postgres from "postgres";

const API_BASE = "https://api.movidesk.com/public/v1";
const ROUTES = ["/tickets", "/tickets/past"];
const REQUEST_DELAY_MS = 7000;
const OPEN_STATUSES = ["New", "InAttendance", "Stopped"];

function parseOptions(args) {
  const options = { maxPages: 1000, sampleLimit: null };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--sample-limit") {
      options.sampleLimit = Number(args[++index]);
    } else if (args[index] === "--max-pages") {
      options.maxPages = Number(args[++index]);
    } else {
      throw new Error("UNKNOWN_ARGUMENT");
    }
  }
  if (!Number.isSafeInteger(options.maxPages) || options.maxPages < 1 || options.maxPages > 1000) {
    throw new Error("INVALID_MAX_PAGES");
  }
  if (options.sampleLimit !== null &&
      (!Number.isSafeInteger(options.sampleLimit) || options.sampleLimit < 1 || options.sampleLimit > 10000)) {
    throw new Error("INVALID_SAMPLE_LIMIT");
  }
  return options;
}

function requiredEnvironment(name, fallback) {
  const value = (process.env[name] || (fallback && process.env[fallback]) || "").trim();
  if (!value) throw new Error(name + "_MISSING");
  return value.replace(/^Bearer\s+/i, "");
}

function tally(rows, key) {
  const counts = {};
  for (const row of rows) {
    const name = String(row[key] ?? "unknown");
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}

class MovideskClient {
  constructor(token) {
    this.token = token;
    this.nextAllowedAt = 0;
    this.requests = 0;
  }

  async list(path, skip) {
    const delay = Math.max(0, this.nextAllowedAt - Date.now());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    this.nextAllowedAt = Date.now() + REQUEST_DELAY_MS;

    const url = new URL(API_BASE + path);
    url.searchParams.set("token", this.token);
    url.searchParams.set("$select", "id,origin,baseStatus,lastUpdate");
    url.searchParams.set(
      "$filter",
      "baseStatus eq 'New' or baseStatus eq 'InAttendance' or baseStatus eq 'Stopped'",
    );
    url.searchParams.set("$orderby", "lastUpdate desc");
    url.searchParams.set("$top", "100");
    url.searchParams.set("$skip", String(skip));

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(45000),
    });
    this.requests += 1;
    if (!response.ok) {
      throw new Error("MOVIDESK_HTTP_" + response.status + "_ROUTE_" + path);
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length > 100) {
      throw new Error("INVALID_MOVIDESK_TICKET_LIST");
    }
    return rows;
  }

  async discover(options) {
    const tickets = new Map();
    const routes = [];
    let complete = true;

    for (const path of ROUTES) {
      let lastPageFull = false;
      let pages = 0;
      for (let page = 0; page < options.maxPages; page += 1) {
        const rows = await this.list(path, page * 100);
        pages += 1;
        for (const row of rows) {
          const id = row?.id == null ? "" : String(row.id);
          if (!/^\d+$/.test(id) || !OPEN_STATUSES.includes(row?.baseStatus)) continue;
          const previous = tickets.get(id);
          if (!previous || (previous.path === "/tickets/past" && path === "/tickets")) {
            tickets.set(id, {
              sourceTicketId: id,
              path,
              origin: row.origin ?? null,
              baseStatus: row.baseStatus,
              lastUpdate: row.lastUpdate ?? null,
            });
          }
        }

        lastPageFull = rows.length === 100;
        if (!lastPageFull || (options.sampleLimit && tickets.size >= options.sampleLimit)) break;
      }
      if (lastPageFull && pages === options.maxPages) complete = false;
      routes.push({ path, pages, lastPageFull });
      if (options.sampleLimit && tickets.size >= options.sampleLimit) {
        complete = false;
        break;
      }
    }

    return {
      tickets: [...tickets.values()].slice(0, options.sampleLimit ?? undefined),
      routes,
      complete,
    };
  }
}

async function loadDestination(db) {
  return db.begin(async (tx) => {
    await tx.unsafe("SET TRANSACTION READ ONLY");
    const imported = await tx.unsafe(
      "SELECT i.source_ticket_id, i.ticket_id::text, t.channel, " +
      "EXISTS (SELECT 1 FROM movidesk_chat_transcript_archives a " +
      "WHERE a.source_ticket_id = i.source_ticket_id) AS has_chat_archive " +
      "FROM movidesk_ticket_imports i JOIN tickets t ON t.id = i.ticket_id",
    );
    const [counts] = await tx.unsafe(
      "SELECT " +
      "(SELECT count(*)::integer FROM movidesk_ticket_action_imports) AS imported_actions, " +
      "(SELECT count(*)::integer FROM ticket_messages " +
      "WHERE external_message_id LIKE 'movidesk:chat:%') AS historical_chat_messages, " +
      "(SELECT count(*)::integer FROM ticket_messages " +
      "WHERE external_message_id LIKE 'movidesk:%' " +
      "AND body LIKE '%/movidesk-files/%') AS remaining_source_links, " +
      "(SELECT count(*)::integer FROM ticket_message_attachments a " +
      "JOIN ticket_messages m ON m.id = a.message_id " +
      "WHERE m.external_message_id LIKE 'movidesk:%') AS stored_attachments",
    );
    return { imported, counts };
  });
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const databaseUrl = requiredEnvironment("DATABASE_URL");
  const token = requiredEnvironment("MOVIDESK_KB_API_TOKEN", "MOVIDESK_API_TOKEN");
  const db = postgres(databaseUrl, {
    max: 1,
    prepare: false,
    connect_timeout: 10,
  });

  try {
    const source = await new MovideskClient(token).discover(options);
    const destination = await loadDestination(db);
    const imported = new Map(destination.imported.map((row) => [row.source_ticket_id, row]));
    const compared = source.tickets.map((ticket) => {
      const match = imported.get(ticket.sourceTicketId);
      return {
        ...ticket,
        state: !match
          ? Number(ticket.origin) === 5 ? "missing_chat" : "missing_ticket"
          : Number(ticket.origin) === 5 && !match.has_chat_archive
            ? "chat_not_reconstructed"
            : "imported",
        ticketId: match?.ticket_id ?? null,
      };
    });

    console.log(JSON.stringify({
      state: "audited",
      readOnly: true,
      sourceScope: "open_tickets_only",
      exhaustive: source.complete,
      sourceOpenTickets: compared.length,
      importedSourceMappings: imported.size,
      counts: tally(compared, "state"),
      byOrigin: tally(compared, "origin"),
      byStatus: tally(compared, "baseStatus"),
      destination: destination.counts,
      routes: source.routes,
      examplesRequiringWork: compared.filter((item) => item.state !== "imported").slice(0, 30),
      limitations: [
        "Closed Movidesk tickets are excluded from this audit.",
        "The source list does not include attachment details or message histories.",
        "A mapping is not proof that every message and attachment was imported.",
        "Any incomplete pagination or sampling sets exhaustive to false.",
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
