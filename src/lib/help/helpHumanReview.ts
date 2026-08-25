export const HELP_HUMAN_REVIEW_METADATA_KEY = "humanReview";

export type HelpHumanReviewInteraction =
  | "confirmed"
  | "image_selected"
  | "annotated"
  | "image_replaced";

export type HelpHumanReviewMetadata = {
  reviewedAt: string;
  reviewedBy: string;
  assetId: string;
  interactions: HelpHumanReviewInteraction[];
};

export function readHelpHumanReviewFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): HelpHumanReviewMetadata | null {
  const value = metadata?.[HELP_HUMAN_REVIEW_METADATA_KEY];
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const review = value as Record<string, unknown>;
  if (
    typeof review.reviewedAt !== "string" ||
    typeof review.reviewedBy !== "string" ||
    typeof review.assetId !== "string" ||
    !Array.isArray(review.interactions)
  ) {
    return null;
  }
  const interactions = review.interactions.filter(
    (item): item is HelpHumanReviewInteraction =>
      item === "confirmed" ||
      item === "image_selected" ||
      item === "annotated" ||
      item === "image_replaced",
  );
  return {
    reviewedAt: review.reviewedAt,
    reviewedBy: review.reviewedBy,
    assetId: review.assetId,
    interactions,
  };
}

export function isHelpHumanReviewComplete(
  metadata: Record<string, unknown> | null | undefined,
  assetId: string | null | undefined,
): boolean {
  if (!assetId) return false;
  const review = readHelpHumanReviewFromMetadata(metadata);
  return Boolean(review && review.assetId === assetId && review.reviewedAt);
}

export function withHelpHumanReview(
  metadata: Record<string, unknown> | null | undefined,
  input: {
    actorUserId: string;
    assetId: string;
    interactions: HelpHumanReviewInteraction[];
    reviewedAt?: Date;
  },
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [HELP_HUMAN_REVIEW_METADATA_KEY]: {
      reviewedAt: (input.reviewedAt ?? new Date()).toISOString(),
      reviewedBy: input.actorUserId,
      assetId: input.assetId,
      interactions: Array.from(new Set(input.interactions)),
    } satisfies HelpHumanReviewMetadata,
  };
}

export function withoutHelpHumanReview(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const next = { ...(metadata ?? {}) };
  delete next[HELP_HUMAN_REVIEW_METADATA_KEY];
  return next;
}
