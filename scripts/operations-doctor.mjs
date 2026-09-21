import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
const requireSuperAdmin = process.env.OPERATIONS_DOCTOR_REQUIRE_SUPER_ADMIN !== "false";
const requireAssetStorage = process.env.OPERATIONS_DOCTOR_REQUIRE_ASSET_STORAGE === "true";
const requireRemote = process.env.OPERATIONS_DOCTOR_REQUIRE_REMOTE === "true";
const supportRateLimitSecret = process.env.SUPPORT_RATE_LIMIT_SECRET?.trim() ?? "";

const assetStorageEnabled = process.env.ASSET_STORAGE === "s3";
const assetStorageConfigured = assetStorageEnabled && Boolean(
  process.env.S3_ENDPOINT?.trim() &&
  process.env.S3_BUCKET?.trim() &&
  process.env.S3_ACCESS_KEY?.trim() &&
  process.env.S3_SECRET_KEY?.trim(),
);

function parseUrl(value, protocols) {
  try {
    const url = new URL(value);
    return protocols.includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

const remoteEnabled = process.env.REMOTE_SUPPORT_PROVIDER === "meshcentral";
const remoteBaseUrl = process.env.MESHCENTRAL_BASE_URL?.trim() ?? "";
const remoteBase = parseUrl(remoteBaseUrl, ["https:", "http:"]);
const remoteBaseProtocolOk = Boolean(
  remoteBase &&
  (remoteBase.protocol === "https:" || ["localhost", "127.0.0.1"].includes(remoteBase.hostname)),
);
const remoteProviderConfigured = remoteEnabled && remoteBaseProtocolOk;

const meshCtrlPath = process.env.MESHCENTRAL_MESHCTRL_PATH?.trim() ?? "";
const meshControlUrlValue = process.env.MESHCENTRAL_CONTROL_URL?.trim() ?? "";
const meshControlUrl = parseUrl(meshControlUrlValue, ["ws:", "wss:"]);
const meshControlUser = process.env.MESHCENTRAL_CONTROL_USER?.trim() ?? "";
const meshControlDomain = process.env.MESHCENTRAL_CONTROL_DOMAIN?.trim() ?? "";
const meshLoginKeyFile = process.env.MESHCENTRAL_CONTROL_LOGIN_KEY_FILE?.trim() ?? "";
const meshPassword = process.env.MESHCENTRAL_CONTROL_PASSWORD ?? "";
const meshControlCredentialConfigured = Boolean(
  (meshLoginKeyFile && existsSync(meshLoginKeyFile)) || meshPassword,
);
const meshControlConfigured = Boolean(
  meshCtrlPath &&
  existsSync(meshCtrlPath) &&
  meshControlUrl &&
  meshControlUser &&
  meshControlDomain &&
  meshControlCredentialConfigured,
);
const agentType = Number.parseInt(process.env.MESHCENTRAL_WINDOWS_AGENT_TYPE ?? "4", 10);
const consentFlags = Number.parseInt(process.env.MESHCENTRAL_DEVICE_CONSENT_FLAGS ?? "8", 10);
const enrollmentHours = Number.parseInt(process.env.REMOTE_ENROLLMENT_HOURS ?? "24", 10);
const shareMinutes = Number.parseInt(process.env.MESHCENTRAL_SHARE_MINUTES ?? "30", 10);
const remoteOptionsValid = Boolean(
  Number.isInteger(agentType) && agentType >= 1 && agentType <= 11000 &&
  Number.isInteger(consentFlags) && consentFlags >= 0 &&
  Number.isInteger(enrollmentHours) && enrollmentHours >= 1 && enrollmentHours <= 168 &&
  Number.isInteger(shareMinutes) && shareMinutes >= 5 && shareMinutes <= 60,
);
const remoteConfigured = remoteProviderConfigured && meshControlConfigured && remoteOptionsValid;

if (!databaseUrl) throw new Error("DATABASE_URL is required.");

const requiredRoles = ["SUPER_ADMIN", "ADMIN", "EMPLOYEE"];
const requiredPermissions = [
  "help.view", "help.edit", "help.publish",
  "tasks.view", "tasks.create", "tasks.update", "tasks.assign", "tasks.manage",
  "tickets.view", "tickets.create", "tickets.reply", "tickets.assign", "tickets.manage",
  "chat.view", "chat.respond", "chat.manage",
  "customers.view", "customers.manage",
  "users.view", "users.manage", "roles.manage",
  "reports.view", "audit.view",
  "integrations.view", "integrations.manage", "secrets.manage",
  "remote.request", "remote.use", "remote.manage",
  "system.settings.manage",
];
const criticalTables = [
  "users", "roles", "permissions", "role_permissions", "sessions", "audit_logs",
  "auth_password_reset_tokens", "internal_notifications",
  "help_articles", "help_questions", "help_publications", "help_contents",
  "help_content_steps", "help_step_blocks", "help_assets", "help_search_documents",
  "help_search_events", "help_search_results", "support_ai_runs", "user_invites",
  "help_training_paths", "help_training_steps", "help_training_step_media",
  "help_training_failure_reasons", "help_training_versions", "help_training_invites",
  "help_training_sessions", "help_training_step_progress", "help_training_events",
  "task_projects", "tasks", "ticket_task_links", "support_queues", "tickets", "ticket_messages",
  "web_chat_sessions", "support_public_limits", "support_agent_presence",
  "support_chat_routing_members", "support_chat_entry_options", "ticket_message_attachments",
  "operations_settings", "ai_provider_credentials",
  "teams", "team_members", "ticket_areas",
  "service_request_routes", "service_requests", "service_request_attachments",
  "service_request_change_sets", "service_request_field_changes",
  "help_public_ai_requests", "help_ai_usage_runs",
  "remote_devices", "remote_customer_groups", "remote_device_enrollments",
  "remote_support_sessions",
];

function printResult(label, ok, detail) {
  const marker = ok ? "OK" : "FAIL";
  process.stdout.write(`[${marker}] ${label}${detail ? `: ${detail}` : ""}\n`);
}

function difference(expectedValues, actualValues) {
  const actual = new Set(actualValues);
  return expectedValues.filter((value) => !actual.has(value));
}

async function listExpectedMigrations() {
  const migrationDirectory = join(process.cwd(), "migrations");
  return (await readdir(migrationDirectory))
    .filter((fileName) => /^\d{4}_.+\.sql$/.test(fileName))
    .sort();
}

const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 10,
  idle_timeout: 5,
  prepare: false,
});
let hasFailure = false;

try {
  const [migrationTable] = await sql`SELECT to_regclass('public.schema_migrations')::text AS name`;
  if (!migrationTable?.name) {
    printResult("schema_migrations", false, "execute npm run db:migrate first");
    process.exitCode = 1;
  } else {
    printResult("schema_migrations", true);

    const expectedMigrations = await listExpectedMigrations();
    const appliedRows = await sql`SELECT name FROM schema_migrations ORDER BY name`;
    const appliedMigrations = appliedRows.map((row) => row.name);
    const missingMigrations = difference(expectedMigrations, appliedMigrations);
    const unknownMigrations = difference(appliedMigrations, expectedMigrations);
    const migrationsOk = missingMigrations.length === 0 && unknownMigrations.length === 0;
    printResult(
      "migrations",
      migrationsOk,
      migrationsOk
        ? `${appliedMigrations.length} applied`
        : `missing=${missingMigrations.join(",") || "none"}; unknown=${unknownMigrations.join(",") || "none"}`,
    );
    hasFailure ||= !migrationsOk;

    const tableRows = await Promise.all(criticalTables.map(async (tableName) => {
      const [row] = await sql`SELECT to_regclass(${`public.${tableName}`})::text AS name`;
      return { tableName, exists: Boolean(row?.name) };
    }));
    const missingTables = tableRows.filter((row) => !row.exists).map((row) => row.tableName);
    const tablesOk = missingTables.length === 0;
    printResult(
      "critical tables",
      tablesOk,
      tablesOk ? `${criticalTables.length} available` : missingTables.join(","),
    );
    hasFailure ||= !tablesOk;

    const [trigramExtension] = await sql`SELECT extname FROM pg_extension WHERE extname = 'pg_trgm' LIMIT 1`;
    const trigramOk = trigramExtension?.extname === "pg_trgm";
    printResult(
      "pg_trgm extension",
      trigramOk,
      trigramOk ? "available" : "required by help search intelligence",
    );
    hasFailure ||= !trigramOk;

    const rateLimitSecretOk = supportRateLimitSecret.length >= 32;
    printResult(
      "native chat rate limit",
      rateLimitSecretOk,
      rateLimitSecretOk
        ? "configured"
        : "SUPPORT_RATE_LIMIT_SECRET must have at least 32 characters",
    );
    hasFailure ||= !rateLimitSecretOk;

    const storageOk = assetStorageConfigured || (!assetStorageEnabled && !requireAssetStorage);
    printResult(
      "Help asset storage",
      storageOk,
      assetStorageConfigured
        ? `configured; bucket=${process.env.S3_BUCKET?.trim()}`
        : assetStorageEnabled || requireAssetStorage
          ? "S3/MinIO requires endpoint, bucket, access key and secret key"
          : "disabled; uploads and ZIP assets unavailable",
    );
    hasFailure ||= !storageOk;

    const aiSecretsKeyConfigured = (process.env.AI_SECRETS_KEY?.trim().length ?? 0) >= 32;
    const providerRows = await sql`
      SELECT provider, last_test_status
      FROM ai_provider_credentials
    `;
    const providerByCode = new Map(providerRows.map((row) => [row.provider, row]));
    const providerConfigured = (provider) => {
      const environmentConfigured = provider === "openai"
        ? Boolean(process.env.OPENAI_API_KEY?.trim())
        : provider === "deepseek"
          ? Boolean(process.env.DEEPSEEK_API_KEY?.trim())
          : false;
      return environmentConfigured || (aiSecretsKeyConfigured && providerByCode.has(provider));
    };

    printResult(
      "AI encrypted credentials",
      providerRows.length === 0 || aiSecretsKeyConfigured,
      providerRows.length === 0
        ? "no encrypted credential stored"
        : aiSecretsKeyConfigured
          ? `${providerRows.length} credential(s) readable with AI_SECRETS_KEY`
          : "AI_SECRETS_KEY must have at least 32 characters",
    );
    hasFailure ||= providerRows.length > 0 && !aiSecretsKeyConfigured;

    for (const row of providerRows) {
      const ok = providerConfigured(row.provider) && row.last_test_status !== "error";
      printResult(
        `AI provider ${row.provider}`,
        ok,
        ok
          ? `configured${row.last_test_status ? `; last test=${row.last_test_status}` : "; connection test pending"}`
          : "credential unavailable or last connection test failed",
      );
      hasFailure ||= !ok;
    }

    const [taskProfilesRow] = await sql`
      SELECT value
      FROM operations_settings
      WHERE key = 'ai_task_profiles'
      LIMIT 1
    `;
    const taskProfiles =
      taskProfilesRow?.value && typeof taskProfilesRow.value === "object"
        ? taskProfilesRow.value
        : {};
    const taskDefaults = {
      help_public_answer: { enabled: true, provider: "openai", fallbackProvider: null },
      content_edit: { enabled: true, provider: "openai", fallbackProvider: null },
      training_generation: { enabled: true, provider: "openai", fallbackProvider: null },
    };

    for (const [task, fallback] of Object.entries(taskDefaults)) {
      const stored =
        taskProfiles[task] && typeof taskProfiles[task] === "object"
          ? taskProfiles[task]
          : {};
      const enabled = typeof stored.enabled === "boolean" ? stored.enabled : fallback.enabled;
      const provider = typeof stored.provider === "string" ? stored.provider : fallback.provider;
      const fallbackProvider =
        typeof stored.fallbackProvider === "string" && stored.fallbackProvider
          ? stored.fallbackProvider
          : fallback.fallbackProvider;
      const primaryOk = providerConfigured(provider);
      const fallbackOk = Boolean(fallbackProvider && providerConfigured(fallbackProvider));
      const ok = enabled && (primaryOk || fallbackOk);
      printResult(
        `AI task ${task}`,
        ok,
        !enabled
          ? "disabled in Operations > Configurações > Inteligência Artificial"
          : primaryOk
            ? `provider=${provider}`
            : fallbackOk
              ? `primary unavailable; fallback=${fallbackProvider}`
              : `provider=${provider} is not configured`,
      );
      hasFailure ||= !ok;
    }

    const transcriptionOk = providerConfigured("openai");
    printResult(
      "OpenAI transcription",
      transcriptionOk,
      transcriptionOk
        ? "available for MP4/YouTube imports"
        : "configure OpenAI in the AI panel or OPENAI_API_KEY",
    );
    hasFailure ||= !transcriptionOk;

    const privateBucket = process.env.SERVICE_REQUEST_S3_BUCKET?.trim() ?? "";
    const publicBucket = process.env.S3_BUCKET?.trim() ?? "";
    const privateStorageOk =
      assetStorageConfigured &&
      Boolean(privateBucket) &&
      privateBucket !== publicBucket;
    printResult(
      "Service Request private storage",
      privateStorageOk,
      privateStorageOk
        ? `bucket=${privateBucket}; separated from Help bucket`
        : "SERVICE_REQUEST_S3_BUCKET must be configured and different from S3_BUCKET",
    );
    hasFailure ||= !privateStorageOk;

    const serviceRequestSecret = process.env.SERVICE_REQUEST_SECRET_KEY?.trim() ?? "";
    const serviceRequestSecretOk = serviceRequestSecret.length >= 32;
    printResult(
      "Service Request encryption",
      serviceRequestSecretOk,
      serviceRequestSecretOk
        ? "configured"
        : "SERVICE_REQUEST_SECRET_KEY must have at least 32 characters",
    );
    hasFailure ||= !serviceRequestSecretOk;

    const serviceRoutes = await sql`
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
    const routeByType = new Map(serviceRoutes.map((row) => [row.request_type, row]));
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
      printResult(
        `Service Request route ${requestType}`,
        ok,
        ok ? "active with responsible team" : "route/queue/area/team is missing or inactive",
      );
      hasFailure ||= !ok;
    }

    const [generalSettings] = await sql`
      SELECT value
      FROM operations_settings
      WHERE key = 'general'
      LIMIT 1
    `;
    const configuredSender =
      typeof generalSettings?.value?.supportSenderEmail === "string"
        ? generalSettings.value.supportSenderEmail.trim()
        : "";
    const emailOk =
      Boolean(process.env.BREVO_API_KEY?.trim()) &&
      Boolean(configuredSender || process.env.BREVO_SENDER_EMAIL?.trim());
    printResult(
      "transactional email",
      emailOk,
      emailOk ? "Brevo key and sender configured" : "BREVO_API_KEY and sender are required",
    );
    hasFailure ||= !emailOk;

    const remoteOk = remoteConfigured || (!remoteEnabled && !requireRemote);
    printResult(
      "remote support provider",
      remoteOk,
      remoteConfigured
        ? `MeshCentral configured; public=${remoteBaseUrl}; control=${meshControlUrlValue}; agentType=${agentType}; consentFlags=${consentFlags}; shareMinutes=${shareMinutes}`
        : remoteEnabled || requireRemote
          ? "MeshCentral requires public URL, MeshCtrl path, ws/wss control URL, user/domain, credential and valid enrollment/share options"
          : "disabled by environment",
    );
    hasFailure ||= !remoteOk;

    const remoteCredentialOk = !remoteEnabled || !requireRemote || meshControlCredentialConfigured;
    printResult(
      "remote control credential",
      remoteCredentialOk,
      remoteCredentialOk
        ? meshLoginKeyFile
          ? "login key file configured"
          : meshPassword
            ? "password credential configured"
            : "remote requirement disabled"
        : "configure MESHCENTRAL_CONTROL_LOGIN_KEY_FILE or MESHCENTRAL_CONTROL_PASSWORD",
    );
    hasFailure ||= !remoteCredentialOk;

    const roleRows = await sql`SELECT code FROM roles`;
    const missingRoles = difference(requiredRoles, roleRows.map((row) => row.code));
    const rolesOk = missingRoles.length === 0;
    printResult(
      "system roles",
      rolesOk,
      rolesOk ? requiredRoles.join(", ") : `missing=${missingRoles.join(",")}`,
    );
    hasFailure ||= !rolesOk;

    const permissionRows = await sql`SELECT code FROM permissions`;
    const missingPermissions = difference(requiredPermissions, permissionRows.map((row) => row.code));
    const permissionsOk = missingPermissions.length === 0;
    printResult(
      "permissions",
      permissionsOk,
      permissionsOk ? `${requiredPermissions.length} available` : `missing=${missingPermissions.join(",")}`,
    );
    hasFailure ||= !permissionsOk;

    const [superAdminRow] = await sql`
      SELECT count(*)::integer AS count
      FROM users
      INNER JOIN user_roles ON user_roles.user_id = users.id
      INNER JOIN roles ON roles.id = user_roles.role_id
      WHERE roles.code = 'SUPER_ADMIN' AND users.status = 'active'
    `;
    const activeSuperAdminCount = Number(superAdminRow?.count ?? 0);
    const superAdminOk = !requireSuperAdmin || activeSuperAdminCount > 0;
    printResult(
      "active super admin",
      superAdminOk,
      requireSuperAdmin
        ? `${activeSuperAdminCount} found`
        : `${activeSuperAdminCount} found; requirement disabled`,
    );
    hasFailure ||= !superAdminOk;
  }
} finally {
  await sql.end({ timeout: 5 });
}

if (hasFailure) process.exitCode = 1;
else if (!process.exitCode) process.stdout.write("Operations environment is ready for smoke testing.\n");
