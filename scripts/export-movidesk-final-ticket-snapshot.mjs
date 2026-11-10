import { appendFileSync, chmodSync, closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const API_BASE = "https://api.movidesk.com/public/v1";
const ROUTES = ["/tickets", "/tickets/past"];
const STATUSES = ["Resolved", "Closed", "Canceled"];
const PAGE_SIZE = 100;
const WAIT_MS = 7000;

function options() {
  const args = process.argv.slice(2);
  let directory = "/var/lib/f10/movidesk-final-snapshot";
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--directory") directory = args[++i];
    else throw new Error("UNKNOWN_ARGUMENT");
  }
  if (!directory?.startsWith("/")) throw new Error("ABSOLUTE_DIRECTORY_REQUIRED");
  return { directory: resolve(directory) };
}

function saveAtomic(path, data) {
  const temporary = path + ".tmp";
  writeFileSync(temporary, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  chmodSync(temporary, 0o600);
  renameSync(temporary, path);
}

function readExported(path) {
  if (!existsSync(path)) return new Set();
  const data = readFileSync(path, "utf8");
  if (data && !data.endsWith("\n")) throw new Error("TRUNCATED_EXPORT");
  const ids = new Set();
  for (const line of data.split("\n")) {
    if (!line) continue;
    const record = JSON.parse(line);
    const id = String(record.sourceId);
    if (!/^\d+$/.test(id) || String(record.ticket?.id) !== id || ids.has(id)) {
      throw new Error("INVALID_EXPORT_RECORD");
    }
    ids.add(id);
  }
  return ids;
}

class MovideskApi {
  constructor(token) {
    this.token = token;
    this.nextAllowedAt = 0;
    this.requests = 0;
  }

  async get(route, params) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wait = Math.max(0, this.nextAllowedAt - Date.now());
      if (wait) await new Promise((done) => setTimeout(done, wait));
      this.nextAllowedAt = Date.now() + WAIT_MS;
      const url = new URL(API_BASE + route);
      url.searchParams.set("token", this.token);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
      let response;
      try {
        response = await fetch(url, {
          headers: { Accept: "application/json" },
          redirect: "error",
          signal: AbortSignal.timeout(45000),
        });
      } catch (error) {
        if (attempt === 4) throw error;
        this.nextAllowedAt = Date.now() + 30000 * (attempt + 1);
        continue;
      }
      this.requests += 1;
      if (response.ok) return response.json();
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 4) {
        throw new Error("MOVIDESK_HTTP_" + response.status);
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      this.nextAllowedAt = Date.now() + (
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 300000)
          : 30000 * (attempt + 1)
      );
    }
    throw new Error("RETRY_EXHAUSTED");
  }
}

function validateDiscoveryCheckpoint(checkpoint) {
  const cursor = checkpoint?.cursor;
  if (checkpoint?.version !== 1 ||
      !Array.isArray(checkpoint.tickets) ||
      !Array.isArray(checkpoint.coverage) ||
      !Number.isSafeInteger(cursor?.routeIndex) ||
      !Number.isSafeInteger(cursor?.statusIndex) ||
      !Number.isSafeInteger(cursor?.page) ||
      !Number.isSafeInteger(cursor?.rows) ||
      cursor.routeIndex < 0 || cursor.routeIndex > ROUTES.length ||
      cursor.statusIndex < 0 || cursor.statusIndex >= STATUSES.length ||
      cursor.page < 0 || cursor.page > 1000 || cursor.rows < 0) {
    throw new Error("INVALID_DISCOVERY_CHECKPOINT");
  }

  const ids = new Set();
  for (const reference of checkpoint.tickets) {
    const id = String(reference?.sourceId ?? "");
    if (!/^\d+$/.test(id) || ids.has(id) ||
        !ROUTES.includes(reference.route) ||
        !STATUSES.includes(reference.status)) {
      throw new Error("INVALID_DISCOVERY_CHECKPOINT_RECORD");
    }
    ids.add(id);
  }
}

async function discover(api, checkpointPath) {
  const checkpoint = existsSync(checkpointPath)
    ? JSON.parse(readFileSync(checkpointPath, "utf8"))
    : {
        version: 1,
        createdAt: new Date().toISOString(),
        coverage: [],
        tickets: [],
        cursor: { routeIndex: 0, statusIndex: 0, page: 0, rows: 0 },
      };
  validateDiscoveryCheckpoint(checkpoint);

  const unique = new Map(checkpoint.tickets.map((ticket) => [ticket.sourceId, ticket]));
  while (checkpoint.cursor.routeIndex < ROUTES.length) {
    const cursor = checkpoint.cursor;
    const route = ROUTES[cursor.routeIndex];
    const status = STATUSES[cursor.statusIndex];
    if (cursor.page >= 1000) throw new Error("PAGINATION_LIMIT_REACHED");

    const rows = await api.get(route, {
      $select: "id,baseStatus,lastUpdate,origin",
      $filter: "baseStatus eq '" + status + "'",
      $orderby: "lastUpdate desc,id desc",
      $top: PAGE_SIZE,
      $skip: cursor.page * PAGE_SIZE,
    });
    if (!Array.isArray(rows) || rows.length > PAGE_SIZE) {
      throw new Error("INVALID_SOURCE_LIST");
    }

    for (const row of rows) {
      const id = String(row?.id ?? "");
      if (!/^\d+$/.test(id) || row.baseStatus !== status) {
        throw new Error("INVALID_SOURCE_ROW");
      }
      if (!unique.has(id)) {
        unique.set(id, { sourceId: id, route, status, origin: row.origin });
      }
    }

    cursor.rows += rows.length;
    const completed = rows.length < PAGE_SIZE;
    const completedPages = cursor.page + 1;
    if (completed) {
      checkpoint.coverage.push({ route, status, rows: cursor.rows, complete: true });
      cursor.page = 0;
      cursor.rows = 0;
      cursor.statusIndex += 1;
      if (cursor.statusIndex === STATUSES.length) {
        cursor.statusIndex = 0;
        cursor.routeIndex += 1;
      }
    } else {
      cursor.page += 1;
    }

    checkpoint.tickets = [...unique.values()];
    checkpoint.updatedAt = new Date().toISOString();
    saveAtomic(checkpointPath, checkpoint);

    if (completed || completedPages % 10 === 0) {
      console.log(JSON.stringify({
        phase: "discovery",
        route,
        status,
        pages: completedPages,
        rows: completed ? checkpoint.coverage.at(-1).rows : cursor.rows,
        complete: completed,
        unique: unique.size,
      }));
    }
  }

  return {
    version: 1,
    createdAt: checkpoint.createdAt,
    completedAt: new Date().toISOString(),
    coverage: checkpoint.coverage,
    tickets: checkpoint.tickets,
  };
}

async function main() {
  const { directory } = options();
  const token = (process.env.MOVIDESK_KB_API_TOKEN || process.env.MOVIDESK_API_TOKEN || "")
    .trim().replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("MOVIDESK_TOKEN_MISSING");
  process.umask(0o077);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const inventoryPath = directory + "/inventory.json";
  const checkpointPath = directory + "/discovery-checkpoint.json";
  const snapshotPath = directory + "/tickets.jsonl";
  const summaryPath = directory + "/summary.json";
  const api = new MovideskApi(token);
  const inventory = existsSync(inventoryPath)
    ? JSON.parse(readFileSync(inventoryPath, "utf8"))
    : await discover(api, checkpointPath);
  if (!existsSync(inventoryPath)) saveAtomic(inventoryPath, inventory);
  if (inventory.version !== 1 || !Array.isArray(inventory.tickets)) throw new Error("INVALID_INVENTORY");
  const done = readExported(snapshotPath);
  const all = new Set(inventory.tickets.map((item) => String(item.sourceId)));
  if ([...done].some((id) => !all.has(id))) throw new Error("SNAPSHOT_INVENTORY_MISMATCH");
  const fd = openSync(snapshotPath, "a", 0o600);
  chmodSync(snapshotPath, 0o600);
  let exported = done.size;
  try {
    for (const reference of inventory.tickets) {
      if (done.has(reference.sourceId)) continue;
      const ticket = await api.get(reference.route, { id: reference.sourceId });
      if (String(ticket?.id) !== reference.sourceId || !STATUSES.includes(ticket.baseStatus)) {
        throw new Error("INVALID_TICKET_DETAIL_" + reference.sourceId);
      }
      appendFileSync(fd, JSON.stringify({
        sourceId: reference.sourceId,
        sourceRoute: reference.route,
        capturedAt: new Date().toISOString(),
        ticket,
      }) + "\n");
      fsyncSync(fd);
      done.add(reference.sourceId);
      exported += 1;
      if (exported % 25 === 0) {
        console.log(JSON.stringify({ phase: "export", exported, total: inventory.tickets.length, requests: api.requests }));
      }
    }
  } finally {
    closeSync(fd);
    saveAtomic(summaryPath, {
      state: exported === inventory.tickets.length ? "completed" : "interrupted",
      exported, total: inventory.tickets.length, requests: api.requests,
      inventoryCreatedAt: inventory.createdAt, updatedAt: new Date().toISOString(),
    });
  }
  console.log(JSON.stringify({ state: "completed", exported, total: inventory.tickets.length, directory }));
}

main().catch((error) => {
  console.error("EXPORT_ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
