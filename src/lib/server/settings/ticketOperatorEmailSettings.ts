import { and, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { operationsSettings } from "$lib/server/db/operationsSettingsSchema";
import { roles, userRoles } from "$lib/server/db/schema";
import { listEligibleTicketResponders } from "$lib/server/support/supportRoutingRepository";

const SETTINGS_KEY = "ticket_operator_email_notifications";
const MAX_RECIPIENTS = 100;

export type TicketOperatorEmailSettings = {
  enabled: boolean;
  customerAttachments: boolean;
  recipientUserIds: string[];
};

export async function isSuperAdminUser(userId: string): Promise<boolean> {
  const [role] = await getDatabase()
    .select({ id: roles.id })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, userId), eq(roles.code, "SUPER_ADMIN")))
    .limit(1);

  return Boolean(role);
}

export async function getTicketOperatorEmailSettings(): Promise<TicketOperatorEmailSettings> {
  const [record] = await getDatabase()
    .select({ value: operationsSettings.value })
    .from(operationsSettings)
    .where(eq(operationsSettings.key, SETTINGS_KEY))
    .limit(1);

  const value = record?.value;
  const selected = Array.isArray(value?.recipientUserIds)
    ? value.recipientUserIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    enabled: value?.enabled === true,
    customerAttachments: value?.customerAttachments !== false,
    recipientUserIds: Array.from(new Set(selected)).slice(0, MAX_RECIPIENTS),
  };
}

export async function saveTicketOperatorEmailSettings(
  actorUserId: string,
  value: TicketOperatorEmailSettings,
): Promise<void> {
  if (!await isSuperAdminUser(actorUserId)) {
    throw new Error("TICKET_OPERATOR_EMAIL_ADMIN_REQUIRED");
  }

  const recipientUserIds = Array.from(new Set(value.recipientUserIds));
  if (recipientUserIds.length > MAX_RECIPIENTS) {
    throw new Error("TICKET_OPERATOR_EMAIL_TOO_MANY_RECIPIENTS");
  }

  const eligible = await listEligibleTicketResponders();
  const permitted = new Set(eligible.map((user) => user.id));
  if (recipientUserIds.some((id) => !permitted.has(id))) {
    throw new Error("TICKET_OPERATOR_EMAIL_INVALID_RECIPIENT");
  }

  const normalized: TicketOperatorEmailSettings = {
    enabled: value.enabled,
    customerAttachments: value.customerAttachments,
    recipientUserIds,
  };
  const now = new Date();

  await getDatabase().insert(operationsSettings)
    .values({
      key: SETTINGS_KEY,
      value: normalized,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: operationsSettings.key,
      set: {
        value: normalized,
        updatedBy: actorUserId,
        updatedAt: now,
      },
    });

  await recordAuditEvent({
    actorUserId,
    action: "operations.ticket_operator_email.settings.updated",
    entityType: "operations_settings",
    entityId: SETTINGS_KEY,
    metadata: {
      enabled: normalized.enabled,
      customerAttachments: normalized.customerAttachments,
      recipientCount: normalized.recipientUserIds.length,
    },
  });
}
