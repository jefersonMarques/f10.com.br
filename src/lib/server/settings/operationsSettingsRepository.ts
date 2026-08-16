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

const DEFAULT_SETTINGS: GeneralOperationsSettings = {
  supportDisplayName: "Equipe F10",
  supportSenderEmail: "",
  supportSenderName: "F10 Software",
  timezone: "America/Sao_Paulo",
  remoteConsentMinutes: 20,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
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
