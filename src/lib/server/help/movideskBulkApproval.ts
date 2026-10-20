import { and, eq, inArray } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { withHelpBulkEditorialAcceptance } from "$lib/help/helpBulkEditorialAcceptance";
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


/**
 * Aprovação editorial em lote solicitada pelo administrador.
 * As capturas não são marcadas como "revisadas visualmente"; cada bloco
 * recebe um aceite administrativo identificável e vinculado ao ativo atual.
 */
export async function approveCuratedMovideskArticle(
  sourceId: number,
  actorUserId: string,
): Promise<"approved" | "already-approved"> {
  if (!MOVIDESK_PUBLIC_SOURCE_IDS.includes(sourceId)) throw new Error("FORA_DO_PLANO_PUBLICO");
  const db = getDatabase();
  const [article] = await db.select({
    contentId: helpMovideskArticles.contentId,
    sourceHtml: helpMovideskArticles.sourceHtml,
    needsReview: helpMovideskArticles.needsReview,
    state: helpMovideskArticles.state,
    issue: helpMovideskArticles.issue,
  }).from(helpMovideskArticles).where(eq(helpMovideskArticles.sourceId, sourceId)).limit(1);
  if (!article?.contentId || !["imported", "review"].includes(article.state)
    || article.sourceHtml === null) {
    throw new Error("ARTIGO_NAO_IMPORTADO");
  }
  // Importação anterior pode manter avisos de imagem já recuperada e de vídeo
  // sem MP4 para IA. A conferência real de imagens continua obrigatória abaixo.
  const issue = (article.issue ?? "").trim();
  const preservedDraftNotice = issue.startsWith("Rascunho preservado:")
    || issue.startsWith("Artigo já existia no F10. Edição preservada;");
  const pendingIssue = preservedDraftNotice ? "" : issue
    .replace(/\d+ imagem\(ns\) sem cópia local: conferir os arquivos no F10\./g, "")
    .replace(/Vídeo YouTube no campo principal; adicione MP4 local antes da análise com IA\./g, "")
    .trim();
  if (pendingIssue) throw new Error("PENDENCIA_DE_IMPORTACAO");
  if (!article.needsReview) return "already-approved";

  const content = await getStructuredHelpContent(article.contentId);
  if (!content || content.status !== "draft"
    || content.importExternalId !== String(sourceId)
    || content.contentKind !== "support_article" || content.importSource !== "movidesk"
    || content.categories.length === 0
    || content.categories.some((category) => !category.active
      || category.slug === UNCATEGORIZED_HELP_CATEGORY_SLUG)) {
    throw new Error("ARTIGO_NAO_ELEGIVEL");
  }

  const imageBlocks = content.steps.flatMap((step) => step.blocks)
    .filter((block) => block.blockType === "image");
  const expectedImageCount = (article.sourceHtml.match(/<img\b/gi) ?? []).length;
  if (expectedImageCount !== imageBlocks.length
    || imageBlocks.some((block) => !block.asset?.storageKey)
    || content.steps.some((step) =>
      step.blocks.filter((block) => block.blockType === "image").length > 1)) {
    throw new Error("IMAGENS_PENDENTES_OU_INCOMPLETAS");
  }
  validateHelpKnowledgePublication(content);

  // Protege o aceite contra alterações concorrentes de texto ou troca de mídia.
  await db.transaction(async (tx) => {
    const [current] = await tx.select({
      id: helpContents.id, updatedAt: helpContents.updatedAt, status: helpContents.status,
    }).from(helpContents).where(eq(helpContents.id, content.id)).for("update").limit(1);
    if (!current || current.status !== "draft"
      || current.updatedAt.getTime() !== content.updatedAt.getTime()) {
      throw new Error("ARTIGO_ALTERADO_DURANTE_APROVACAO");
    }
    for (const block of imageBlocks) {
      const [updated] = await tx.update(helpStepBlocks).set({
        metadata: withHelpBulkEditorialAcceptance(
          block.metadata, block.asset!.id, actorUserId, content.updatedAt,
        ),
        updatedAt: new Date(),
      }).where(and(
        eq(helpStepBlocks.id, block.id),
        eq(helpStepBlocks.assetId, block.asset!.id),
      )).returning({ id: helpStepBlocks.id });
      if (!updated) throw new Error("IMAGEM_ALTERADA_DURANTE_APROVACAO");
    }
  });

  await approveMovideskArticle(sourceId);
  await recordAuditEvent({
    actorUserId,
    action: "help.movidesk.bulk_editorial_acceptance",
    entityType: "help_content",
    entityId: content.id,
    metadata: {
      sourceId, imageCount: imageBlocks.length,
      mode: "admin_bulk_editorial_acceptance",
      visualInspectionClaimed: false,
      version: content.updatedAt.toISOString(),
    },
  });
  return "approved";
}
