import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL?.trim();
const requireSuperAdmin = process.env.OPERATIONS_DOCTOR_REQUIRE_SUPER_ADMIN !== "false";
const requireOpenAi = process.env.OPERATIONS_DOCTOR_REQUIRE_OPENAI === "true";
const requireAssetStorage = process.env.OPERATIONS_DOCTOR_REQUIRE_ASSET_STORAGE === "true";
const requireRemote = process.env.OPERATIONS_DOCTOR_REQUIRE_REMOTE === "true";
const openAiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
const openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-5-mini";
const chatAiEnabled = process.env.SUPPORT_AI_CHAT_ENABLED === "true";
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
  "task_projects", "tasks", "ticket_task_links", "support_queues", "tickets", "ticket_messages",
  "web_chat_sessions", "support_public_limits", "support_agent_presence",
  "support_chat_routing_members", "support_chat_entry_options", "ticket_message_attachments",
  "operations_settings",
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

    const openAiOk = openAiConfigured || !requireOpenAi;
    printResult(
      "OpenAI support agent",
      openAiOk,
      openAiConfigured
        ? `configured; model=${openAiModel}`
        : requireOpenAi
          ? "OPENAI_API_KEY is required"
          : "not configured; AI lab will fail closed to human escalation",
    );
    hasFailure ||= !openAiOk;

    const chatAiOk = !chatAiEnabled || openAiConfigured;
    printResult(
      "native chat AI",
      chatAiOk,
      chatAiEnabled
        ? chatAiOk
          ? `enabled; model=${openAiModel}`
          : "SUPPORT_AI_CHAT_ENABLED requires OPENAI_API_KEY"
        : "disabled by feature flag",
    );
    hasFailure ||= !chatAiOk;

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
