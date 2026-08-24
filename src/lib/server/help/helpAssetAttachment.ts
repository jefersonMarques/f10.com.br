import { and, asc, eq, max } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpAssets,
  helpContents,
  helpContentSteps,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { updateStructuredHelpStep } from "$lib/server/help/structuredHelpRepository";

export async function listHelpAssetAttachmentTargets() {
  return getDatabase()
    .select({
      contentId: helpContents.id,
      contentTitle: helpContents.title,
      contentStatus: helpContents.status,
      stepId: helpContentSteps.id,
      stepTitle: helpContentSteps.title,
      stepSortOrder: helpContentSteps.sortOrder,
    })
    .from(helpContentSteps)
    .innerJoin(helpContents, eq(helpContentSteps.contentId, helpContents.id))
    .orderBy(asc(helpContents.title), asc(helpContentSteps.sortOrder));
}

export async function attachHelpAssetToStep(
  actorUserId: string,
  assetId: string,
  stepId: string,
  label: string,
): Promise<{ blockId: string; contentId: string }> {
  const db = getDatabase();
  const [[asset], [step]] = await Promise.all([
    db.select().from(helpAssets).where(eq(helpAssets.id, assetId)).limit(1),
    db.select().from(helpContentSteps).where(eq(helpContentSteps.id, stepId)).limit(1),
  ]);
  if (!asset || !step) throw new Error("ASSET_ATTACHMENT_NOT_FOUND");
  if (asset.assetType !== "image" && asset.assetType !== "file") {
    throw new Error("ASSET_ATTACHMENT_TYPE_NOT_SUPPORTED");
  }
  if (!asset.storageKey && !asset.sourceUrl) throw new Error("ASSET_ATTACHMENT_UNAVAILABLE");

  if (asset.assetType === "image") {
    const [existingImage] = await db
      .select({ id: helpStepBlocks.id })
      .from(helpStepBlocks)
      .where(
        and(
          eq(helpStepBlocks.stepId, stepId),
          eq(helpStepBlocks.blockType, "image"),
        ),
      )
      .limit(1);
    if (existingImage) throw new Error("STEP_IMAGE_ALREADY_EXISTS");
  }

  const [{ value: currentMax }] = await db
    .select({ value: max(helpStepBlocks.sortOrder) })
    .from(helpStepBlocks)
    .where(eq(helpStepBlocks.stepId, stepId));

  const [createdBlock] = await db
    .insert(helpStepBlocks)
    .values({
      stepId,
      blockType: asset.assetType,
      assetId: asset.id,
      linkLabel:
        asset.assetType === "file"
          ? label.trim().slice(0, 240) || asset.originalName || "Baixar arquivo"
          : null,
      sortOrder: Number(currentMax ?? 0) + 10,
    })
    .returning({ id: helpStepBlocks.id });
  if (!createdBlock) throw new Error("ASSET_ATTACHMENT_NOT_CREATED");

  await updateStructuredHelpStep(actorUserId, step.contentId, step.id, {
    title: step.title,
    description: step.description,
    assistantKnowledge: step.assistantKnowledge,
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.asset.attached",
    entityType: "help_asset",
    entityId: asset.id,
    metadata: {
      contentId: step.contentId,
      stepId,
      blockId: createdBlock.id,
      blockType: asset.assetType,
    },
  });

  return { blockId: createdBlock.id, contentId: step.contentId };
}
