import { createReadStream } from "node:fs";
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type RegistrationFileRecord = {
  token: string;
  originalName: string;
  storedName: string;
  relativePath: string;
  absolutePath: string;
  mimeType: string;
  size: number;
  docType: string;
  createdAt: string;
  expiresAt: string;
  downloads: number;
  maxDownloads: number;
};

type RegistrationFileDatabase = Record<string, RegistrationFileRecord>;

const projectRoot = process.cwd();

const dataDir = path.join(projectRoot, "data");
const uploadsDir = path.join(dataDir, "uploads", "registration");
const databasePath = path.join(dataDir, "registration-files.json");

export async function ensureRegistrationStorage() {
  await mkdir(uploadsDir, { recursive: true });

  try {
    await stat(databasePath);
  } catch {
    await writeFile(databasePath, "{}", "utf-8");
  }
}

export function createSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function sanitizeFileName(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext);

  const safeBase =
    base
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "arquivo";

  return `${safeBase}${ext}`;
}

export async function readRegistrationFileDatabase(): Promise<RegistrationFileDatabase> {
  await ensureRegistrationStorage();

  const raw = await readFile(databasePath, "utf-8");

  try {
    return JSON.parse(raw) as RegistrationFileDatabase;
  } catch {
    return {};
  }
}

export async function writeRegistrationFileDatabase(
  database: RegistrationFileDatabase,
) {
  await ensureRegistrationStorage();

  const temporaryPath = `${databasePath}.tmp`;

  await writeFile(
    temporaryPath,
    JSON.stringify(database, null, 2),
    "utf-8",
  );

  await rename(temporaryPath, databasePath);
}

export async function saveRegistrationFile(params: {
  file: File;
  docType: string;
  expiresInDays?: number;
  maxDownloads?: number;
}): Promise<RegistrationFileRecord> {
  await ensureRegistrationStorage();

  const token = createSecureToken();
  const safeOriginalName = sanitizeFileName(params.file.name || "arquivo");
  const storedName = `${token}-${safeOriginalName}`;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + (params.expiresInDays ?? 30));

  const relativePath = path.join("uploads", "registration", storedName);
  const absolutePath = path.join(uploadsDir, storedName);

  const arrayBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await writeFile(absolutePath, buffer);

  const record: RegistrationFileRecord = {
    token,
    originalName: safeOriginalName,
    storedName,
    relativePath,
    absolutePath,
    mimeType: params.file.type || "application/octet-stream",
    size: params.file.size,
    docType: params.docType,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    downloads: 0,
    maxDownloads: params.maxDownloads ?? 10,
  };

  const database = await readRegistrationFileDatabase();
  database[token] = record;
  await writeRegistrationFileDatabase(database);

  return record;
}

export async function getRegistrationFileByToken(
  token: string,
): Promise<RegistrationFileRecord | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;

  const database = await readRegistrationFileDatabase();
  const record = database[token];

  if (!record) return null;

  const now = Date.now();
  const expiresAt = new Date(record.expiresAt).getTime();

  if (Number.isNaN(expiresAt) || expiresAt < now) return null;
  if (record.downloads >= record.maxDownloads) return null;

  return record;
}

export async function incrementRegistrationFileDownload(token: string) {
  const database = await readRegistrationFileDatabase();
  const record = database[token];

  if (!record) return;

  database[token] = {
    ...record,
    downloads: record.downloads + 1,
  };

  await writeRegistrationFileDatabase(database);
}

export async function cleanupExpiredRegistrationFiles() {
  const database = await readRegistrationFileDatabase();
  const now = Date.now();
  const nextDatabase: RegistrationFileDatabase = {};

  for (const [token, record] of Object.entries(database)) {
    const expiresAt = new Date(record.expiresAt).getTime();
    const isExpired = Number.isNaN(expiresAt) || expiresAt < now;

    if (isExpired) {
      await unlink(record.absolutePath).catch(() => undefined);
      continue;
    }

    nextDatabase[token] = record;
  }

  await writeRegistrationFileDatabase(nextDatabase);
}

export function createRegistrationFileStream(absolutePath: string) {
  return createReadStream(absolutePath);
}