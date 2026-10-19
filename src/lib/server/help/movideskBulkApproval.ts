import { and, eq, inArray } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { getDatabase } from "$lib/server/db";
import { helpMovideskArticles } from "$lib/server/db/helpMovideskSchema";
import { helpMovideskImportState } from "$lib/server/db/helpMovideskSchema";
import { helpMovideskPublicationState } from "$lib/server/db/helpMovideskPublicationSchema";
import { helpContentSteps, helpContents, helpStepBlocks } from "$lib/server/db/structuredHelpSchema";
import { helpPublications } from "$lib/server/db/helpPublications";
import { validateHelpKnowledgePublication } from "$lib/server/help/helpKnowledgeCompiler";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";
import { approveMovideskArticle } from "$lib/server/help/movideskMigration";
import { MOVIDESK_PUBLIC_SOURCE_IDS } from "$lib/server/help/movideskPublicationPlan";

const MAX_BATCH = 50;

export type MovideskSafeApprovalCandidate = {
  sourceId: number;
  title: string;
  contentId: string;
};

// Somente artigos do plano público, sem imagens no HTML original nem no F10,
// sem alertas de importação e ainda não publicados.
export async function listMovideskSafeApprovalCandidates(): Promise<MovideskSafeApprovalCandidate[]> {
  const db = getDatabase();
  const originals = await db.select({
    sourceId: helpMovideskArticles.sourceId,
    title: helpMovideskArticles.title,
    sourceHtml: helpMovideskArticles.sourceHtml,
    contentId: helpMovideskArticles.contentId,
    state: helpMovideskArticles.state,
    needsReview: helpMovideskArticles.needsReview,
    issue: helpMovideskArticles.issue,
  }).from(helpMovideskArticles)
    .where(inArray(helpMovideskArticles.sourceId, MOVIDESK_PUBLIC_SOURCE_IDS));

  const preliminary = originals.filter((article) =>
    article.contentId && article.needsReview
    && (article.state === "imported" || article.state === "review")
    && !article.issue?.trim()
    && article.sourceHtml !== null
    && !/<img\b/i.test(article.sourceHtml),
  );
  const ids = preliminary.flatMap((article) => article.contentId ? [article.contentId] : []);
  if (!ids.length) return [];

  const [contents, imageBlocks, published] = await Promise.all([
    db.select({
      id: helpContents.id,
      status: helpContents.status,
      importSource: helpContents.importSource,
      contentKind: helpContents.contentKind,
    }).from(helpContents).where(inArray(helpContents.id, ids)),
    db.select({ contentId: helpContentSteps.contentId }).from(helpStepBlocks)
      .innerJoin(helpContentSteps, eq(helpContentSteps.id, helpStepBlocks.stepId))
      .where(and(
        inArray(helpContentSteps.contentId, ids),
        eq(helpStepBlocks.blockType, "image"),
      )),
    db.select({ entityId: helpPublications.entityId }).from(helpPublications)
      .where(and(eq(helpPublications.entityType, "content"), inArray(helpPublications.entityId, ids))),
  ]);

  const valid = new Set(contents.filter((row) =>
    row.status === "draft" && row.importSource === "movidesk"
    && row.contentKind === "support_article",
  ).map((row) => row.id));
  const hasImages = new Set(imageBlocks.map((row) => row.contentId));
  const publishedIds = new Set(published.map((row) => row.entityId));

  return preliminary.flatMap((article) =>
    article.contentId && valid.has(article.contentId)
    && !hasImages.has(article.contentId) && !publishedIds.has(article.contentId)
      ? [{ sourceId: article.sourceId, title: article.title, contentId: article.contentId }]
      : [],
  ).sort((a, b) => a.sourceId - b.sourceId);
}

export async function approveSafeMovideskArticleBatch(actorUserId: string) {
  const db = getDatabase();
  const [[importState], [publicationState]] = await Promise.all([
    db.select({ enabled: helpMovideskImportState.enabled }).from(helpMovideskImportState)
      .where(eq(helpMovideskImportState.id, 1)).limit(1),
    db.select({ enabled: helpMovideskPublicationState.enabled }).from(helpMovideskPublicationState)
      .where(eq(helpMovideskPublicationState.id, 1)).limit(1),
  ]);
  if (importState?.enabled || publicationState?.enabled) throw new Error("MOVIDESK_APPROVAL_BUSY");
  const candidates = (await listMovideskSafeApprovalCandidates()).slice(0, MAX_BATCH);
  let approved = 0;
  const blocked: Array<{ sourceId: number; reason: string }> = [];

  for (const article of candidates) {
    try {
      // A prévia não substitui a conferência no momento da execução.
      const current = await getStructuredHelpContent(article.contentId);
      if (!current || current.status !== "draft"
        || current.importSource !== "movidesk" || current.contentKind !== "support_article"
        || current.categories.some((category) => category.slug === UNCATEGORIZED_HELP_CATEGORY_SLUG)
        || current.steps.some((step) => step.blocks.some((block) => block.blockType === "image"))) {
        throw new Error("ARTIGO_NAO_ELEGIVEL");
      }

      validateHelpKnowledgePublication(current);
      await approveMovideskArticle(article.sourceId);
      approved++;
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      blocked.push({
        sourceId: article.sourceId,
        reason: /^[A-Z][A-Z0-9_]{3,80}$/.test(code) ? code : "REVISAR_ARTIGO",
      });
    }
  }

  if (approved) {
    await recordAuditEvent({
      actorUserId,
      action: "help.movidesk.safe_bulk_approved",
      entityType: "help_content",
      metadata: { approved, checked: candidates.length, sourceIds: candidates.map((row) => row.sourceId) },
    }).catch((cause) => console.error("[movidesk-publicacao] auditoria", cause));
  }
  return { checked: candidates.length, approved, blocked, remaining: (await listMovideskSafeApprovalCandidates()).length };
}
