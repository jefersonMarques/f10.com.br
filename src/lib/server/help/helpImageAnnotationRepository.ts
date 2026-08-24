import { and, eq } from "drizzle-orm";
import {
  HELP_IMAGE_ANNOTATIONS_METADATA_KEY,
  type HelpImageAnnotation,
} from "$lib/help/helpImageAnnotations";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpAssets,
  helpContentSteps,
  helpContents,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";

export async function updateHelpImageBlockAnnotations(
  actorUserId: string,
  contentId: string,
  blockId: string,
  annotations: HelpImageAnnotation[],
): Promise<void> {
  const db = getDatabase();
  const [row] = await db
    .select({
      blockId: helpStepBlocks.id,
      blockType: helpStepBlocks.blockType,
      metadata: helpStepBlocks.metadata,
      assetId: helpStepBlocks.assetId,
      assetType: helpAssets.assetType,
      contentStatus: helpContents.status,
    })
    .from(helpStepBlocks)
    .innerJoin(helpContentSteps, eq(helpStepBlocks.stepId, helpContentSteps.id))
    .innerJoin(helpContents, eq(helpContentSteps.contentId, helpContents.id))
    .leftJoin(helpAssets, eq(helpStepBlocks.assetId, helpAssets.id))
    .where(
      and(
        eq(helpStepBlocks.id, blockId),
        eq(helpContentSteps.contentId, contentId),
      ),
    )
    .limit(1);

  if (!row || row.blockType !== "image" || !row.assetId || row.assetType !== "image") {
    throw new Error("IMAGE_BLOCK_NOT_FOUND");
  }
  if (row.contentStatus === "archived") throw new Error("CONTENT_ARCHIVED");

  const updatedAt = new Date();
  const metadata = {
    ...(row.metadata ?? {}),
    [HELP_IMAGE_ANNOTATIONS_METADATA_KEY]: annotations,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(helpStepBlocks)
      .set({ metadata, updatedAt })
      .where(eq(helpStepBlocks.id, blockId));
    await tx
      .update(helpContents)
      .set({
        status: "draft",
        updatedBy: actorUserId,
        updatedAt,
      })
      .where(eq(helpContents.id, contentId));
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.image.annotations.updated",
    entityType: "help_step_block",
    entityId: blockId,
    metadata: {
      contentId,
      annotationCount: annotations.length,
      annotationTypes: Array.from(new Set(annotations.map((annotation) => annotation.type))),
    },
  });
}
