import { eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { operationsSettings } from "$lib/server/db/operationsSettingsSchema";

export type ChatWaitingSettings = {
  enabled: boolean;
  delaySeconds: number;
  notifyTeam: boolean;
  repeatSeconds: number;
  offerTicket: boolean;
};

const SETTINGS_KEY = "chat_waiting";
export const DEFAULT_CHAT_WAITING_SETTINGS: ChatWaitingSettings = {
  enabled: true,
  delaySeconds: 45,
  notifyTeam: true,
  repeatSeconds: 120,
  offerTicket: true,
};

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function normalizeSettings(value: Record<string, unknown>): ChatWaitingSettings {
  const defaults = DEFAULT_CHAT_WAITING_SETTINGS;
  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : defaults.enabled,
    delaySeconds: boundedInteger(value.delaySeconds, defaults.delaySeconds, 10, 3600),
    notifyTeam: typeof value.notifyTeam === "boolean" ? value.notifyTeam : defaults.notifyTeam,
    repeatSeconds: boundedInteger(value.repeatSeconds, defaults.repeatSeconds, 60, 3600),
    offerTicket: typeof value.offerTicket === "boolean" ? value.offerTicket : defaults.offerTicket,
  };
}

export async function getChatWaitingSettings(): Promise<ChatWaitingSettings> {
  const [row] = await getDatabase()
    .select({ value: operationsSettings.value })
    .from(operationsSettings)
    .where(eq(operationsSettings.key, SETTINGS_KEY))
    .limit(1);
  return normalizeSettings(row?.value ?? {});
}

export async function updateChatWaitingSettings(actorUserId: string, input: ChatWaitingSettings): Promise<void> {
  const value = normalizeSettings(input);
  const updatedAt = new Date();
  await getDatabase().insert(operationsSettings)
    .values({ key: SETTINGS_KEY, value, updatedBy: actorUserId, updatedAt })
    .onConflictDoUpdate({ target: operationsSettings.key, set: { value, updatedBy: actorUserId, updatedAt } });
  await recordAuditEvent({
    actorUserId,
    action: "operations.settings.updated",
    entityType: "operations_settings",
    entityId: SETTINGS_KEY,
    metadata: value,
  });
}
