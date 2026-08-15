import { count } from "drizzle-orm";
import {
  helpDestinations as legacyDestinations,
  helpQuestions as legacyQuestions,
} from "$lib/help/helpDecisionTree";
import { destinationAliases } from "$lib/help/helpSearchAliases";
import {
  trainingCategories,
  trainingVideos,
} from "$lib/onboarding/trainingCatalog";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import {
  helpArticles,
  helpDestinations,
  helpOptions,
  helpQuestions,
  helpSearchAliases,
  helpTrainingCategories,
  helpTrainingVideos,
} from "$lib/server/db/schema";

export {
  createHelpArticle,
  getHelpArticleForEdit,
  listHelpArticles,
  normalizeHelpSlug,
  publishHelpArticle,
  updateHelpArticle,
  type HelpArticleInput,
} from "$lib/server/help/helpArticleRepository";

function normalizeSearchAlias(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function getHelpAdminSummary() {
  const db = getDatabase();
  const [articlesResult, destinationsResult, questionsResult, trainingsResult] =
    await Promise.all([
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

      await tx
        .insert(helpPublications)
        .values({
          entityType: "training",
          entityId: training.id,
          snapshot: {
            id: training.id,
            categoryId: training.categoryId,
            title: training.title,
            description: training.description,
            videoId: training.videoId,
            audience: training.audience ?? null,
            isEssential: training.isEssential ?? false,
            isNew: training.isNew ?? false,
            sortOrder,
          },
          publishedBy: actorUserId,
          publishedAt,
        })
        .onConflictDoNothing();
    }

    for (const [sortOrder, destination] of legacyDestinations.entries()) {
      const aliases = destinationAliases[destination.id] ?? [];

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

      await tx
        .insert(helpPublications)
        .values({
          entityType: "destination",
          entityId: destination.id,
          snapshot: {
            ...destination,
            aliases,
            sortOrder,
          },
          publishedBy: actorUserId,
          publishedAt,
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

    for (const [sortOrder, question] of legacyQuestions.entries()) {
      if (question.options.length > 0) {
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

      await tx
        .insert(helpPublications)
        .values({
          entityType: "question",
          entityId: question.id,
          snapshot: {
            ...question,
            sortOrder,
          },
          publishedBy: actorUserId,
          publishedAt,
        })
        .onConflictDoNothing();
    }

    const aliasRows = Object.entries(destinationAliases).flatMap(
      ([destinationId, aliases]) =>
        aliases.map((alias) => ({
          destinationId,
          alias,
          normalizedAlias: normalizeSearchAlias(alias),
        })),
    );

    if (aliasRows.length > 0) {
      await tx
        .insert(helpSearchAliases)
        .values(aliasRows)
        .onConflictDoNothing();
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
