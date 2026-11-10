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

async function discover(api) {
  const unique = new Map();
  const coverage = [];
  for (const route of ROUTES) {
    for (const status of STATUSES) {
      let complete = false;
      let count = 0;
      for (let page = 0; page < 1000; page += 1) {
        const rows = await api.get(route, {
          $select: "id,baseStatus,lastUpdate,origin",
          $filter: "baseStatus eq '" + status + "'",
          $orderby: "lastUpdate desc,id desc",
          $top: PAGE_SIZE,
          $skip: page * PAGE_SIZE,
        });
        if (!Array.isArray(rows) || rows.length > PAGE_SIZE) throw new Error("INVALID_SOURCE_LIST");
        for (const row of rows) {
          const id = String(row?.id ?? "");
          if (!/^\d+$/.test(id) || row.baseStatus !== status) throw new Error("INVALID_SOURCE_ROW");
          if (!unique.has(id)) unique.set(id, { sourceId: id, route, status, origin: row.origin });
        }
        count += rows.length;
        if (rows.length < PAGE_SIZE) {
          complete = true;
          break;
        }
        if ((page + 1) % 10 === 0) {
          console.log(JSON.stringify({ phase: "discovery", route, status, pages: page + 1, rows: count }));
        }
      }
      coverage.push({ route, status, rows: count, complete });
      console.log(JSON.stringify({ phase: "discovery", route, status, rows: count, complete, unique: unique.size }));
      if (!complete) throw new Error("PAGINATION_LIMIT_REACHED");
    }
  }
  return { version: 1, createdAt: new Date().toISOString(), coverage, tickets: [...unique.values()] };
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
  const snapshotPath = directory + "/tickets.jsonl";
  const summaryPath = directory + "/summary.json";
  const api = new MovideskApi(token);
  const inventory = existsSync(inventoryPath)
    ? JSON.parse(readFileSync(inventoryPath, "utf8"))
    : await discover(api);
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
