// Aceite administrativo explícito para a migração Movidesk.
// Não representa uma inspeção visual individual da imagem.
const KEY = "movideskBulkEditorialAcceptance";

export function hasHelpBulkEditorialAcceptance(
  metadata: Record<string, unknown> | null | undefined,
  assetId: string | null | undefined,
  contentUpdatedAt: Date | string | null | undefined,
): boolean {
  if (!assetId || !contentUpdatedAt) return false;
  const record = metadata?.[KEY];
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  const value = record as Record<string, unknown>;
  const version = typeof contentUpdatedAt === "string"
    ? new Date(contentUpdatedAt).toISOString() : contentUpdatedAt.toISOString();
  return value.mode === "admin_bulk_editorial_acceptance"
    && value.assetId === assetId
    && value.contentUpdatedAt === version
    && typeof value.approvedBy === "string"
    && Boolean(value.approvedBy)
    && typeof value.approvedAt === "string";
}

export function withHelpBulkEditorialAcceptance(
  metadata: Record<string, unknown> | null | undefined,
  assetId: string,
  actorUserId: string,
  contentUpdatedAt: Date,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [KEY]: {
      mode: "admin_bulk_editorial_acceptance",
      assetId,
      approvedBy: actorUserId,
      approvedAt: new Date().toISOString(),
      contentUpdatedAt: contentUpdatedAt.toISOString(),
      visuallyReviewed: false,
    },
  };
}
