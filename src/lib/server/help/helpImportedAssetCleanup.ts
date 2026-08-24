import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import {
  helpAssets,
  helpContentFeaturedVideos,
  helpContentSteps,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { deleteAssetObject } from "$lib/server/storage/assetStorage";

export async function cleanupObsoleteImportedHelpAssets(contentId: string): Promise<void> {
  const db = getDatabase();
  const steps = await db
    .select({ id: helpContentSteps.id })
    .from(helpContentSteps)
    .where(eq(helpContentSteps.contentId, contentId));
  const stepIds = steps.map((step) => step.id);

  const [featured, blockAssets, assets] = await Promise.all([
    db
      .select({ assetId: helpContentFeaturedVideos.assetId })
      .from(helpContentFeaturedVideos)
      .where(eq(helpContentFeaturedVideos.contentId, contentId)),
    stepIds.length
      ? db
          .select({ assetId: helpStepBlocks.assetId })
          .from(helpStepBlocks)
          .where(inArray(helpStepBlocks.stepId, stepIds))
      : Promise.resolve([]),
    db
      .select({ id: helpAssets.id, storageKey: helpAssets.storageKey })
      .from(helpAssets)
      .where(eq(helpAssets.contentId, contentId)),
  ]);

  const referencedAssetIds = new Set<string>([
    ...featured.map((item) => item.assetId),
    ...blockAssets.flatMap((item) => (item.assetId ? [item.assetId] : [])),
  ]);
  const importPrefix = `help/import/${contentId}/`;
  const obsolete = assets.filter(
    (asset) =>
      !referencedAssetIds.has(asset.id) &&
      Boolean(asset.storageKey?.startsWith(importPrefix)),
  );
  if (obsolete.length === 0) return;

  await db.delete(helpAssets).where(inArray(helpAssets.id, obsolete.map((asset) => asset.id)));
  await Promise.allSettled(
    obsolete.flatMap((asset) =>
      asset.storageKey ? [deleteAssetObject(asset.storageKey)] : [],
    ),
  );
}
