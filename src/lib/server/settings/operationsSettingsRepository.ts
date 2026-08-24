import { eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { operationsSettings } from "$lib/server/db/operationsSettingsSchema";

export type GeneralOperationsSettings = {
  supportDisplayName: string;
  supportSenderEmail: string;
  supportSenderName: string;
  timezone: string;
  remoteConsentMinutes: number;
};

export type HelpPublicAiSettings = {
  enabled: boolean;
  anonymousAccessEnabled: boolean;
  rateLimitWindowMinutes: number;
  sessionRequestLimit: number;
  ipRequestLimit: number;
  globalRequestLimitPerHour: number;
};

export type HelpVideoAutomationSettings = {
  enabled: boolean;
};

const DEFAULT_SETTINGS: GeneralOperationsSettings = {
  supportDisplayName: "Equipe F10",
  supportSenderEmail: "",
  supportSenderName: "F10 Software",
  timezone: "America/Sao_Paulo",
  remoteConsentMinutes: 20,
};

export const DEFAULT_HELP_PUBLIC_AI_SETTINGS: HelpPublicAiSettings = {
  enabled: false,
  anonymousAccessEnabled: true,
  rateLimitWindowMinutes: 10,
  sessionRequestLimit: 10,
  ipRequestLimit: 30,
  globalRequestLimitPerHour: 1_000,
};

export const DEFAULT_HELP_VIDEO_AUTOMATION_SETTINGS: HelpVideoAutomationSettings = {
  enabled: false,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function clampInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.round(value), minimum), maximum);
}

export async function getGeneralOperationsSettings(): Promise<GeneralOperationsSettings> {
  const db = getDatabase();
  const [row] = await db
    .select({ value: operationsSettings.value })
    .from(operationsSettings)
    .where(eq(operationsSettings.key, "general"))
    .limit(1);
  const value = asRecord(row?.value);
  const consent = typeof value.remoteConsentMinutes === "number"
    ? Math.min(Math.max(Math.round(value.remoteConsentMinutes), 5), 120)
    : DEFAULT_SETTINGS.remoteConsentMinutes;
  return {
    supportDisplayName: typeof value.supportDisplayName === "string" && value.supportDisplayName.trim()
      ? value.supportDisplayName.trim().slice(0, 120)
      : DEFAULT_SETTINGS.supportDisplayName,
    supportSenderEmail: typeof value.supportSenderEmail === "string"
      ? value.supportSenderEmail.trim().toLowerCase().slice(0, 254)
      : DEFAULT_SETTINGS.supportSenderEmail,
    supportSenderName: typeof value.supportSenderName === "string" && value.supportSenderName.trim()
      ? value.supportSenderName.trim().slice(0, 120)
      : DEFAULT_SETTINGS.supportSenderName,
    timezone: typeof value.timezone === "string" && value.timezone.trim()
      ? value.timezone.trim().slice(0, 80)
      : DEFAULT_SETTINGS.timezone,
    remoteConsentMinutes: consent,
  };
}

export async function getHelpPublicAiSettings(): Promise<HelpPublicAiSettings> {
  const db = getDatabase();
  const [row] = await db
    .select({ value: operationsSettings.value })
    .from(operationsSettings)
    .where(eq(operationsSettings.key, "help_public_ai"))
    .limit(1);
  const value = asRecord(row?.value);

  return {
    enabled: typeof value.enabled === "boolean"
      ? value.enabled
      : DEFAULT_HELP_PUBLIC_AI_SETTINGS.enabled,
    anonymousAccessEnabled: typeof value.anonymousAccessEnabled === "boolean"
      ? value.anonymousAccessEnabled
      : DEFAULT_HELP_PUBLIC_AI_SETTINGS.anonymousAccessEnabled,
    rateLimitWindowMinutes: clampInteger(
      value.rateLimitWindowMinutes,
      DEFAULT_HELP_PUBLIC_AI_SETTINGS.rateLimitWindowMinutes,
      1,
      60,
    ),
    sessionRequestLimit: clampInteger(
      value.sessionRequestLimit,
      DEFAULT_HELP_PUBLIC_AI_SETTINGS.sessionRequestLimit,
      1,
      100,
    ),
    ipRequestLimit: clampInteger(
      value.ipRequestLimit,
      DEFAULT_HELP_PUBLIC_AI_SETTINGS.ipRequestLimit,
      1,
      500,
    ),
    globalRequestLimitPerHour: clampInteger(
      value.globalRequestLimitPerHour,
      DEFAULT_HELP_PUBLIC_AI_SETTINGS.globalRequestLimitPerHour,
      10,
      50_000,
    ),
  };
}

export async function getHelpVideoAutomationSettings(): Promise<HelpVideoAutomationSettings> {
  const [row] = await getDatabase()
    .select({ value: operationsSettings.value })
    .from(operationsSettings)
    .where(eq(operationsSettings.key, "help_video_automation"))
    .limit(1);
  const value = asRecord(row?.value);
  return {
    enabled: typeof value.enabled === "boolean"
      ? value.enabled
      : DEFAULT_HELP_VIDEO_AUTOMATION_SETTINGS.enabled,
  };
}

export async function updateGeneralOperationsSettings(
  actorUserId: string,
  value: GeneralOperationsSettings,
): Promise<void> {
  const db = getDatabase();
  const normalized: GeneralOperationsSettings = {
    supportDisplayName: value.supportDisplayName.trim().slice(0, 120) || DEFAULT_SETTINGS.supportDisplayName,
    supportSenderEmail: value.supportSenderEmail.trim().toLowerCase().slice(0, 254),
    supportSenderName: value.supportSenderName.trim().slice(0, 120) || DEFAULT_SETTINGS.supportSenderName,
    timezone: value.timezone.trim().slice(0, 80) || DEFAULT_SETTINGS.timezone,
    remoteConsentMinutes: Math.min(Math.max(Math.round(value.remoteConsentMinutes), 5), 120),
  };
  const now = new Date();
  await db
    .insert(operationsSettings)
    .values({ key: "general", value: normalized, updatedBy: actorUserId, updatedAt: now })
    .onConflictDoUpdate({
      target: operationsSettings.key,
      set: { value: normalized, updatedBy: actorUserId, updatedAt: now },
    });
  await recordAuditEvent({
    actorUserId,
    action: "operations.settings.updated",
    entityType: "operations_settings",
    entityId: "general",
    metadata: { timezone: normalized.timezone, remoteConsentMinutes: normalized.remoteConsentMinutes },
  });
}

export async function updateHelpPublicAiSettings(
  actorUserId: string,
  value: HelpPublicAiSettings,
): Promise<void> {
  const normalized: HelpPublicAiSettings = {
    enabled: Boolean(value.enabled),
    anonymousAccessEnabled: Boolean(value.anonymousAccessEnabled),
    rateLimitWindowMinutes: clampInteger(value.rateLimitWindowMinutes, 10, 1, 60),
    sessionRequestLimit: clampInteger(value.sessionRequestLimit, 10, 1, 100),
    ipRequestLimit: clampInteger(value.ipRequestLimit, 30, 1, 500),
    globalRequestLimitPerHour: clampInteger(value.globalRequestLimitPerHour, 1_000, 10, 50_000),
  };
  const now = new Date();

  await getDatabase()
    .insert(operationsSettings)
    .values({
      key: "help_public_ai",
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
    action: "operations.help_public_ai.settings.updated",
    entityType: "operations_settings",
    entityId: "help_public_ai",
    metadata: normalized,
  });
}

export async function updateHelpVideoAutomationSettings(
  actorUserId: string,
  value: HelpVideoAutomationSettings,
): Promise<void> {
  const normalized: HelpVideoAutomationSettings = { enabled: Boolean(value.enabled) };
  const now = new Date();

  await getDatabase()
    .insert(operationsSettings)
    .values({
      key: "help_video_automation",
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
    action: "operations.help_video_automation.settings.updated",
    entityType: "operations_settings",
    entityId: "help_video_automation",
    metadata: normalized,
  });
}
