import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

export const FINAL_STATUSES = new Set(["Resolved", "Closed", "Canceled"]);
const CHAT_LINE = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})\s*-\s*([^:]*):\s*(.*)$/;
const HEADER_TIME = /^(Fuso horário:[^\n]*?)(?=\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*-)/i;
const ISO_LOCAL_OFFSET = "-03:00";

export function contactName(person) {
  const source = person && typeof person === "object" && !Array.isArray(person)
    ? person : {};
  for (const candidate of [source.businessName, source.name]) {
    if (typeof candidate !== "string") continue;
    const name = candidate.replace(/\u0000/g, "").trim();
    if (name) return name;
  }
  const id = source.id == null ? "" : String(source.id).replace(/\u0000/g, "").trim();
  return id ? `Movidesk contact ${id}` : "Movidesk contact";
}

export function parseSnapshotDate(value, fallback = null) {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const text = value.trim();
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(text)
    ? text + "Z"
    : text;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

export function mapSnapshotStatus(value) {
  switch (value) {
    case "Resolved": return "resolved";
    case "Closed":
    case "Canceled": return "closed";
    default: throw new Error("UNSUPPORTED_SNAPSHOT_STATUS");
  }
}

export function mapSnapshotChannel(origin) {
  if (Number(origin) === 5) return "web_chat";
  if ([3, 7].includes(Number(origin))) return "email";
  if ([18, 23].includes(Number(origin))) return "whatsapp";
  return "manual";
}

export function parseSnapshotOptions(argv) {
  const options = {
    directory: "/var/lib/f10/movidesk-final-snapshot",
    apply: false,
    all: false,
    offset: 0,
    limit: null,
    queue: "support",
    progressEvery: 25,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--apply") options.apply = true;
    else if (argument === "--all") options.all = true;
    else if (argument === "--directory") options.directory = argv[++index];
    else if (argument === "--offset") options.offset = Number(argv[++index]);
    else if (argument === "--limit") options.limit = Number(argv[++index]);
    else if (argument === "--queue") options.queue = argv[++index];
    else if (argument === "--progress-every") options.progressEvery = Number(argv[++index]);
    else throw new Error("UNKNOWN_ARGUMENT");
  }
  if (!options.directory?.startsWith("/") ||
    !/^[a-z0-9_-]{1,64}$/.test(options.queue ?? "") ||
    !Number.isSafeInteger(options.offset) || options.offset < 0 ||
    !Number.isSafeInteger(options.progressEvery) || options.progressEvery < 1 ||
    (options.limit !== null &&
      (!Number.isSafeInteger(options.limit) || options.limit < 1 || options.limit > 1000000)) ||
    (options.all && (options.limit !== null || options.offset !== 0))) {
    throw new Error("INVALID_ARGUMENTS");
  }
  if (options.apply && !options.all && options.limit === null) {
    throw new Error("APPLY_REQUIRES_ALL_OR_LIMIT");
  }
  if (!options.apply && options.all) {
    throw new Error("ALL_REQUIRES_APPLY");
  }
  return options;
}

function parseChatDate(match) {
  const [, day, month, year, hour, minute] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00${ISO_LOCAL_OFFSET}`);
  if (Number.isNaN(date.getTime()) ||
    date.getUTCDate() < 1 ||
    Number(day) < 1 || Number(day) > 31 ||
    Number(month) < 1 || Number(month) > 12 ||
    Number(hour) > 23 || Number(minute) > 59) {
    throw new Error("INVALID_CHAT_DATE");
  }
  return date;
}

export function splitMovideskChatTranscript(source) {
  if (typeof source !== "string" || !source.trim()) return null;
  const prepared = source.replace(/\r\n?/g, "\n").replace(HEADER_TIME, "$1\n");
  const messages = [];
  const leading = [];
  let current = null;

  for (const line of prepared.split("\n")) {
    const match = line.match(CHAT_LINE);
    if (match) {
      if (current && current.body.trim()) messages.push(current);
      let createdAt;
      try {
        createdAt = parseChatDate(match);
      } catch {
        return null;
      }
      current = {
        createdAt,
        authorName: match[6].trim(),
        body: match[7],
      };
    } else if (current) {
      current.body += "\n" + line;
    } else if (line.trim()) {
      leading.push(line.trim());
    }
  }
  if (current && current.body.trim()) messages.push(current);
  if (leading.some((line) => !/^Fuso horário:/i.test(line))) return null;
  if (!messages.length) return null;
  return messages.map((message) => ({ ...message, body: message.body.trim() }));
}

export function validateSnapshotRecord(record, inventory) {
  const sourceId = String(record?.sourceId ?? "");
  if (!/^\d+$/.test(sourceId) || String(record?.ticket?.id ?? "") !== sourceId) {
    throw new Error("INVALID_SOURCE_TICKET_ID");
  }
  const expected = inventory.get(sourceId);
  if (!expected || expected.route !== record.sourceRoute ||
    expected.status !== record.ticket.baseStatus ||
    !FINAL_STATUSES.has(record.ticket.baseStatus)) {
    throw new Error("SNAPSHOT_INVENTORY_MISMATCH");
  }
  if (!Array.isArray(record.ticket.actions)) {
    throw new Error("SNAPSHOT_ACTIONS_NOT_ARRAY");
  }
  return sourceId;
}

export async function* iterateSnapshotLines(filePath) {
  const stream = createReadStream(filePath, { encoding: "utf8", highWaterMark: 256 * 1024 });
  const reader = createInterface({ input: stream, crlfDelay: Infinity });
  let lineNumber = 0;
  try {
    for await (const line of reader) {
      lineNumber += 1;
      if (!line.trim()) throw new Error(`EMPTY_SNAPSHOT_LINE_${lineNumber}`);
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        throw new Error(`INVALID_SNAPSHOT_JSON_LINE_${lineNumber}`);
      }
      yield { lineNumber, record };
    }
  } finally {
    reader.close();
    stream.destroy();
  }
}
