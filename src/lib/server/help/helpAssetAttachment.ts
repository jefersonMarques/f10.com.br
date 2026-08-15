import { asc, eq, max } from "drizzle-orm";
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
  const db = getDatabase();
  return db
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
): Promise<void> {
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

  const [{ value: currentMax }] = await db
    .select({ value: max(helpStepBlocks.sortOrder) })
    .from(helpStepBlocks)
    .where(eq(helpStepBlocks.stepId, stepId));

  await db.insert(helpStepBlocks).values({
    stepId,
    blockType: asset.assetType,
    assetId: asset.id,
    linkLabel:
      asset.assetType === "file"
        ? label.trim().slice(0, 240) || asset.originalName || "Baixar arquivo"
        : null,
    sortOrder: Number(currentMax ?? 0) + 10,
  });

  // Reaproveita o pipeline existente para voltar o conteúdo a rascunho e versionar.
  await updateStructuredHelpStep(actorUserId, step.contentId, step.id, {
    title: step.title,
    description: step.description,
    aiKnowledge: step.aiKnowledge,
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.asset.attached",
    entityType: "help_asset",
    entityId: asset.id,
    metadata: { contentId: step.contentId, stepId, blockType: asset.assetType },
  });
}
