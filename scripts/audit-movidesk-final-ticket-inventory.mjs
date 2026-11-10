import postgres from "postgres";

const API_BASE = "https://api.movidesk.com/public/v1";
const ROUTES = ["/tickets", "/tickets/past"];
const STATUSES = ["Resolved", "Closed", "Canceled"];
const PAGE_SIZE = 100;
const WAIT_MS = 7000;

function parseOptions(args) {
  const options = { pages: 1 };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--pages") options.pages = Number(args[++index]);
    else throw new Error("UNKNOWN_ARGUMENT");
  }
  if (!Number.isSafeInteger(options.pages) || options.pages < 1 || options.pages > 1000) {
    throw new Error("INVALID_PAGE_COUNT");
  }
  return options;
}

class MovideskApi {
  constructor(token) {
    this.token = token;
    this.nextAllowedAt = 0;
    this.requests = 0;
  }

  async list(route, status, offset) {
    const wait = Math.max(0, this.nextAllowedAt - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    this.nextAllowedAt = Date.now() + WAIT_MS;

    const url = new URL(API_BASE + route);
    url.searchParams.set("token", this.token);
    url.searchParams.set("$select", "id,baseStatus,lastUpdate,origin");
    url.searchParams.set("$filter", "baseStatus eq '" + status + "'");
    url.searchParams.set("$orderby", "lastUpdate desc,id desc");
    url.searchParams.set("$top", String(PAGE_SIZE));
    url.searchParams.set("$skip", String(offset));

    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(45000),
    });
    this.requests += 1;
    if (!response.ok) {
      throw new Error("MOVIDESK_HTTP_" + response.status +
        "_RETRY_AFTER_" + (response.headers.get("retry-after") ?? "unknown"));
    }

    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length > PAGE_SIZE) {
      throw new Error("INVALID_SOURCE_LIST");
    }
    for (const row of rows) {
      if (!/^\\d+$/.test(String(row?.id ?? "")) || row?.baseStatus !== status) {
        throw new Error("INVALID_SOURCE_ROW");
      }
    }
    return rows;
  }
}

async function inspect(db, sourceIds) {
  return db.begin(async (tx) => {
    await tx.unsafe("SET TRANSACTION READ ONLY");
    if (sourceIds.length === 0) return [];
    return tx.unsafe(
      "SELECT source_ticket_id FROM movidesk_ticket_imports " +
      "WHERE source_ticket_id = ANY($1::text[])",
      [sourceIds],
    );
  });
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const token = (
    process.env.MOVIDESK_KB_API_TOKEN || process.env.MOVIDESK_API_TOKEN || ""
  ).trim().replace(/^Bearer\\s+/i, "");
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!token || !databaseUrl) throw new Error("ENVIRONMENT_NOT_CONFIGURED");

  const api = new MovideskApi(token);
  const db = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10 });
  const source = new Map();
  const coverage = [];
  try {
    for (const route of ROUTES) {
      for (const status of STATUSES) {
        let complete = false;
        let pagesScanned = 0;
        let rowsScanned = 0;
        let chatCount = 0;

        for (let page = 0; page < options.pages; page += 1) {
          const rows = await api.list(route, status, page * PAGE_SIZE);
          pagesScanned += 1;
          rowsScanned += rows.length;
          for (const row of rows) {
            const id = String(row.id);
            if (Number(row.origin) === 5) chatCount += 1;
            if (!source.has(id)) {
              source.set(id, { status, origin: row.origin, route });
            }
          }
          if (rows.length < PAGE_SIZE) {
            complete = true;
            break;
          }
        }
        coverage.push({
          route,
          status,
          pagesScanned,
          rowsScanned,
          chatCount,
          complete,
          nextOffset: rowsScanned,
        });
      }
    }

    const mapped = new Set(
      (await inspect(db, [...source.keys()])).map((row) => row.source_ticket_id),
    );
    const totals = {};
    for (const status of STATUSES) {
      const records = [...source.entries()].filter(([, value]) => value.status === status);
      totals[status] = {
        discovered: records.length,
        alreadyMapped: records.filter(([id]) => mapped.has(id)).length,
        chatOrigin: records.filter(([, value]) => Number(value.origin) === 5).length,
      };
    }
    console.log(JSON.stringify({
      state: "inventory",
      readOnly: true,
      exhaustive: coverage.every((item) => item.complete),
      requests: api.requests,
      uniqueTickets: source.size,
      totals,
      coverage,
      notes: [
        "Incomplete pagination is a partial inventory, not a total count.",
        "The source can change between scans, so use repeated bounded batches.",
        "Canceled tickets require a separately approved F10 status mapping.",
        "Chat-origin tickets require a dedicated migration.",
        "No source tickets or database records were modified.",
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
