import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";
import type { PageServerLoad } from "./$types";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { readHelpImageAnnotationsFromMetadata } from "$lib/help/helpImageAnnotations";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getDatabase } from "$lib/server/db";
import { helpMovideskArticles } from "$lib/server/db/helpMovideskSchema";
import { helpPublications } from "$lib/server/db/helpPublications";
import { listMovideskMigrationDashboard, approveMovideskArticle } from "$lib/server/help/movideskMigration";
import { MOVIDESK_PUBLIC_SOURCE_IDS } from "$lib/server/help/movideskPublicationPlan";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";
import { validateHelpKnowledgePublication } from "$lib/server/help/helpKnowledgeCompiler";
import { saveHelpHumanReviewBatch } from "$lib/server/help/helpScreenshotReviewRepository";

const ROUTE = "/app/help/content/movidesk/revisao";
const PUBLIC_IDS = new Set(MOVIDESK_PUBLIC_SOURCE_IDS);

function availableForVisualReview(article: {
  sourceId: number; needsReview: boolean; state: string;
  contentId: string | null;
  imageStats: { total: number; stored: number } | null;
  published: boolean;
}): boolean {
  return PUBLIC_IDS.has(article.sourceId)
    && article.needsReview
    && !article.published
    && (article.state === "imported" || article.state === "review")
    && Boolean(article.contentId)
    && Boolean(article.imageStats && article.imageStats.total > 0);
}

async function requireReviewPermission(cookies: Parameters<typeof requireAppPermission>[0]) {
  const { session } = await requireAppPermission(cookies, "system.settings.manage", ROUTE);
  await requireAppPermission(cookies, "help.edit", ROUTE);
  await requireAppPermission(cookies, "help.publish", ROUTE);
  return session;
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  await requireReviewPermission(cookies);
  const dashboard = await listMovideskMigrationDashboard();
  const candidates = dashboard.articles.filter(availableForVisualReview);
  const ready = candidates.filter((article) =>
    article.imageStats && article.imageStats.total === article.imageStats.stored,
  );
  const sourceId = Number(url.searchParams.get("sourceId"));
  const selected = ready.find((article) => article.sourceId === sourceId) ?? ready[0] ?? null;

  const content = selected?.contentId ? await getStructuredHelpContent(selected.contentId) : null;
  const images = content?.steps.flatMap((step) =>
    step.blocks.flatMap((block) =>
      block.blockType === "image" && block.asset ? [{
        blockId: block.id,
        assetId: block.asset.id,
        stepTitle: step.title,
        altText: block.asset.altText,
        storageKey: block.asset.storageKey,
      }] : [],
    ),
  ) ?? [];

  return {
    selected: selected ? {
      sourceId: selected.sourceId, title: content?.title || selected.title,
      contentId: selected.contentId, images,
    } : null,
    candidates: ready.map((article) => ({
      sourceId: article.sourceId,
      title: article.title,
      imageCount: article.imageStats?.total ?? 0,
    })),
    waitingForImages: candidates.length - ready.length,
    outsidePublicPlan: dashboard.articles.filter((article) =>
      article.contentId && !PUBLIC_IDS.has(article.sourceId),
    ).length,
    approved: url.searchParams.get("approved") === "1",
  };
};

export const actions: Actions = {
  approveImages: async ({ cookies, request }) => {
    const session = await requireReviewPermission(cookies);
    const form = await request.formData();
    const sourceId = Number(form.get("sourceId"));
    const confirmations = form.getAll("reviewedBlockId")
      .filter((value): value is string => typeof value === "string");

    if (!Number.isSafeInteger(sourceId) || !PUBLIC_IDS.has(sourceId)) {
      return fail(400, { message: "Artigo fora da seleção pública." });
    }

    try {
      const db = getDatabase();
      const [article] = await db.select({
        contentId: helpMovideskArticles.contentId,
        sourceHtml: helpMovideskArticles.sourceHtml,
        needsReview: helpMovideskArticles.needsReview,
        state: helpMovideskArticles.state,
        issue: helpMovideskArticles.issue,
      }).from(helpMovideskArticles)
        .where(eq(helpMovideskArticles.sourceId, sourceId)).limit(1);

      if (!article?.contentId || !article.needsReview
        || (article.state !== "imported" && article.state !== "review")
        || article.issue?.trim() || article.sourceHtml === null) {
        throw new Error("ARTIGO_NAO_ELEGIVEL");
      }

      const [published] = await db.select({ entityId: helpPublications.entityId })
        .from(helpPublications).where(and(
          eq(helpPublications.entityType, "content"),
          eq(helpPublications.entityId, article.contentId),
        )).limit(1);
      if (published) throw new Error("ARTIGO_JA_PUBLICADO");

      const content = await getStructuredHelpContent(article.contentId);
      if (!content || content.importSource !== "movidesk" ||
        content.contentKind !== "support_article" || content.status !== "draft" ||
        content.categories.some((category) => category.slug === UNCATEGORIZED_HELP_CATEGORY_SLUG)) {
        throw new Error("ARTIGO_NAO_ELEGIVEL");
      }

      const blocks = content.steps.flatMap((step) => step.blocks)
        .filter((block) => block.blockType === "image");

      const originalImageCount = (article.sourceHtml.match(/<img\b/gi) ?? []).length;
      if (originalImageCount === 0 || blocks.length !== originalImageCount ||
        blocks.some((block) => !block.asset?.storageKey) ||
        content.steps.some((step) =>
          step.blocks.filter((block) => block.blockType === "image").length > 1,
        )) {
        throw new Error("IMAGENS_INCOMPLETAS");
      }

      const expected = new Set(blocks.map((block) => block.id));
      const received = new Set(confirmations);
      if (received.size !== expected.size ||
        confirmations.length !== expected.size ||
        [...received].some((blockId) => !expected.has(blockId))) {
        throw new Error("CONFIRA_TODAS_AS_IMAGENS");
      }

      validateHelpKnowledgePublication(content);
      await saveHelpHumanReviewBatch({
        actorUserId: session.user.id,
        contentId: content.id,
        confirmUntouched: false,
        items: blocks.map((block) => ({
          blockId: block.id,
          assetId: block.asset!.id,
          annotations: readHelpImageAnnotationsFromMetadata(block.metadata),
          interactions: ["confirmed"],
        })),
      });
      await approveMovideskArticle(sourceId);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      const message = code === "CONFIRA_TODAS_AS_IMAGENS"
        ? "Confira e marque cada imagem antes de aprovar."
        : code === "IMAGENS_INCOMPLETAS"
          ? "Há imagens ausentes ou mais de uma imagem por etapa. Corrija o artigo antes de aprovar."
          : "Este artigo ainda tem pendências. Confira imagens, textos, categorias e revisões no editor.";
      return fail(409, { message });
    }
    throw redirect(303, ROUTE + "?approved=1");
  },
};
