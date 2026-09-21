import { env } from "$env/dynamic/private";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "$lib/server/db/schema";

function parsePoolSize(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "10", 10);
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(Math.max(parsed, 1), 30);
}

function createDatabase() {
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for F10 Operations.");
  }

  const client = postgres(databaseUrl, {
    max: parsePoolSize(env.DATABASE_POOL_MAX),
    connect_timeout: 10,
    idle_timeout: 20,
    prepare: false,
  });

  return drizzle({ client, schema });
}

let database: ReturnType<typeof createDatabase> | undefined;

export function getDatabase(): ReturnType<typeof createDatabase> {
  database ??= createDatabase();
  return database;
}
