import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
  prepare: false,
});

try {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const appliedRows = await sql`SELECT name FROM schema_migrations`;
  const applied = new Set(appliedRows.map((row) => row.name));
  const migrationDirectory = join(process.cwd(), "migrations");
  const migrationFiles = (await readdir(migrationDirectory))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    if (applied.has(migrationFile)) continue;

    const migrationSql = await readFile(join(migrationDirectory, migrationFile), "utf8");

    await sql.begin(async (transaction) => {
      await transaction.unsafe(migrationSql);
      await transaction`
        INSERT INTO schema_migrations (name)
        VALUES (${migrationFile})
      `;
    });

    process.stdout.write(`Applied ${migrationFile}\n`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
