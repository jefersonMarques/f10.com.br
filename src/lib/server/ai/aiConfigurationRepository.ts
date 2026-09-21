import { env } from "$env/dynamic/private";
import { eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { decryptAiSecret, encryptAiSecret, isAiSecretsKeyConfigured } from "$lib/server/ai/aiSecretCrypto";
import {
  AI_PROVIDER_DEFINITIONS,
  AI_TASK_DEFINITIONS,
  isAiProviderCode,
  type AiCapability,
  type AiProviderCode,
  type AiRuntimePolicy,
  type AiTaskCode,
  type AiTaskProfile,
} from "$lib/server/ai/aiTypes";
import { getDatabase } from "$lib/server/db";
import { aiProviderCredentials } from "$lib/server/db/aiConfigurationSchema";
import { operationsSettings } from "$lib/server/db/operationsSettingsSchema";

const TASK_SETTINGS_KEY = "ai_task_profiles";
const RUNTIME_POLICY_KEY = "ai_runtime_policy";

const DEFAULT_RUNTIME_POLICY: AiRuntimePolicy = {
  maxRunsPerConversation: 6,
  dailyTokenBudget: 100_000,
  maxOutputTokens: 500,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.round(parsed), min), max);
}

function environmentApiKey(provider: AiProviderCode): string {
  if (provider === "openai") return env.OPENAI_API_KEY?.trim() ?? "";
  return env.DEEPSEEK_API_KEY?.trim() ?? "";
}

function environmentModel(provider: AiProviderCode): string {
  if (provider === "openai") {
    return env.OPENAI_MODEL?.trim() || AI_PROVIDER_DEFINITIONS.openai.defaultModel;
  }
  return env.DEEPSEEK_MODEL?.trim() || AI_PROVIDER_DEFINITIONS.deepseek.defaultModel;
}

function defaultProfile(task: AiTaskCode): AiTaskProfile {
  const definition = AI_TASK_DEFINITIONS[task];
  const provider = definition.defaultProvider;
  const legacyChatEnabled =
    task === "support_answer" && env.SUPPORT_AI_CHAT_ENABLED === "true";
  return {
    task,
    enabled: legacyChatEnabled || definition.defaultEnabled,
    provider,
    model: environmentModel(provider),
    fallbackProvider: null,
    fallbackModel: "",
    capabilities: [...definition.defaultCapabilities],
  };
}

function normalizeCapabilities(task: AiTaskCode, value: unknown): AiCapability[] {
  const definition = AI_TASK_DEFINITIONS[task];
  if (!Array.isArray(value)) return [...definition.defaultCapabilities];
  const allowed = new Set<AiCapability>(definition.allowedCapabilities);
  return Array.from(
    new Set(
      value.filter(
        (item): item is AiCapability =>
          typeof item === "string" && allowed.has(item as AiCapability),
      ),
    ),
  );
}

function normalizeProfile(task: AiTaskCode, value: unknown): AiTaskProfile {
  const fallback = defaultProfile(task);
  const record = asRecord(value);
  const provider =
    typeof record.provider === "string" && isAiProviderCode(record.provider)
      ? record.provider
      : fallback.provider;
  const fallbackProvider =
    typeof record.fallbackProvider === "string" && isAiProviderCode(record.fallbackProvider)
      ? record.fallbackProvider
      : null;
  const model =
    typeof record.model === "string" && record.model.trim()
      ? record.model.trim().slice(0, 160)
      : environmentModel(provider);
  const fallbackModel =
    fallbackProvider && typeof record.fallbackModel === "string" && record.fallbackModel.trim()
      ? record.fallbackModel.trim().slice(0, 160)
      : fallbackProvider
        ? environmentModel(fallbackProvider)
        : "";

  return {
    task,
    enabled: typeof record.enabled === "boolean" ? record.enabled : fallback.enabled,
    provider,
    model,
    fallbackProvider: fallbackProvider === provider ? null : fallbackProvider,
    fallbackModel: fallbackProvider === provider ? "" : fallbackModel,
    capabilities: normalizeCapabilities(task, record.capabilities),
  };
}

export async function getAiTaskProfiles(): Promise<AiTaskProfile[]> {
  const [row] = await getDatabase()
    .select({ value: operationsSettings.value })
    .from(operationsSettings)
    .where(eq(operationsSettings.key, TASK_SETTINGS_KEY))
    .limit(1);
  const stored = asRecord(row?.value);

  return (Object.keys(AI_TASK_DEFINITIONS) as AiTaskCode[]).map((task) =>
    normalizeProfile(task, stored[task]),
  );
}

export async function getAiTaskProfile(task: AiTaskCode): Promise<AiTaskProfile> {
  const profiles = await getAiTaskProfiles();
  return profiles.find((profile) => profile.task === task) ?? defaultProfile(task);
}

export async function updateAiTaskProfile(
  actorUserId: string,
  input: AiTaskProfile,
): Promise<void> {
  const task = input.task;
  const definition = AI_TASK_DEFINITIONS[task];
  const normalized = normalizeProfile(task, {
    enabled: input.enabled,
    provider: input.provider,
    model: input.model,
    fallbackProvider: input.fallbackProvider,
    fallbackModel: input.fallbackModel,
    capabilities: input.capabilities,
  });

  if (normalized.enabled && normalized.capabilities.length === 0) {
    throw new Error("AI_TASK_CAPABILITY_REQUIRED");
  }
  if (!definition.wired && normalized.enabled) {
    throw new Error("AI_TASK_NOT_WIRED");
  }

  const profiles = await getAiTaskProfiles();
  const nextValue = Object.fromEntries(
    profiles.map((profile) => [
      profile.task,
      profile.task === task ? normalized : profile,
    ]),
  );
  const now = new Date();

  await getDatabase()
    .insert(operationsSettings)
    .values({
      key: TASK_SETTINGS_KEY,
      value: nextValue,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: operationsSettings.key,
      set: { value: nextValue, updatedBy: actorUserId, updatedAt: now },
    });

  await recordAuditEvent({
    actorUserId,
    action: "operations.ai.task.updated",
    entityType: "operations_settings",
    entityId: task,
    metadata: {
      enabled: normalized.enabled,
      provider: normalized.provider,
      model: normalized.model,
      fallbackProvider: normalized.fallbackProvider,
      fallbackModel: normalized.fallbackModel || null,
      capabilities: normalized.capabilities,
    },
  });
}

export async function getAiRuntimePolicy(): Promise<AiRuntimePolicy> {
  const db = getDatabase();
  const [runtimeRows, legacyRows] = await Promise.all([
    db
      .select({ value: operationsSettings.value })
      .from(operationsSettings)
      .where(eq(operationsSettings.key, RUNTIME_POLICY_KEY))
      .limit(1),
    db
      .select({ value: operationsSettings.value })
      .from(operationsSettings)
      .where(eq(operationsSettings.key, "support_routing"))
      .limit(1),
  ]);
  const value = asRecord(runtimeRows[0]?.value);
  const legacyValue = asRecord(legacyRows[0]?.value);

  return {
    maxRunsPerConversation: boundedInteger(
      value.maxRunsPerConversation ?? legacyValue.aiMaxRunsPerConversation,
      DEFAULT_RUNTIME_POLICY.maxRunsPerConversation,
      1,
      20,
    ),
    dailyTokenBudget: boundedInteger(
      value.dailyTokenBudget ?? legacyValue.aiDailyTokenBudget,
      DEFAULT_RUNTIME_POLICY.dailyTokenBudget,
      5_000,
      5_000_000,
    ),
    maxOutputTokens: boundedInteger(
      value.maxOutputTokens ?? legacyValue.aiMaxOutputTokens,
      DEFAULT_RUNTIME_POLICY.maxOutputTokens,
      200,
      2_000,
    ),
  };
}

export async function updateAiRuntimePolicy(
  actorUserId: string,
  input: AiRuntimePolicy,
): Promise<void> {
  const normalized: AiRuntimePolicy = {
    maxRunsPerConversation: boundedInteger(input.maxRunsPerConversation, 6, 1, 20),
    dailyTokenBudget: boundedInteger(input.dailyTokenBudget, 100_000, 5_000, 5_000_000),
    maxOutputTokens: boundedInteger(input.maxOutputTokens, 500, 200, 2_000),
  };
  const now = new Date();

  await getDatabase()
    .insert(operationsSettings)
    .values({
      key: RUNTIME_POLICY_KEY,
      value: normalized,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: operationsSettings.key,
      set: { value: normalized, updatedBy: actorUserId, updatedAt: now },
    });

  await recordAuditEvent({
    actorUserId,
    action: "operations.ai.policy.updated",
    entityType: "operations_settings",
    entityId: RUNTIME_POLICY_KEY,
    metadata: normalized,
  });
}

export async function getAiProviderStatuses() {
  const rows = await getDatabase()
    .select({
      provider: aiProviderCredentials.provider,
      lastTestedAt: aiProviderCredentials.lastTestedAt,
      lastTestStatus: aiProviderCredentials.lastTestStatus,
    })
    .from(aiProviderCredentials);
  const byProvider = new Map(rows.map((row) => [row.provider, row]));

  return (Object.keys(AI_PROVIDER_DEFINITIONS) as AiProviderCode[]).map((provider) => {
    const row = byProvider.get(provider);
    const envKey = environmentApiKey(provider);
    return {
      ...AI_PROVIDER_DEFINITIONS[provider],
      defaultModel: environmentModel(provider),
      configured: Boolean(envKey) || Boolean(row && isAiSecretsKeyConfigured()),
      credentialSource: row && isAiSecretsKeyConfigured()
        ? "database" as const
        : envKey
          ? "environment" as const
          : row
            ? "database" as const
            : "none" as const,
      lastTestedAt: row?.lastTestedAt ?? null,
      lastTestStatus: row?.lastTestStatus === "ok" || row?.lastTestStatus === "error"
        ? row.lastTestStatus
        : null,
      canStoreCredential: isAiSecretsKeyConfigured(),
    };
  });
}

export async function readAiProviderCredential(
  provider: AiProviderCode,
): Promise<{ apiKey: string; source: "database" | "environment" }> {
  const [row] = await getDatabase()
    .select({ encryptedSecret: aiProviderCredentials.encryptedSecret })
    .from(aiProviderCredentials)
    .where(eq(aiProviderCredentials.provider, provider))
    .limit(1);

  if (row) {
    try {
      const apiKey = decryptAiSecret(row.encryptedSecret).trim();
      if (apiKey) return { apiKey, source: "database" };
    } catch {
      const fallbackApiKey = environmentApiKey(provider);
      if (fallbackApiKey) return { apiKey: fallbackApiKey, source: "environment" };
      throw new Error("AI_CREDENTIAL_UNAVAILABLE");
    }
  }

  const apiKey = environmentApiKey(provider);
  if (!apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
  return { apiKey, source: "environment" };
}

export async function isAiProviderConfigured(provider: AiProviderCode): Promise<boolean> {
  const statuses = await getAiProviderStatuses();
  return statuses.some((status) => status.code === provider && status.configured);
}

export async function isAiTaskConfigured(
  task: AiTaskCode,
  requiredCapabilities: AiCapability[] = [],
): Promise<boolean> {
  const profile = await getAiTaskProfile(task);
  if (!profile.enabled) return false;
  if (
    requiredCapabilities.some(
      (capability) => !profile.capabilities.includes(capability),
    )
  ) {
    return false;
  }
  if (await isAiProviderConfigured(profile.provider)) return true;
  return Boolean(
    profile.fallbackProvider &&
      await isAiProviderConfigured(profile.fallbackProvider),
  );
}

export async function saveAiProviderCredential(
  actorUserId: string,
  provider: AiProviderCode,
  apiKeyValue: string,
): Promise<void> {
  if (!isAiSecretsKeyConfigured()) throw new Error("AI_SECRETS_KEY_NOT_CONFIGURED");
  const apiKey = apiKeyValue.trim();
  if (apiKey.length < 8 || apiKey.length > 1_024) throw new Error("AI_PROVIDER_KEY_INVALID");
  const encryptedSecret = encryptAiSecret(apiKey);
  const now = new Date();

  await getDatabase()
    .insert(aiProviderCredentials)
    .values({
      provider,
      encryptedSecret,
      lastTestedAt: null,
      lastTestStatus: null,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: aiProviderCredentials.provider,
      set: {
        encryptedSecret,
        lastTestedAt: null,
        lastTestStatus: null,
        updatedBy: actorUserId,
        updatedAt: now,
      },
    });

  await recordAuditEvent({
    actorUserId,
    action: "operations.ai.credential.updated",
    entityType: "ai_provider",
    entityId: provider,
    metadata: { provider },
  });
}

export async function removeAiProviderCredential(
  actorUserId: string,
  provider: AiProviderCode,
): Promise<void> {
  await getDatabase()
    .delete(aiProviderCredentials)
    .where(eq(aiProviderCredentials.provider, provider));

  await recordAuditEvent({
    actorUserId,
    action: "operations.ai.credential.removed",
    entityType: "ai_provider",
    entityId: provider,
    metadata: { provider },
  });
}

export async function markAiProviderTest(
  actorUserId: string,
  provider: AiProviderCode,
  ok: boolean,
): Promise<void> {
  const now = new Date();
  await getDatabase()
    .update(aiProviderCredentials)
    .set({
      lastTestedAt: now,
      lastTestStatus: ok ? "ok" : "error",
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .where(eq(aiProviderCredentials.provider, provider));

  await recordAuditEvent({
    actorUserId,
    action: "operations.ai.provider.tested",
    entityType: "ai_provider",
    entityId: provider,
    metadata: { provider, ok },
  });
}

export function defaultAiModel(provider: AiProviderCode): string {
  return environmentModel(provider);
}
