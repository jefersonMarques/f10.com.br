import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { operationsSettings } from "$lib/server/db/operationsSettingsSchema";
import { recordAuditEvent } from "$lib/server/auth/audit";

const SETTINGS_KEY = "finance_read_only";

export async function isFinanceReadOnlyEnabled(): Promise<boolean> {
  const [setting] = await getDatabase()
    .select({ value: operationsSettings.value })
    .from(operationsSettings)
    .where(eq(operationsSettings.key, SETTINGS_KEY))
    .limit(1);

  return setting?.value?.enabled === true;
}

export async function updateFinanceReadOnlySettings(
  actorUserId: string,
  enabled: boolean,
): Promise<void> {
  const value = { enabled };
  const now = new Date();

  await getDatabase()
    .insert(operationsSettings)
    .values({ key: SETTINGS_KEY, value, updatedBy: actorUserId, updatedAt: now })
    .onConflictDoUpdate({
      target: operationsSettings.key,
      set: { value, updatedBy: actorUserId, updatedAt: now },
    });

  await recordAuditEvent({
    actorUserId,
    action: "operations.finance.read_only.updated",
    entityType: "operations_settings",
    entityId: SETTINGS_KEY,
    metadata: { enabled },
  });
}
