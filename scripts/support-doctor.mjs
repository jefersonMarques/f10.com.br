import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const requiredTables = [
  "customer_contacts",
  "support_queues",
  "tickets",
  "ticket_messages",
  "ticket_message_attachments",
  "web_chat_sessions",
  "support_public_limits",
  "support_chat_entry_options",
  "support_ai_runs",
  "help_search_documents",
  "help_search_events",
  "help_search_results",
  "help_publications",
  "customer_portal_login_tokens",
  "customer_portal_sessions",
  "operations_settings",
  "ai_provider_credentials",
  "teams",
  "ticket_areas",
  "service_request_routes",
  "service_requests",
  "service_request_attachments",
  "service_request_change_sets",
  "service_request_field_changes",
  "internal_notifications",
  "user_profiles",
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

const publicBucket = process.env.S3_BUCKET?.trim() ?? "";
const privateBucket = process.env.SERVICE_REQUEST_S3_BUCKET?.trim() ?? "";
const baseStorageConfigured =
  process.env.ASSET_STORAGE?.trim() === "s3" &&
  Boolean(process.env.S3_ENDPOINT?.trim()) &&
  Boolean(publicBucket) &&
  Boolean(process.env.S3_ACCESS_KEY?.trim()) &&
  Boolean(process.env.S3_SECRET_KEY?.trim());

check(
  "Help storage",
  baseStorageConfigured,
  baseStorageConfigured ? `bucket=${publicBucket}` : "S3/MinIO base storage is incomplete",
);
check(
  "Service Request storage isolation",
  baseStorageConfigured && Boolean(privateBucket) && privateBucket !== publicBucket,
  privateBucket && privateBucket !== publicBucket
    ? `private bucket=${privateBucket}`
    : "SERVICE_REQUEST_S3_BUCKET must be different from S3_BUCKET",
);

const serviceRequestSecret = process.env.SERVICE_REQUEST_SECRET_KEY?.trim() ?? "";
check(
  "Service Request encryption",
  serviceRequestSecret.length >= 32,
  serviceRequestSecret.length >= 32
    ? "configured"
    : "SERVICE_REQUEST_SECRET_KEY must have at least 32 characters",
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

  if (!missingTables.includes("ai_provider_credentials")) {
    const credentialRows = await sql`
      SELECT provider, last_test_status
      FROM ai_provider_credentials
    `;
    const aiSecretsKeyConfigured = (process.env.AI_SECRETS_KEY?.trim().length ?? 0) >= 32;
    const configuredProviders = new Set(
      ["openai", "deepseek"].filter((provider) => {
        const environmentConfigured = provider === "openai"
          ? Boolean(process.env.OPENAI_API_KEY?.trim())
          : Boolean(process.env.DEEPSEEK_API_KEY?.trim());
        const databaseConfigured =
          aiSecretsKeyConfigured &&
          credentialRows.some((row) => row.provider === provider);
        return environmentConfigured || databaseConfigured;
      }),
    );
    check(
      "AI provider availability",
      configuredProviders.size > 0,
      configuredProviders.size > 0
        ? Array.from(configuredProviders).join(", ")
        : "configure OpenAI or DeepSeek in Operations > Inteligência Artificial",
    );
    for (const row of credentialRows) {
      if (row.last_test_status === "error") {
        check(`AI provider ${row.provider} last test`, false, "connection test failed");
      }
    }
  }

  let settingsSenderEmail = "";
  if (!missingTables.includes("operations_settings")) {
    const [general] = await sql`
      SELECT value
      FROM operations_settings
      WHERE key = 'general'
      LIMIT 1
    `;
    settingsSenderEmail = typeof general?.value?.supportSenderEmail === "string"
      ? general.value.supportSenderEmail.trim()
      : "";
  }

  const apiKeyConfigured = Boolean(process.env.BREVO_API_KEY?.trim());
  const senderEmail = settingsSenderEmail || process.env.BREVO_SENDER_EMAIL?.trim() || "";
  const brevoConfigured = apiKeyConfigured && Boolean(senderEmail);
  check(
    "customer portal email",
    brevoConfigured,
    brevoConfigured
      ? "Brevo API key and sender configured"
      : !apiKeyConfigured
        ? "BREVO_API_KEY is required"
        : "configure the support sender email in Operations settings",
  );

  if (!missingTables.includes("support_queues") && !missingTables.includes("teams")) {
    const [queue] = await sql`
      SELECT q.code, q.active, q.team_id, t.active AS team_active
      FROM support_queues q
      LEFT JOIN teams t ON t.id = q.team_id
      WHERE q.code = 'support'
      LIMIT 1
    `;
    check(
      "support queue",
      Boolean(queue?.active),
      queue?.active ? "support is active" : "active queue with code=support is required",
    );
    check(
      "support queue team",
      Boolean(queue?.team_id && queue?.team_active),
      queue?.team_id && queue?.team_active
        ? "active responsible team configured"
        : "select an active responsible team in Operations > Configurações > Atendimento",
    );
  }

  if (
    !missingTables.includes("service_request_routes") &&
    !missingTables.includes("support_queues") &&
    !missingTables.includes("ticket_areas") &&
    !missingTables.includes("teams")
  ) {
    const routes = await sql`
      SELECT
        r.request_type,
        r.active AS route_active,
        q.active AS queue_active,
        q.team_id AS queue_team_id,
        a.active AS area_active,
        a.team_id AS area_team_id,
        t.active AS team_active
      FROM service_request_routes r
      INNER JOIN support_queues q ON q.id = r.queue_id
      INNER JOIN ticket_areas a ON a.id = r.area_id
      LEFT JOIN teams t ON t.id = a.team_id
      WHERE r.request_type IN ('nfse', 'cell_coin')
    `;
    const routeByType = new Map(routes.map((row) => [row.request_type, row]));
    for (const requestType of ["nfse", "cell_coin"]) {
      const route = routeByType.get(requestType);
      const ok = Boolean(
        route?.route_active &&
        route?.queue_active &&
        route?.queue_team_id &&
        route?.area_active &&
        route?.area_team_id &&
        route?.team_active
      );
      check(
        `Service Request ${requestType}`,
        ok,
        ok ? "routing ready" : "route/queue/area/team is missing or inactive",
      );
    }
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
