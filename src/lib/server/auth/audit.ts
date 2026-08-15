import { getDatabase } from "$lib/server/db";
import { auditLogs } from "$lib/server/db/schema";

export type AuditEvent = {
  actorUserId?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  const db = getDatabase();

  await db.insert(auditLogs).values({
    actorUserId: event.actorUserId ?? null,
    action: event.action,
    entityType: event.entityType ?? null,
    entityId: event.entityId ?? null,
    metadata: event.metadata ?? {},
  });
}
