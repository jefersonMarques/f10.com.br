import { and, asc, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpContentSteps,
  helpContents,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";

export type HelpMoveDirection = "up" | "down";

async function markDraft(contentId: string, actorUserId: string): Promise<void> {
  await getDatabase()
    .update(helpContents)
    .set({ status: "draft", updatedBy: actorUserId, updatedAt: new Date() })
    .where(eq(helpContents.id, contentId));
}

export async function moveHelpStep(
  actorUserId: string,
  contentId: string,
  stepId: string,
  direction: HelpMoveDirection,
): Promise<void> {
  const db = getDatabase();
  const [content] = await db
    .select({ status: helpContents.status })
    .from(helpContents)
    .where(eq(helpContents.id, contentId))
    .limit(1);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

  const steps = await db
    .select({ id: helpContentSteps.id, sortOrder: helpContentSteps.sortOrder })
    .from(helpContentSteps)
    .where(eq(helpContentSteps.contentId, contentId))
    .orderBy(asc(helpContentSteps.sortOrder), asc(helpContentSteps.id));
  const index = steps.findIndex((step) => step.id === stepId);
  if (index < 0) throw new Error("STEP_NOT_FOUND");
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  const target = steps[targetIndex];
  const current = steps[index];
  if (!current || !target) return;

  await db.transaction(async (tx) => {
    await tx
      .update(helpContentSteps)
      .set({ sortOrder: target.sortOrder, updatedAt: new Date() })
      .where(eq(helpContentSteps.id, current.id));
    await tx
      .update(helpContentSteps)
      .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
      .where(eq(helpContentSteps.id, target.id));
  });
  await markDraft(contentId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.content.step.moved",
    entityType: "help_content_step",
    entityId: stepId,
    metadata: { contentId, direction },
  });
}

export async function moveHelpBlock(
  actorUserId: string,
  contentId: string,
  blockId: string,
  direction: HelpMoveDirection,
): Promise<void> {
  const db = getDatabase();
  const [row] = await db
    .select({
      stepId: helpStepBlocks.stepId,
      contentId: helpContentSteps.contentId,
      contentStatus: helpContents.status,
    })
    .from(helpStepBlocks)
    .innerJoin(helpContentSteps, eq(helpStepBlocks.stepId, helpContentSteps.id))
    .innerJoin(helpContents, eq(helpContentSteps.contentId, helpContents.id))
    .where(and(eq(helpStepBlocks.id, blockId), eq(helpContentSteps.contentId, contentId)))
    .limit(1);
  if (!row) throw new Error("BLOCK_NOT_FOUND");
  if (row.contentStatus === "archived") throw new Error("CONTENT_ARCHIVED");

  const blocks = await db
    .select({ id: helpStepBlocks.id, sortOrder: helpStepBlocks.sortOrder })
    .from(helpStepBlocks)
    .where(eq(helpStepBlocks.stepId, row.stepId))
    .orderBy(asc(helpStepBlocks.sortOrder), asc(helpStepBlocks.id));
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index < 0) throw new Error("BLOCK_NOT_FOUND");
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  const target = blocks[targetIndex];
  const current = blocks[index];
  if (!current || !target) return;

  await db.transaction(async (tx) => {
    await tx
      .update(helpStepBlocks)
      .set({ sortOrder: target.sortOrder, updatedAt: new Date() })
      .where(eq(helpStepBlocks.id, current.id));
    await tx
      .update(helpStepBlocks)
      .set({ sortOrder: current.sortOrder, updatedAt: new Date() })
      .where(eq(helpStepBlocks.id, target.id));
  });
  await markDraft(contentId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.content.block.moved",
    entityType: "help_step_block",
    entityId: blockId,
    metadata: { contentId, stepId: row.stepId, direction },
  });
}
