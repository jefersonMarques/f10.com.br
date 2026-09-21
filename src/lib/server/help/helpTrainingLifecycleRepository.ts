import { eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpTrainingPaths } from "$lib/server/db/helpTrainingSchema";

export async function getHelpTrainingLifecycleState(pathId: string) {
  const [path] = await getDatabase()
    .select({
      id: helpTrainingPaths.id,
      slug: helpTrainingPaths.slug,
      status: helpTrainingPaths.status,
      currentVersion: helpTrainingPaths.currentVersion,
    })
    .from(helpTrainingPaths)
    .where(eq(helpTrainingPaths.id, pathId))
    .limit(1);
  return path ?? null;
}

export async function restoreHelpTrainingPath(actorUserId: string, pathId: string): Promise<void> {
  const db = getDatabase();
  const path = await getHelpTrainingLifecycleState(pathId);

  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.status !== "archived") return;
  if (path.currentVersion < 1) throw new Error("TRAINING_NEVER_PUBLISHED");

  const now = new Date();
  await db
    .update(helpTrainingPaths)
    .set({
      status: "draft",
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .where(eq(helpTrainingPaths.id, pathId));

  await recordAuditEvent({
    actorUserId,
    action: "help.training.restored",
    entityType: "help_training_path",
    entityId: pathId,
    metadata: { slug: path.slug, version: path.currentVersion },
  });
}
