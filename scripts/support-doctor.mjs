import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const requiredTables = [
  "customer_contacts",
  "support_queues",
  "tickets",
  "ticket_messages",
  "web_chat_sessions",
  "support_public_limits",
  "help_publications",
  "customer_portal_login_tokens",
  "customer_portal_sessions",
];

let failed = false;
function check(label, ok, detail = "") {
  process.stdout.write(`[${ok ? "OK" : "FAIL"}] ${label}${detail ? `: ${detail}` : ""}\n`);
  failed ||= !ok;
}

const rateLimitSecret = process.env.SUPPORT_RATE_LIMIT_SECRET?.trim() ?? "";
check(
  "chat rate limit",
  rateLimitSecret.length >= 32,
  rateLimitSecret.length >= 32 ? "configured" : "SUPPORT_RATE_LIMIT_SECRET must have at least 32 characters",
);

const brevoConfigured = Boolean(
  process.env.BREVO_API_KEY?.trim() && process.env.BREVO_SENDER_EMAIL?.trim(),
);
check(
  "customer portal email",
  brevoConfigured,
  brevoConfigured ? "Brevo sender configured" : "BREVO_API_KEY and BREVO_SENDER_EMAIL are required",
);

const portalBase = process.env.CUSTOMER_PORTAL_BASE_URL?.trim() ?? "";
if (portalBase) {
  let validPortalUrl = false;
  try {
    const parsed = new URL(portalBase);
    validPortalUrl = parsed.protocol === "https:" || ["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch {
    validPortalUrl = false;
  }
  check("customer portal URL", validPortalUrl, validPortalUrl ? portalBase : "invalid CUSTOMER_PORTAL_BASE_URL");
} else {
  process.stdout.write("[INFO] customer portal URL: localhost can use the request origin; configure CUSTOMER_PORTAL_BASE_URL before production.\n");
}

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
  prepare: false,
});

try {
  const tableResults = await Promise.all(requiredTables.map(async (tableName) => {
    const [row] = await sql`SELECT to_regclass(${`public.${tableName}`})::text AS name`;
    return { tableName, exists: Boolean(row?.name) };
  }));
  const missingTables = tableResults.filter((item) => !item.exists).map((item) => item.tableName);
  check(
    "support tables",
    missingTables.length === 0,
    missingTables.length === 0 ? `${requiredTables.length} available` : `missing=${missingTables.join(",")}`,
  );

  if (!missingTables.includes("support_queues")) {
    const [queue] = await sql`
      SELECT code, active
      FROM support_queues
      WHERE code = 'support'
      LIMIT 1
    `;
    check(
      "support queue",
      Boolean(queue?.active),
      queue?.active ? "support is active" : "active queue with code=support is required",
    );
  }

  if (!missingTables.includes("help_publications")) {
    const [publication] = await sql`
      SELECT count(*)::integer AS count
      FROM help_publications
      WHERE entity_type = 'content'
    `;
    const count = Number(publication?.count ?? 0);
    process.stdout.write(`[INFO] public help publications: ${count}\n`);
  }
} catch (cause) {
  check(
    "database connectivity",
    false,
    cause instanceof Error ? cause.name : "unknown database error",
  );
} finally {
  await sql.end({ timeout: 5 });
}

if (failed) process.exitCode = 1;
else process.stdout.write("Support environment is ready for local smoke testing.\n");
