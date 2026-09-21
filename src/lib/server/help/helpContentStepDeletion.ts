import { and, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpContentSteps,
  helpContents,
} from "$lib/server/db/structuredHelpSchema";
import { deleteManagedHelpAsset } from "$lib/server/help/helpAssetRepository";
import {
  deleteStructuredHelpStep,
  getStructuredHelpContent,
} from "$lib/server/help/structuredHelpRepository";
import { saveHelpContentVersion } from "$lib/server/help/helpVersionRepository";

function serializeAsset(
  asset: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>["featuredVideo"],
) {
  if (!asset) return null;
  return {
    id: asset.id,
    assetType: asset.assetType,
    sourceUrl: asset.sourceUrl,
    storageKey: asset.storageKey,
    altText: asset.altText,
    assistantDescription: asset.assistantDescription,
    subtitles: asset.subtitles,
    assistantSummary: asset.assistantSummary,
    extractedText: asset.extractedText,
  };
}

function versionSnapshot(
  content: NonNullable<Awaited<ReturnType<typeof getStructuredHelpContent>>>,
) {
  return {
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    searchAliases: content.searchAliases,
    assistantKnowledge: content.assistantKnowledge,
    internalSupportNotes: content.internalSupportNotes,
    categories: content.categories,
    featuredVideo: serializeAsset(content.featuredVideo),
    status: content.status,
    publishedAt: content.publishedAt?.toISOString() ?? null,
    steps: content.steps.map((step) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      assistantKnowledge: step.assistantKnowledge,
      sortOrder: step.sortOrder,
      blocks: step.blocks.map((block) => ({
        id: block.id,
        blockType: block.blockType,
        textContent: block.textContent,
        linkUrl: block.linkUrl,
        linkLabel: block.linkLabel,
        noticeVariant: block.noticeVariant,
        sortOrder: block.sortOrder,
        asset: serializeAsset(block.asset),
      })),
    })),
  };
}

export async function deleteHelpContentStep(
  actorUserId: string,
  contentId: string,
  stepId: string,
): Promise<void> {
  const content = await getStructuredHelpContent(contentId);
  if (!content) throw new Error("CONTENT_NOT_FOUND");
  if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

  const step = content.steps.find((candidate) => candidate.id === stepId);
  if (!step) throw new Error("STEP_NOT_FOUND");

  if (content.steps.length > 1) {
    await deleteStructuredHelpStep(actorUserId, contentId, stepId);
    return;
  }

  const assetIds = step.blocks.flatMap((block) => block.asset ? [block.asset.id] : []);
  const now = new Date();
  const db = getDatabase();

  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(helpContentSteps)
      .where(
        and(
          eq(helpContentSteps.id, stepId),
          eq(helpContentSteps.contentId, contentId),
        ),
      )
      .returning({ id: helpContentSteps.id });
    if (!deleted) throw new Error("STEP_NOT_FOUND");

    await tx
      .update(helpContents)
      .set({
        status: "draft",
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(helpContents.id, contentId));
  });

  const updated = await getStructuredHelpContent(contentId);
  if (updated) {
    await saveHelpContentVersion(
      "content",
      contentId,
      versionSnapshot(updated),
      actorUserId,
    );
  }

  await Promise.allSettled(
    assetIds.map((assetId) => deleteManagedHelpAsset(actorUserId, assetId)),
  );

  await recordAuditEvent({
    actorUserId,
    action: "help.content.step.deleted",
    entityType: "help_content_step",
    entityId: stepId,
    metadata: {
      contentId,
      remainingStepCount: 0,
    },
  });
}
