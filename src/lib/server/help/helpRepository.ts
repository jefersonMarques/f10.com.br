import { and, asc, count, eq, max } from "drizzle-orm";
import { helpDestinations as legacyDestinations, helpQuestions as legacyQuestions } from "$lib/help/helpDecisionTree";
import { destinationAliases } from "$lib/help/helpSearchAliases";
import { trainingCategories, trainingVideos } from "$lib/onboarding/trainingCatalog";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpArticles,
  helpContentVersions,
  helpDestinations,
  helpOptions,
  helpQuestions,
  helpSearchAliases,
  helpTrainingCategories,
  helpTrainingVideos,
  type HelpArticleBlock,
} from "$lib/server/db/schema";

export type CreateHelpArticleInput = {
  title: string;
  slug: string;
  summary: string;
  bodyText: string;
};

export function normalizeHelpSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeSearchAlias(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildArticleBlocks(bodyText: string): HelpArticleBlock[] {
  return bodyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph" as const, text }));
}

export async function getHelpAdminSummary() {
  const db = getDatabase();
  const [articlesResult, destinationsResult, questionsResult, trainingsResult] = await Promise.all([
    db.select({ value: count() }).from(helpArticles),
    db.select({ value: count() }).from(helpDestinations),
    db.select({ value: count() }).from(helpQuestions),
    db.select({ value: count() }).from(helpTrainingVideos),
  ]);

  return {
    articles: articlesResult[0]?.value ?? 0,
    destinations: destinationsResult[0]?.value ?? 0,
    questions: questionsResult[0]?.value ?? 0,
    trainings: trainingsResult[0]?.value ?? 0,
  };
}

export async function listHelpArticles() {
  const db = getDatabase();

  return db
    .select({
      id: helpArticles.id,
      slug: helpArticles.slug,
      title: helpArticles.title,
      summary: helpArticles.summary,
      status: helpArticles.status,
      publishedAt: helpArticles.publishedAt,
      updatedAt: helpArticles.updatedAt,
    })
    .from(helpArticles)
    .orderBy(asc(helpArticles.title));
}

async function saveArticleVersion(articleId: string, actorUserId: string): Promise<void> {
  const db = getDatabase();
  const article = await db.query.helpArticles.findFirst({ where: eq(helpArticles.id, articleId) });
  if (!article) return;

  const versionResult = await db
    .select({ version: max(helpContentVersions.version) })
    .from(helpContentVersions)
    .where(and(eq(helpContentVersions.entityType, "article"), eq(helpContentVersions.entityId, articleId)));

  const nextVersion = Number(versionResult[0]?.version ?? 0) + 1;

  await db.insert(helpContentVersions).values({
    entityType: "article",
    entityId: articleId,
    version: nextVersion,
    snapshot: {
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      body: article.body,
      status: article.status,
      publishedAt: article.publishedAt?.toISOString() ?? null,
    },
    createdBy: actorUserId,
  });
}

export async function createHelpArticle(actorUserId: string, input: CreateHelpArticleInput) {
  const db = getDatabase();
  const slug = normalizeHelpSlug(input.slug || input.title);

  if (!slug) throw new Error("INVALID_SLUG");

  const [article] = await db
    .insert(helpArticles)
    .values({
      slug,
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: buildArticleBlocks(input.bodyText),
      status: "draft",
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning({ id: helpArticles.id, slug: helpArticles.slug });

  if (!article) throw new Error("ARTICLE_NOT_CREATED");
  await saveArticleVersion(article.id, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.article.created",
    entityType: "help_article",
    entityId: article.id,
    metadata: { slug: article.slug },
  });

  return article;
}

export async function publishHelpArticle(actorUserId: string, articleId: string): Promise<void> {
  const db = getDatabase();
  const [updated] = await db
    .update(helpArticles)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(helpArticles.id, articleId))
    .returning({ id: helpArticles.id, slug: helpArticles.slug });

  if (!updated) throw new Error("ARTICLE_NOT_FOUND");

  await saveArticleVersion(updated.id, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.article.published",
    entityType: "help_article",
    entityId: updated.id,
    metadata: { slug: updated.slug },
  });
}

export async function importLegacyHelpContent(actorUserId: string) {
  const db = getDatabase();
  const publishedAt = new Date();

  await db.transaction(async (tx) => {
    for (const [sortOrder, category] of trainingCategories.entries()) {
      await tx
        .insert(helpTrainingCategories)
        .values({
          id: category.id,
          label: category.label,
          description: category.description,
          sortOrder,
        })
        .onConflictDoNothing();
    }

    for (const [sortOrder, training] of trainingVideos.entries()) {
      await tx
        .insert(helpTrainingVideos)
        .values({
          id: training.id,
          categoryId: training.categoryId,
          title: training.title,
          description: training.description,
          videoId: training.videoId,
          audience: training.audience ?? null,
          isEssential: training.isEssential ?? false,
          isNew: training.isNew ?? false,
          status: "published",
          sortOrder,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .onConflictDoNothing();
    }

    for (const [sortOrder, destination] of legacyDestinations.entries()) {
      await tx
        .insert(helpDestinations)
        .values({
          id: destination.id,
          kind: destination.kind,
          eyebrow: destination.eyebrow,
          title: destination.title,
          description: destination.description,
          actionLabel: destination.actionLabel,
          icon: destination.icon,
          href: destination.href ?? null,
          trainingIds: destination.trainingIds ?? [],
          status: "published",
          sortOrder,
          publishedAt,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .onConflictDoNothing();
    }

    for (const [sortOrder, question] of legacyQuestions.entries()) {
      await tx
        .insert(helpQuestions)
        .values({
          id: question.id,
          eyebrow: question.eyebrow,
          title: question.title,
          description: question.description,
          compact: question.compact ?? false,
          searchLabel: question.searchLabel ?? null,
          status: "published",
          sortOrder,
          publishedAt,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        })
        .onConflictDoNothing();
    }

    for (const question of legacyQuestions) {
      if (question.options.length === 0) continue;

      await tx
        .insert(helpOptions)
        .values(
          question.options.map((option, optionSortOrder) => ({
            questionId: question.id,
            optionKey: option.id,
            label: option.label,
            description: option.description,
            icon: option.icon,
            nextQuestionId: option.nextQuestionId ?? null,
            destinationId: option.destinationId ?? null,
            opensSearch: option.opensSearch ?? false,
            sortOrder: optionSortOrder,
          })),
        )
        .onConflictDoNothing();
    }

    const aliasRows = Object.entries(destinationAliases).flatMap(([destinationId, aliases]) =>
      aliases.map((alias) => ({
        destinationId,
        alias,
        normalizedAlias: normalizeSearchAlias(alias),
      })),
    );

    if (aliasRows.length > 0) {
      await tx.insert(helpSearchAliases).values(aliasRows).onConflictDoNothing();
    }
  });

  await recordAuditEvent({
    actorUserId,
    action: "help.legacy.imported",
    entityType: "help_center",
    metadata: {
      destinations: legacyDestinations.length,
      questions: legacyQuestions.length,
      trainings: trainingVideos.length,
    },
  });

  return {
    destinations: legacyDestinations.length,
    questions: legacyQuestions.length,
    trainings: trainingVideos.length,
  };
}
