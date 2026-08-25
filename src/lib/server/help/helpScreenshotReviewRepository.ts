import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  HELP_IMAGE_ANNOTATIONS_METADATA_KEY,
  readHelpImageAnnotationsFromMetadata,
  type HelpImageAnnotation,
} from "$lib/help/helpImageAnnotations";
import {
  isHelpHumanReviewComplete,
  readHelpHumanReviewFromMetadata,
  withHelpHumanReview,
  withoutHelpHumanReview,
  type HelpHumanReviewInteraction,
} from "$lib/help/helpHumanReview";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpAssets,
  helpContentSteps,
  helpContents,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { createManagedHelpAsset } from "$lib/server/help/helpAssetRepository";
import { deleteAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";

const REVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

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

export type HelpHumanReviewStatus = {
  total: number;
  reviewed: number;
  pending: number;
  items: Array<{
    blockId: string;
    stepId: string;
    assetId: string;
    reviewed: boolean;
    reviewedAt: string | null;
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

  const expiredStepIds = new Set(
    expired.flatMap((asset) => {
      const stepId = reviewMetadata(asset.metadata)?.stepId;
      return stepId ? [stepId] : [];
    }),
  );
  const recommended = rows.filter((row) => {
    const review = reviewMetadata(row.metadata);
    return review?.role === "recommended" && expiredStepIds.has(review.stepId ?? "");
  });

  await db.transaction(async (tx) => {
    await tx.delete(helpAssets).where(inArray(helpAssets.id, expired.map((row) => row.id)));
    for (const asset of recommended) {
      await tx
        .update(helpAssets)
        .set({ metadata: clearReviewMetadata(asset.metadata), updatedAt: new Date() })
        .where(eq(helpAssets.id, asset.id));
    }
  });
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

async function imageReviewRows(contentId: string) {
  return getDatabase()
    .select({
      blockId: helpStepBlocks.id,
      stepId: helpStepBlocks.stepId,
      assetId: helpStepBlocks.assetId,
      metadata: helpStepBlocks.metadata,
    })
    .from(helpStepBlocks)
    .innerJoin(helpContentSteps, eq(helpStepBlocks.stepId, helpContentSteps.id))
    .where(
      and(
        eq(helpContentSteps.contentId, contentId),
        eq(helpStepBlocks.blockType, "image"),
      ),
    )
    .orderBy(helpContentSteps.sortOrder, helpStepBlocks.sortOrder);
}

export async function getHelpHumanReviewStatus(
  contentId: string,
): Promise<HelpHumanReviewStatus> {
  const rows = await imageReviewRows(contentId);
  const items = rows.flatMap((row) => {
    if (!row.assetId) return [];
    const review = readHelpHumanReviewFromMetadata(row.metadata);
    const reviewed = isHelpHumanReviewComplete(row.metadata, row.assetId);
    return [{
      blockId: row.blockId,
      stepId: row.stepId,
      assetId: row.assetId,
      reviewed,
      reviewedAt: reviewed ? review?.reviewedAt ?? null : null,
    }];
  });
  const reviewed = items.filter((item) => item.reviewed).length;
  return {
    total: items.length,
    reviewed,
    pending: items.length - reviewed,
    items,
  };
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
  annotations: HelpImageAnnotation[];
  interactions?: HelpHumanReviewInteraction[];
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

  const [[current], reviewAssets] = await Promise.all([
    db
      .select({
        id: helpAssets.id,
        storageKey: helpAssets.storageKey,
        metadata: helpAssets.metadata,
      })
      .from(helpAssets)
      .where(eq(helpAssets.id, row.currentAssetId))
      .limit(1),
    db
      .select({
        id: helpAssets.id,
        storageKey: helpAssets.storageKey,
        metadata: helpAssets.metadata,
      })
      .from(helpAssets)
      .where(and(eq(helpAssets.contentId, input.contentId), eq(helpAssets.assetType, "image"))),
  ]);
  const candidates = reviewAssets.filter((asset) => {
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

  const previousAnnotations = readHelpImageAnnotationsFromMetadata(row.blockMetadata);
  const annotationsChanged = JSON.stringify(previousAnnotations) !== JSON.stringify(input.annotations);
  const imageChanged = selected.id !== row.currentAssetId;
  const publicChanged = annotationsChanged || imageChanged;
  const updatedAt = new Date();
  const interactions = Array.from(new Set([
    ...(input.interactions ?? []),
    ...(imageChanged ? ["image_selected" as const] : []),
    ...(annotationsChanged ? ["annotated" as const] : []),
  ]));
  const blockMetadata = withHelpHumanReview(
    {
      ...(row.blockMetadata ?? {}),
      [HELP_IMAGE_ANNOTATIONS_METADATA_KEY]: input.annotations,
    },
    {
      actorUserId: input.actorUserId,
      assetId: selected.id,
      interactions: interactions.length > 0 ? interactions : ["confirmed"],
      reviewedAt: updatedAt,
    },
  );

  await db.transaction(async (tx) => {
    await tx
      .update(helpStepBlocks)
      .set({ assetId: selected.id, metadata: blockMetadata, updatedAt })
      .where(eq(helpStepBlocks.id, row.blockId));

    await tx
      .update(helpAssets)
      .set({ metadata: clearReviewMetadata(selected.metadata), updatedAt })
      .where(eq(helpAssets.id, selected.id));

    if (removable.length > 0) {
      await tx.delete(helpAssets).where(inArray(helpAssets.id, removable.map((asset) => asset.id)));
    }

    await tx
      .update(helpContents)
      .set({
        ...(publicChanged || row.contentStatus !== "published" ? { status: "draft" as const } : {}),
        updatedBy: input.actorUserId,
        updatedAt,
      })
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
      changed: imageChanged,
      annotationCount: input.annotations.length,
      interactions,
      discardedCandidates: removable.length,
    },
  });
}

export async function saveHelpHumanReviewBatch(input: {
  actorUserId: string;
  contentId: string;
  confirmUntouched: boolean;
  items: Array<{
    blockId: string;
    assetId: string;
    annotations: HelpImageAnnotation[];
    interactions: HelpHumanReviewInteraction[];
  }>;
}): Promise<HelpHumanReviewStatus> {
  const status = await getHelpHumanReviewStatus(input.contentId);
  const expected = new Map(status.items.map((item) => [item.blockId, item]));
  const supplied = new Map(input.items.map((item) => [item.blockId, item]));
  if (expected.size !== supplied.size || Array.from(expected.keys()).some((blockId) => !supplied.has(blockId))) {
    throw new Error("HUMAN_REVIEW_INCOMPLETE");
  }

  const untouchedPending = status.items.filter((item) => {
    if (item.reviewed) return false;
    return (supplied.get(item.blockId)?.interactions.length ?? 0) === 0;
  });
  if (untouchedPending.length > 0 && !input.confirmUntouched) {
    throw new Error("HUMAN_REVIEW_CONFIRMATION_REQUIRED");
  }

  for (const item of input.items) {
    const previous = expected.get(item.blockId);
    await confirmHelpScreenshotReviewSelection({
      actorUserId: input.actorUserId,
      contentId: input.contentId,
      blockId: item.blockId,
      assetId: item.assetId,
      annotations: item.annotations,
      interactions:
        item.interactions.length > 0
          ? item.interactions
          : previous?.reviewed
            ? []
            : ["confirmed"],
    });
  }

  return getHelpHumanReviewStatus(input.contentId);
}

export async function replaceHelpHumanReviewImage(input: {
  actorUserId: string;
  contentId: string;
  blockId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<void> {
  const db = getDatabase();
  const [row] = await db
    .select({
      blockId: helpStepBlocks.id,
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

  const created = await createManagedHelpAsset(input.actorUserId, {
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: input.bytes,
    contentId: input.contentId,
  });
  if (created.asset.assetType !== "image") throw new Error("ASSET_MIME_NOT_ALLOWED");
  if (created.asset.id === row.currentAssetId) return;

  const updatedAt = new Date();
  const metadata = withoutHelpHumanReview({
    ...(row.blockMetadata ?? {}),
    [HELP_IMAGE_ANNOTATIONS_METADATA_KEY]: [],
  });
  await db.transaction(async (tx) => {
    await tx
      .update(helpStepBlocks)
      .set({ assetId: created.asset.id, metadata, updatedAt })
      .where(eq(helpStepBlocks.id, input.blockId));
    await tx
      .update(helpContents)
      .set({ status: "draft", updatedBy: input.actorUserId, updatedAt })
      .where(eq(helpContents.id, input.contentId));
  });

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "help.image.review.replaced",
    entityType: "help_step_block",
    entityId: input.blockId,
    metadata: {
      contentId: input.contentId,
      previousAssetId: row.currentAssetId,
      selectedAssetId: created.asset.id,
      reusedAsset: created.reused,
    },
  });
}
