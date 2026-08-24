import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { HELP_IMAGE_ANNOTATIONS_METADATA_KEY } from "$lib/help/helpImageAnnotations";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpAssets,
  helpContentSteps,
  helpContents,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { deleteAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";

const REVIEW_TTL_MS = 24 * 60 * 60 * 1_000;

type ScreenshotReviewMetadata = {
  screenshotReview?: {
    pending?: boolean;
    role?: "recommended" | "candidate";
    stepId?: string;
    candidateIndex?: number;
    timeSeconds?: number;
    expiresAt?: string;
  };
};

export type HelpScreenshotReviewCandidateInput = {
  stepIndex: number;
  candidateIndex: number;
  timeSeconds: number;
  recommended: boolean;
  altText: string;
  assistantDescription: string;
  bytes: Uint8Array;
};

export type HelpScreenshotReviewGroup = {
  stepId: string;
  blockId: string;
  recommendedAssetId: string;
  candidates: Array<{
    assetId: string;
    candidateIndex: number;
    timeSeconds: number | null;
    recommended: boolean;
  }>;
};

function reviewMetadata(value: Record<string, unknown> | null | undefined) {
  const review = (value as ScreenshotReviewMetadata | null | undefined)?.screenshotReview;
  if (!review || review.pending !== true || !review.stepId || !review.role) return null;
  return review;
}

function clearReviewMetadata(value: Record<string, unknown> | null | undefined) {
  const metadata = { ...(value ?? {}) };
  delete (metadata as ScreenshotReviewMetadata).screenshotReview;
  return metadata;
}

async function deleteStoredAssets(
  assets: Array<{ storageKey: string | null }>,
): Promise<void> {
  await Promise.allSettled(
    assets.flatMap((asset) => asset.storageKey ? [deleteAssetObject(asset.storageKey)] : []),
  );
}

async function cleanupExpiredCandidates(contentId: string): Promise<void> {
  const db = getDatabase();
  const rows = await db
    .select({
      id: helpAssets.id,
      storageKey: helpAssets.storageKey,
      metadata: helpAssets.metadata,
    })
    .from(helpAssets)
    .where(and(eq(helpAssets.contentId, contentId), eq(helpAssets.assetType, "image")));
  const now = Date.now();
  const expired = rows.filter((row) => {
    const review = reviewMetadata(row.metadata);
    if (!review || review.role !== "candidate" || !review.expiresAt) return false;
    const expiresAt = Date.parse(review.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt <= now;
  });
  if (expired.length === 0) return;

  await db.delete(helpAssets).where(inArray(helpAssets.id, expired.map((row) => row.id)));
  await deleteStoredAssets(expired);
}

async function contentStepRows(contentId: string) {
  return getDatabase()
    .select({ id: helpContentSteps.id })
    .from(helpContentSteps)
    .where(eq(helpContentSteps.contentId, contentId))
    .orderBy(helpContentSteps.sortOrder);
}

async function imageBlocksByStep(stepIds: string[]) {
  if (stepIds.length === 0) return new Map<string, { blockId: string; assetId: string }>();
  const rows = await getDatabase()
    .select({
      stepId: helpStepBlocks.stepId,
      blockId: helpStepBlocks.id,
      assetId: helpStepBlocks.assetId,
    })
    .from(helpStepBlocks)
    .where(
      and(
        inArray(helpStepBlocks.stepId, stepIds),
        eq(helpStepBlocks.blockType, "image"),
      ),
    )
    .orderBy(helpStepBlocks.sortOrder);

  const result = new Map<string, { blockId: string; assetId: string }>();
  for (const row of rows) {
    if (row.assetId && !result.has(row.stepId)) {
      result.set(row.stepId, { blockId: row.blockId, assetId: row.assetId });
    }
  }
  return result;
}

export async function replaceHelpScreenshotReviewCandidates(
  actorUserId: string,
  contentId: string,
  candidates: HelpScreenshotReviewCandidateInput[],
): Promise<void> {
  if (candidates.length === 0) return;
  const db = getDatabase();
  const steps = await contentStepRows(contentId);
  const blockByStep = await imageBlocksByStep(steps.map((step) => step.id));
  const existingAssets = await db
    .select({ id: helpAssets.id, storageKey: helpAssets.storageKey, metadata: helpAssets.metadata })
    .from(helpAssets)
    .where(and(eq(helpAssets.contentId, contentId), eq(helpAssets.assetType, "image")));
  const oldCandidates = existingAssets.filter(
    (asset) => reviewMetadata(asset.metadata)?.role === "candidate",
  );
  const metadataByAssetId = new Map(existingAssets.map((asset) => [asset.id, asset.metadata]));
  const expiresAt = new Date(Date.now() + REVIEW_TTL_MS).toISOString();

  const prepared: Array<{
    stepId: string;
    candidate: HelpScreenshotReviewCandidateInput;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
  }> = [];

  try {
    for (const candidate of candidates) {
      if (candidate.recommended) continue;
      const step = steps[candidate.stepIndex];
      if (!step || !blockByStep.has(step.id)) continue;
      const storageKey = `help/review/${contentId}/${step.id}/${randomUUID()}.jpg`;
      const stored = await putAssetObject(storageKey, candidate.bytes, "image/jpeg");
      prepared.push({
        stepId: step.id,
        candidate,
        storageKey: stored.key,
        mimeType: stored.contentType,
        sizeBytes: stored.size,
        checksumSha256: stored.checksumSha256,
      });
    }

    await db.transaction(async (tx) => {
      if (oldCandidates.length > 0) {
        await tx.delete(helpAssets).where(inArray(helpAssets.id, oldCandidates.map((asset) => asset.id)));
      }

      for (const [stepIndex, step] of steps.entries()) {
        const block = blockByStep.get(step.id);
        if (!block) continue;
        const recommended = candidates.find(
          (candidate) => candidate.stepIndex === stepIndex && candidate.recommended,
        );
        if (!recommended) continue;
        await tx
          .update(helpAssets)
          .set({
            metadata: {
              ...(metadataByAssetId.get(block.assetId) ?? {}),
              screenshotReview: {
                pending: true,
                role: "recommended",
                stepId: step.id,
                candidateIndex: recommended.candidateIndex,
                timeSeconds: recommended.timeSeconds,
                expiresAt,
              },
            },
            updatedAt: new Date(),
          })
          .where(eq(helpAssets.id, block.assetId));
      }

      if (prepared.length > 0) {
        await tx.insert(helpAssets).values(
          prepared.map((item) => ({
            contentId,
            assetType: "image" as const,
            storageKey: item.storageKey,
            originalName: `review-step-${item.candidate.stepIndex + 1}-${item.candidate.candidateIndex}.jpg`,
            mimeType: item.mimeType,
            sizeBytes: item.sizeBytes,
            checksumSha256: item.checksumSha256,
            altText: item.candidate.altText,
            assistantDescription: item.candidate.assistantDescription,
            metadata: {
              screenshotReview: {
                pending: true,
                role: "candidate",
                stepId: item.stepId,
                candidateIndex: item.candidate.candidateIndex,
                timeSeconds: item.candidate.timeSeconds,
                expiresAt,
              },
            },
            createdBy: actorUserId,
          })),
        );
      }
    });
  } catch (cause) {
    await deleteStoredAssets(prepared.map((item) => ({ storageKey: item.storageKey })));
    throw cause;
  }

  await deleteStoredAssets(oldCandidates);
}

export async function listHelpScreenshotReviewGroups(
  contentId: string,
): Promise<HelpScreenshotReviewGroup[]> {
  await cleanupExpiredCandidates(contentId);
  const db = getDatabase();
  const steps = await contentStepRows(contentId);
  const blockByStep = await imageBlocksByStep(steps.map((step) => step.id));
  const assets = await db
    .select({ id: helpAssets.id, metadata: helpAssets.metadata })
    .from(helpAssets)
    .where(and(eq(helpAssets.contentId, contentId), eq(helpAssets.assetType, "image")));
  const assetMetadata = new Map(assets.map((asset) => [asset.id, asset.metadata]));
  const result: HelpScreenshotReviewGroup[] = [];

  for (const step of steps) {
    const block = blockByStep.get(step.id);
    if (!block) continue;
    const recommendedReview = reviewMetadata(assetMetadata.get(block.assetId));
    const extras = assets.flatMap((asset) => {
      const review = reviewMetadata(asset.metadata);
      if (!review || review.role !== "candidate" || review.stepId !== step.id) return [];
      return [{
        assetId: asset.id,
        candidateIndex: Number(review.candidateIndex ?? 0),
        timeSeconds: Number.isFinite(Number(review.timeSeconds)) ? Number(review.timeSeconds) : null,
        recommended: false,
      }];
    });
    if (extras.length === 0) continue;

    result.push({
      stepId: step.id,
      blockId: block.blockId,
      recommendedAssetId: block.assetId,
      candidates: [
        {
          assetId: block.assetId,
          candidateIndex: Number(recommendedReview?.candidateIndex ?? 0),
          timeSeconds: Number.isFinite(Number(recommendedReview?.timeSeconds))
            ? Number(recommendedReview?.timeSeconds)
            : null,
          recommended: true,
        },
        ...extras,
      ].sort((left, right) => left.candidateIndex - right.candidateIndex),
    });
  }

  return result;
}

export async function confirmHelpScreenshotReviewSelection(input: {
  actorUserId: string;
  contentId: string;
  blockId: string;
  assetId: string;
}): Promise<void> {
  const db = getDatabase();
  const [row] = await db
    .select({
      blockId: helpStepBlocks.id,
      stepId: helpStepBlocks.stepId,
      blockType: helpStepBlocks.blockType,
      blockMetadata: helpStepBlocks.metadata,
      currentAssetId: helpStepBlocks.assetId,
      contentStatus: helpContents.status,
    })
    .from(helpStepBlocks)
    .innerJoin(helpContentSteps, eq(helpStepBlocks.stepId, helpContentSteps.id))
    .innerJoin(helpContents, eq(helpContentSteps.contentId, helpContents.id))
    .where(
      and(
        eq(helpStepBlocks.id, input.blockId),
        eq(helpContentSteps.contentId, input.contentId),
      ),
    )
    .limit(1);

  if (!row || row.blockType !== "image" || !row.currentAssetId) {
    throw new Error("IMAGE_BLOCK_NOT_FOUND");
  }
  if (row.contentStatus === "archived") throw new Error("CONTENT_ARCHIVED");

  const assets = await db
    .select({
      id: helpAssets.id,
      storageKey: helpAssets.storageKey,
      metadata: helpAssets.metadata,
    })
    .from(helpAssets)
    .where(and(eq(helpAssets.contentId, input.contentId), eq(helpAssets.assetType, "image")));
  const current = assets.find((asset) => asset.id === row.currentAssetId);
  const candidates = assets.filter((asset) => {
    const review = reviewMetadata(asset.metadata);
    return review?.role === "candidate" && review.stepId === row.stepId;
  });
  const selected = input.assetId === row.currentAssetId
    ? current
    : candidates.find((asset) => asset.id === input.assetId);
  if (!selected) throw new Error("SCREENSHOT_REVIEW_ASSET_INVALID");

  const removable = candidates.filter((asset) => asset.id !== selected.id);
  if (selected.id !== row.currentAssetId && current) {
    const review = reviewMetadata(current.metadata);
    if (review?.role === "recommended" && review.stepId === row.stepId) removable.push(current);
  }

  const updatedAt = new Date();
  await db.transaction(async (tx) => {
    if (selected.id !== row.currentAssetId) {
      const blockMetadata = { ...(row.blockMetadata ?? {}) };
      delete blockMetadata[HELP_IMAGE_ANNOTATIONS_METADATA_KEY];
      await tx
        .update(helpStepBlocks)
        .set({ assetId: selected.id, metadata: blockMetadata, updatedAt })
        .where(eq(helpStepBlocks.id, row.blockId));
    }

    await tx
      .update(helpAssets)
      .set({ metadata: clearReviewMetadata(selected.metadata), updatedAt })
      .where(eq(helpAssets.id, selected.id));

    if (removable.length > 0) {
      await tx.delete(helpAssets).where(inArray(helpAssets.id, removable.map((asset) => asset.id)));
    }

    await tx
      .update(helpContents)
      .set({ status: "draft", updatedBy: input.actorUserId, updatedAt })
      .where(eq(helpContents.id, input.contentId));
  });

  await deleteStoredAssets(removable);
  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "help.image.review.confirmed",
    entityType: "help_step_block",
    entityId: input.blockId,
    metadata: {
      contentId: input.contentId,
      selectedAssetId: selected.id,
      changed: selected.id !== row.currentAssetId,
      discardedCandidates: removable.length,
    },
  });
}
