import { and, eq, inArray } from "drizzle-orm";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { getDatabase } from "$lib/server/db";
import {
  supportMessageTaskLinks,
  type TaskMessageOrigin,
} from "$lib/server/db/supportMessageTaskSchema";
import { tasks } from "$lib/server/db/taskSchema";
import { ensureTaskAccess } from "$lib/server/tasks/taskAccess";
import type { SupportPermissionMap } from "$lib/server/support/supportAccess";

export type MessageTaskLink = { id: string; title: string };

export async function listMessageTaskLinks(
  actorUserId: string,
  permissions: SupportPermissionMap,
  sourceKind: TaskMessageOrigin["sourceKind"],
  messageIds: string[],
): Promise<Map<string, MessageTaskLink[]>> {
  const result = new Map<string, MessageTaskLink[]>();
  const taskScope = getPermissionScope(permissions, "tasks.view");
  const uniqueIds = Array.from(new Set(messageIds));
  if (!taskScope || uniqueIds.length === 0) return result;

  const rows = await getDatabase()
    .select({
      messageId: supportMessageTaskLinks.messageId,
      taskId: tasks.id,
      title: tasks.title,
    })
    .from(supportMessageTaskLinks)
    .innerJoin(tasks, eq(tasks.id, supportMessageTaskLinks.taskId))
    .where(and(
      eq(supportMessageTaskLinks.sourceKind, sourceKind),
      inArray(supportMessageTaskLinks.messageId, uniqueIds),
    ));

  const access = await Promise.all(rows.map(async (row) => {
    try {
      await ensureTaskAccess(actorUserId, taskScope, row.taskId);
      return row;
    } catch {
      return null;
    }
  }));

  for (const row of access) {
    if (!row) continue;
    const previous = result.get(row.messageId) ?? [];
    previous.push({ id: row.taskId, title: row.title });
    result.set(row.messageId, previous);
  }

  return result;
}
