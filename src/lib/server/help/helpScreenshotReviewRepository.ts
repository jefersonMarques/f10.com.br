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
import { createManagedHelpAsset, deleteManagedHelpAsset } from "$lib/server/help/helpAssetRepository";
import { deleteAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";

const REVIEW_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_GENERATED_REVIEW_ALTERNATIVES = 18;

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

const HELP_IMAGE_REVIEW_DRAFT_METADATA_KEY = "imageReviewDraft";

type HelpImageReviewDraftMetadata = {
  selectedAssetId: string;
  annotations: HelpImageAnnotation[];
  interactions: HelpHumanReviewInteraction[];
  updatedAt: string;
  updatedBy: string;
};

function normalizeInteractions(value: unknown): HelpHumanReviewInteraction[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter(
    (item): item is HelpHumanReviewInteraction =>
      item === "confirmed" ||
      item === "image_selected" ||
      item === "annotated" ||
      item === "image_replaced",
  )));
}

function readImageReviewDraft(
  metadata: Record<string, unknown> | null | undefined,
): HelpImageReviewDraftMetadata | null {
  const value = metadata?.[HELP_IMAGE_REVIEW_DRAFT_METADATA_KEY];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const draft = value as Record<string, unknown>;
  if (
    typeof draft.selectedAssetId !== "string" ||
    !Array.isArray(draft.annotations) ||
    typeof draft.updatedAt !== "string" ||
    typeof draft.updatedBy !== "string"
  ) {
    return null;
  }
  return {
    selectedAssetId: draft.selectedAssetId,
    annotations: draft.annotations as HelpImageAnnotation[],
    interactions: normalizeInteractions(draft.interactions),
    updatedAt: draft.updatedAt,
    updatedBy: draft.updatedBy,
  };
}

function withImageReviewDraft(
  metadata: Record<string, unknown> | null | undefined,
  input: {
    actorUserId: string;
    selectedAssetId: string;
    annotations: HelpImageAnnotation[];
    interactions: HelpHumanReviewInteraction[];
    updatedAt?: Date;
  },
): Record<string, unknown> {
  return {
    ...withoutHelpHumanReview(metadata),
    [HELP_IMAGE_REVIEW_DRAFT_METADATA_KEY]: {
      selectedAssetId: input.selectedAssetId,
      annotations: input.annotations,
      interactions: Array.from(new Set(input.interactions)),
      updatedAt: (input.updatedAt ?? new Date()).toISOString(),
      updatedBy: input.actorUserId,
    } satisfies HelpImageReviewDraftMetadata,
  };
}

function withoutImageReviewDraft(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };
  delete next[HELP_IMAGE_REVIEW_DRAFT_METADATA_KEY];
  return next;
}

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
  draftSelectedAssetId: string | null;
  draftAnnotations: HelpImageAnnotation[] | null;
  draftInteractions: HelpHumanReviewInteraction[];
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
  const activeRows = await imageReviewRows(contentId);
  const activeAssetIds = new Set(
    activeRows.flatMap((row) => row.assetId ? [row.assetId] : []),
  );
  const now = Date.now();
  const expired = rows.filter((row) => {
    if (activeAssetIds.has(row.id)) return false;
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
  if (stepIds.length === 0) {
    return new Map<string, { blockId: string; assetId: string; metadata: Record<string, unknown> }>();
  }
  const rows = await getDatabase()
    .select({
      stepId: helpStepBlocks.stepId,
      blockId: helpStepBlocks.id,
      assetId: helpStepBlocks.assetId,
      metadata: helpStepBlocks.metadata,
    })
    .from(helpStepBlocks)
    .where(
      and(
        inArray(helpStepBlocks.stepId, stepIds),
        eq(helpStepBlocks.blockType, "image"),
      ),
    )
    .orderBy(helpStepBlocks.sortOrder);

  const result = new Map<string, { blockId: string; assetId: string; metadata: Record<string, unknown> }>();
  for (const row of rows) {
    if (row.assetId && !result.has(row.stepId)) {
      result.set(row.stepId, {
        blockId: row.blockId,
        assetId: row.assetId,
        metadata: row.metadata ?? {},
      });
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
  const db = getDatabase();
  const steps = await contentStepRows(contentId);
  const blockByStep = await imageBlocksByStep(steps.map((step) => step.id));
  const assets = await db
    .select({ id: helpAssets.id, metadata: helpAssets.metadata })
    .from(helpAssets)
    .where(and(eq(helpAssets.contentId, contentId), eq(helpAssets.assetType, "image")));
  const result: HelpScreenshotReviewGroup[] = [];

  for (const step of steps) {
    const block = blockByStep.get(step.id);
    if (!block) continue;

    const related = assets.flatMap((asset) => {
      const review = reviewMetadata(asset.metadata);
      if (!review || review.stepId !== step.id) return [];
      return [{
        assetId: asset.id,
        candidateIndex: Number(review.candidateIndex ?? 0),
        timeSeconds: Number.isFinite(Number(review.timeSeconds)) ? Number(review.timeSeconds) : null,
        recommended: review.role === "recommended",
      }];
    });
    if (!related.some((candidate) => candidate.assetId === block.assetId)) {
      related.unshift({
        assetId: block.assetId,
        candidateIndex: 0,
        timeSeconds: null,
        recommended: related.length === 0,
      });
    }

    const byAssetId = new Map(
      related.map((candidate) => [candidate.assetId, candidate]),
    );
    const candidates = Array.from(byAssetId.values()).sort((left, right) => {
      if (left.candidateIndex !== right.candidateIndex) {
        return left.candidateIndex - right.candidateIndex;
      }
      return left.assetId.localeCompare(right.assetId);
    });
    const draft = readImageReviewDraft(block.metadata);
    const draftSelectedAssetId =
      draft && byAssetId.has(draft.selectedAssetId)
        ? draft.selectedAssetId
        : null;

    result.push({
      stepId: step.id,
      blockId: block.blockId,
      recommendedAssetId:
        candidates.find((candidate) => candidate.recommended)?.assetId ?? block.assetId,
      draftSelectedAssetId,
      draftAnnotations: draftSelectedAssetId ? draft?.annotations ?? [] : null,
      draftInteractions: draftSelectedAssetId ? draft?.interactions ?? [] : [],
      candidates,
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

  const [selected] = await db
    .select({
      id: helpAssets.id,
      contentId: helpAssets.contentId,
      metadata: helpAssets.metadata,
    })
    .from(helpAssets)
    .where(eq(helpAssets.id, input.assetId))
    .limit(1);
  const selectedReview = reviewMetadata(selected?.metadata);
  const selectedAllowed =
    Boolean(selected) &&
    (
      selected?.id === row.currentAssetId ||
      (
        selected?.contentId === input.contentId &&
        selectedReview?.stepId === row.stepId
      )
    );
  if (!selectedAllowed || !selected) throw new Error("SCREENSHOT_REVIEW_ASSET_INVALID");

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
      ...withoutImageReviewDraft(row.blockMetadata),
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
      .update(helpContents)
      .set({
        ...(publicChanged || row.contentStatus !== "published" ? { status: "draft" as const } : {}),
        updatedBy: input.actorUserId,
        updatedAt,
      })
      .where(eq(helpContents.id, input.contentId));
  });

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
      preservedCandidates: true,
    },
  });
}

export async function saveHelpHumanReviewDraftBatch(input: {
  actorUserId: string;
  contentId: string;
  items: Array<{
    blockId: string;
    assetId: string;
    annotations: HelpImageAnnotation[];
    interactions: HelpHumanReviewInteraction[];
  }>;
}): Promise<HelpHumanReviewStatus> {
  const db = getDatabase();
  const updatedAt = new Date();

  await db.transaction(async (tx) => {
    const [content] = await tx
      .select({ status: helpContents.status })
      .from(helpContents)
      .where(eq(helpContents.id, input.contentId))
      .limit(1);
    if (!content) throw new Error("CONTENT_NOT_FOUND");
    if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

    const rows = await tx
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
          eq(helpContentSteps.contentId, input.contentId),
          eq(helpStepBlocks.blockType, "image"),
        ),
      );

    const expected = new Map(rows.map((row) => [row.blockId, row]));
    const supplied = new Map(input.items.map((item) => [item.blockId, item]));
    if (
      expected.size !== supplied.size ||
      Array.from(expected.keys()).some((blockId) => !supplied.has(blockId))
    ) {
      throw new Error("HUMAN_REVIEW_INCOMPLETE");
    }

    const assetIds = Array.from(new Set(input.items.map((item) => item.assetId)));
    const assets = assetIds.length > 0
      ? await tx
          .select({
            id: helpAssets.id,
            contentId: helpAssets.contentId,
            metadata: helpAssets.metadata,
          })
          .from(helpAssets)
          .where(inArray(helpAssets.id, assetIds))
      : [];
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));

    for (const item of input.items) {
      const row = expected.get(item.blockId);
      const selected = assetById.get(item.assetId);
      const selectedReview = reviewMetadata(selected?.metadata);
      if (
        !row ||
        !selected ||
        (
          selected.id !== row.assetId &&
          !(
            selected.contentId === input.contentId &&
            selectedReview?.stepId === row.stepId
          )
        )
      ) {
        throw new Error("SCREENSHOT_REVIEW_ASSET_INVALID");
      }

      await tx
        .update(helpStepBlocks)
        .set({
          metadata: withImageReviewDraft(row.metadata, {
            actorUserId: input.actorUserId,
            selectedAssetId: selected.id,
            annotations: item.annotations,
            interactions: item.interactions,
            updatedAt,
          }),
          updatedAt,
        })
        .where(eq(helpStepBlocks.id, row.blockId));
    }

    await tx
      .update(helpContents)
      .set({
        status: "draft",
        updatedBy: input.actorUserId,
        updatedAt,
      })
      .where(eq(helpContents.id, input.contentId));
  });

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "help.image.review.draft_saved",
    entityType: "help_content",
    entityId: input.contentId,
    metadata: { imageCount: input.items.length },
  });

  return getHelpHumanReviewStatus(input.contentId);
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
  const db = getDatabase();
  const updatedAt = new Date();
  const auditItems: Array<{
    blockId: string;
    selectedAssetId: string;
    imageChanged: boolean;
    annotationCount: number;
    interactions: HelpHumanReviewInteraction[];
  }> = [];

  await db.transaction(async (tx) => {
    const [content] = await tx
      .select({ status: helpContents.status })
      .from(helpContents)
      .where(eq(helpContents.id, input.contentId))
      .limit(1);
    if (!content) throw new Error("CONTENT_NOT_FOUND");
    if (content.status === "archived") throw new Error("CONTENT_ARCHIVED");

    const rows = await tx
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
          eq(helpContentSteps.contentId, input.contentId),
          eq(helpStepBlocks.blockType, "image"),
        ),
      );

    const expected = new Map(rows.map((row) => [row.blockId, row]));
    const supplied = new Map(input.items.map((item) => [item.blockId, item]));
    if (
      expected.size !== supplied.size ||
      Array.from(expected.keys()).some((blockId) => !supplied.has(blockId))
    ) {
      throw new Error("HUMAN_REVIEW_INCOMPLETE");
    }

    const untouchedPending = rows.filter((row) => {
      if (isHelpHumanReviewComplete(row.metadata, row.assetId)) return false;
      return (supplied.get(row.blockId)?.interactions.length ?? 0) === 0;
    });
    if (untouchedPending.length > 0 && !input.confirmUntouched) {
      throw new Error("HUMAN_REVIEW_CONFIRMATION_REQUIRED");
    }

    const assetIds = Array.from(new Set(input.items.map((item) => item.assetId)));
    const assets = assetIds.length > 0
      ? await tx
          .select({
            id: helpAssets.id,
            contentId: helpAssets.contentId,
            metadata: helpAssets.metadata,
          })
          .from(helpAssets)
          .where(inArray(helpAssets.id, assetIds))
      : [];
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    let publicChanged = false;

    for (const item of input.items) {
      const row = expected.get(item.blockId);
      const selected = assetById.get(item.assetId);
      const selectedReview = reviewMetadata(selected?.metadata);
      if (
        !row ||
        !selected ||
        (
          selected.id !== row.assetId &&
          !(
            selected.contentId === input.contentId &&
            selectedReview?.stepId === row.stepId
          )
        )
      ) {
        throw new Error("SCREENSHOT_REVIEW_ASSET_INVALID");
      }

      const previousAnnotations = readHelpImageAnnotationsFromMetadata(row.metadata);
      const annotationsChanged =
        JSON.stringify(previousAnnotations) !== JSON.stringify(item.annotations);
      const imageChanged = selected.id !== row.assetId;
      publicChanged ||= annotationsChanged || imageChanged;
      const interactions = Array.from(new Set([
        ...item.interactions,
        ...(imageChanged ? ["image_selected" as const] : []),
        ...(annotationsChanged ? ["annotated" as const] : []),
      ]));
      const metadata = withHelpHumanReview(
        {
          ...withoutImageReviewDraft(row.metadata),
          [HELP_IMAGE_ANNOTATIONS_METADATA_KEY]: item.annotations,
        },
        {
          actorUserId: input.actorUserId,
          assetId: selected.id,
          interactions: interactions.length > 0 ? interactions : ["confirmed"],
          reviewedAt: updatedAt,
        },
      );

      await tx
        .update(helpStepBlocks)
        .set({
          assetId: selected.id,
          metadata,
          updatedAt,
        })
        .where(eq(helpStepBlocks.id, row.blockId));

      auditItems.push({
        blockId: row.blockId,
        selectedAssetId: selected.id,
        imageChanged,
        annotationCount: item.annotations.length,
        interactions: interactions.length > 0 ? interactions : ["confirmed"],
      });
    }

    await tx
      .update(helpContents)
      .set({
        ...(publicChanged || content.status !== "published"
          ? { status: "draft" as const }
          : {}),
        updatedBy: input.actorUserId,
        updatedAt,
      })
      .where(eq(helpContents.id, input.contentId));
  });

  for (const item of auditItems) {
    await recordAuditEvent({
      actorUserId: input.actorUserId,
      action: "help.image.review.confirmed",
      entityType: "help_step_block",
      entityId: item.blockId,
      metadata: {
        contentId: input.contentId,
        selectedAssetId: item.selectedAssetId,
        changed: item.imageChanged,
        annotationCount: item.annotationCount,
        interactions: item.interactions,
        preservedCandidates: true,
      },
    });
  }

  return getHelpHumanReviewStatus(input.contentId);
}

export async function addHelpHumanReviewCandidate(input: {
  actorUserId: string;
  contentId: string;
  blockId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<{
  assetId: string;
  candidateIndex: number;
  timeSeconds: null;
  recommended: false;
}> {
  const db = getDatabase();
  const [row] = await db
    .select({
      stepId: helpStepBlocks.stepId,
      blockType: helpStepBlocks.blockType,
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
  if (!row || row.blockType !== "image") throw new Error("IMAGE_BLOCK_NOT_FOUND");
  if (row.contentStatus === "archived") throw new Error("CONTENT_ARCHIVED");

  const existingAssets = await db
    .select({ metadata: helpAssets.metadata })
    .from(helpAssets)
    .where(and(eq(helpAssets.contentId, input.contentId), eq(helpAssets.assetType, "image")));
  const candidateIndex =
    Math.max(
      0,
      ...existingAssets.flatMap((asset) => {
        const review = reviewMetadata(asset.metadata);
        return review?.stepId === row.stepId
          ? [Number(review.candidateIndex ?? 0)]
          : [];
      }),
    ) + 1;

  const created = await createManagedHelpAsset(input.actorUserId, {
    fileName: input.fileName,
    mimeType: input.mimeType,
    bytes: input.bytes,
    contentId: input.contentId,
    deduplicate: false,
  });

  try {
    const updatedAt = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(helpAssets)
        .set({
          metadata: {
            ...(created.asset.metadata ?? {}),
            screenshotReview: {
              pending: true,
              role: "candidate",
              stepId: row.stepId,
              candidateIndex,
              timeSeconds: null,
            },
          },
          updatedAt,
        })
        .where(eq(helpAssets.id, created.asset.id));

      await tx
        .update(helpContents)
        .set({
          status: "draft",
          updatedBy: input.actorUserId,
          updatedAt,
        })
        .where(eq(helpContents.id, input.contentId));
    });
  } catch (cause) {
    await deleteManagedHelpAsset(input.actorUserId, created.asset.id).catch(() => undefined);
    throw cause;
  }

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "help.image.review.candidate_added",
    entityType: "help_step_block",
    entityId: input.blockId,
    metadata: {
      contentId: input.contentId,
      assetId: created.asset.id,
      candidateIndex,
    },
  });

  return {
    assetId: created.asset.id,
    candidateIndex,
    timeSeconds: null,
    recommended: false,
  };
}

export async function addHelpGeneratedReviewCandidates(input: {
  actorUserId: string;
  contentId: string;
  blockId: string;
  altText: string;
  assistantDescription: string;
  candidates: Array<{
    timeSeconds: number;
    bytes: Uint8Array;
  }>;
  preserveAssetIds?: string[];
}): Promise<Array<{
  assetId: string;
  candidateIndex: number;
  timeSeconds: number;
  recommended: false;
}>> {
  const db = getDatabase();
  const [row] = await db
    .select({
      stepId: helpStepBlocks.stepId,
      blockType: helpStepBlocks.blockType,
      activeAssetId: helpStepBlocks.assetId,
      blockMetadata: helpStepBlocks.metadata,
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
  if (!row || row.blockType !== "image") throw new Error("IMAGE_BLOCK_NOT_FOUND");
  if (row.contentStatus === "archived") throw new Error("CONTENT_ARCHIVED");

  let existingAssets = await db
    .select({
      id: helpAssets.id,
      metadata: helpAssets.metadata,
    })
    .from(helpAssets)
    .where(and(eq(helpAssets.contentId, input.contentId), eq(helpAssets.assetType, "image")));

  const draftSelectedAssetId = readImageReviewDraft(row.blockMetadata)?.selectedAssetId ?? null;
  const protectedAssetIds = new Set([
    ...(row.activeAssetId ? [row.activeAssetId] : []),
    ...(draftSelectedAssetId ? [draftSelectedAssetId] : []),
    ...(input.preserveAssetIds ?? []).filter(Boolean),
  ]);
  const generatedAlternatives = existingAssets
    .flatMap((asset) => {
      const review = reviewMetadata(asset.metadata);
      return review?.stepId === row.stepId
        && review.role === "candidate"
        && typeof review.timeSeconds === "number"
        ? [{ asset, review }]
        : [];
    })
    .sort(
      (left, right) =>
        Number(left.review.candidateIndex ?? 0) - Number(right.review.candidateIndex ?? 0),
    );

  const excess =
    generatedAlternatives.length +
    input.candidates.length -
    MAX_GENERATED_REVIEW_ALTERNATIVES;
  if (excess > 0) {
    const removable = generatedAlternatives
      .filter(({ asset }) => !protectedAssetIds.has(asset.id))
      .slice(0, excess);

    await Promise.allSettled(
      removable.map(({ asset }) =>
        deleteManagedHelpAsset(input.actorUserId, asset.id)
      ),
    );

    existingAssets = await db
      .select({
        id: helpAssets.id,
        metadata: helpAssets.metadata,
      })
      .from(helpAssets)
      .where(and(eq(helpAssets.contentId, input.contentId), eq(helpAssets.assetType, "image")));
  }

  const related = existingAssets.flatMap((asset) => {
    const review = reviewMetadata(asset.metadata);
    return review?.stepId === row.stepId ? [review] : [];
  });
  let candidateIndex = Math.max(
    0,
    ...related.map((review) => Number(review.candidateIndex ?? 0)),
  );
  const expiresAt = new Date(Date.now() + REVIEW_TTL_MS).toISOString();
  const createdAssetIds: string[] = [];
  const created: Array<{
    assetId: string;
    candidateIndex: number;
    timeSeconds: number;
    recommended: false;
  }> = [];

  try {
    for (const [index, candidate] of input.candidates.entries()) {
      const asset = await createManagedHelpAsset(input.actorUserId, {
        fileName: `generated-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        bytes: candidate.bytes,
        altText: input.altText,
        assistantDescription: input.assistantDescription,
        contentId: input.contentId,
        deduplicate: false,
      });
      createdAssetIds.push(asset.asset.id);
      candidateIndex += 1;
      const timeSeconds = Math.max(0, Number(candidate.timeSeconds) || 0);
      await db
        .update(helpAssets)
        .set({
          metadata: {
            ...(asset.asset.metadata ?? {}),
            screenshotReview: {
              pending: true,
              role: "candidate",
              stepId: row.stepId,
              candidateIndex,
              timeSeconds,
              expiresAt,
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(helpAssets.id, asset.asset.id));
      created.push({
        assetId: asset.asset.id,
        candidateIndex,
        timeSeconds,
        recommended: false,
      });
    }

    await db
      .update(helpContents)
      .set({
        status: "draft",
        updatedBy: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(helpContents.id, input.contentId));
  } catch (cause) {
    await Promise.allSettled(
      createdAssetIds.map((assetId) => deleteManagedHelpAsset(input.actorUserId, assetId)),
    );
    throw cause;
  }

  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "help.image.review.candidates_generated",
    entityType: "help_step_block",
    entityId: input.blockId,
    metadata: {
      contentId: input.contentId,
      candidateCount: created.length,
      timeSeconds: created.map((item) => item.timeSeconds),
    },
  });

  return created;
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
