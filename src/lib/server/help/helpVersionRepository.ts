import { and, eq, max } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpContentVersions } from "$lib/server/db/schema";

export async function saveHelpContentVersion(
  entityType: string,
  entityId: string,
  snapshot: Record<string, unknown>,
  actorUserId: string,
): Promise<void> {
  const db = getDatabase();
  const versionResult = await db
    .select({ version: max(helpContentVersions.version) })
    .from(helpContentVersions)
    .where(
      and(
        eq(helpContentVersions.entityType, entityType),
        eq(helpContentVersions.entityId, entityId),
      ),
    );

  const nextVersion = Number(versionResult[0]?.version ?? 0) + 1;

  await db.insert(helpContentVersions).values({
    entityType,
    entityId,
    version: nextVersion,
    snapshot,
    createdBy: actorUserId,
  });
}
