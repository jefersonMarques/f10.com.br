import { eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { operationsSettings } from "$lib/server/db/operationsSettingsSchema";

export const SUPPORT_DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type SupportDayKey = (typeof SUPPORT_DAY_KEYS)[number];

export type SupportDayHours = {
  enabled: boolean;
  start: string;
  end: string;
};

export type SupportHoursSettings = {
  configured: boolean;
  days: Record<SupportDayKey, SupportDayHours>;
};

const DEFAULT_DAY: SupportDayHours = { enabled: false, start: "08:00", end: "18:00" };

const DEFAULT_SETTINGS: SupportHoursSettings = {
  configured: false,
  days: {
    monday: { enabled: true, start: "08:00", end: "18:00" },
    tuesday: { enabled: true, start: "08:00", end: "18:00" },
    wednesday: { enabled: true, start: "08:00", end: "18:00" },
    thursday: { enabled: true, start: "08:00", end: "18:00" },
    friday: { enabled: true, start: "08:00", end: "18:00" },
    saturday: { ...DEFAULT_DAY },
    sunday: { ...DEFAULT_DAY },
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeTime(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return fallback;
  return value;
}

function normalizeSettings(value: unknown): SupportHoursSettings {
  const record = asRecord(value);
  const rawDays = asRecord(record.days);
  const days = {} as Record<SupportDayKey, SupportDayHours>;

  for (const key of SUPPORT_DAY_KEYS) {
    const fallback = DEFAULT_SETTINGS.days[key];
    const rawDay = asRecord(rawDays[key]);
    days[key] = {
      enabled: typeof rawDay.enabled === "boolean" ? rawDay.enabled : fallback.enabled,
      start: normalizeTime(rawDay.start, fallback.start),
      end: normalizeTime(rawDay.end, fallback.end),
    };
  }

  return {
    configured: record.configured === true,
    days,
  };
}

export function isValidSupportHours(settings: SupportHoursSettings): boolean {
  return SUPPORT_DAY_KEYS.every((key) => {
    const day = settings.days[key];
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.start)) return false;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(day.end)) return false;
    return !day.enabled || day.start < day.end;
  });
}

export async function getSupportHoursSettings(): Promise<SupportHoursSettings> {
  const db = getDatabase();
  const [row] = await db
    .select({ value: operationsSettings.value })
    .from(operationsSettings)
    .where(eq(operationsSettings.key, "support_hours"))
    .limit(1);

  return row ? normalizeSettings(row.value) : structuredClone(DEFAULT_SETTINGS);
}

export async function updateSupportHoursSettings(
  actorUserId: string,
  settings: SupportHoursSettings,
): Promise<void> {
  if (!isValidSupportHours(settings)) throw new Error("SUPPORT_HOURS_INVALID");

  const normalized = normalizeSettings(settings);
  normalized.configured = settings.configured;
  const db = getDatabase();
  const now = new Date();

  await db
    .insert(operationsSettings)
    .values({ key: "support_hours", value: normalized, updatedBy: actorUserId, updatedAt: now })
    .onConflictDoUpdate({
      target: operationsSettings.key,
      set: { value: normalized, updatedBy: actorUserId, updatedAt: now },
    });

  await recordAuditEvent({
    actorUserId,
    action: "operations.support_hours.updated",
    entityType: "operations_settings",
    entityId: "support_hours",
    metadata: { configured: normalized.configured },
  });
}
