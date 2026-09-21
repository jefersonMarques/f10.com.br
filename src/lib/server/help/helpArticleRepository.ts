import { and, asc, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import {
  helpArticles,
  type HelpArticleBlock,
} from "$lib/server/db/schema";
import { saveHelpContentVersion } from "$lib/server/help/helpVersionRepository";

export type HelpArticleInput = {
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

function buildArticleBlocks(bodyText: string): HelpArticleBlock[] {
  return bodyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((text) => ({ type: "paragraph" as const, text }));
}

function blocksToText(blocks: HelpArticleBlock[]): string {
  return blocks
    .map((block) => {
      if (block.text) return block.text;
      if (block.items?.length) return block.items.join("\n");
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

async function getArticle(articleId: string) {
  const db = getDatabase();
  const [article] = await db
    .select()
    .from(helpArticles)
    .where(eq(helpArticles.id, articleId))
    .limit(1);

  return article ?? null;
}

async function saveCurrentArticleVersion(
  articleId: string,
  actorUserId: string,
): Promise<void> {
  const article = await getArticle(articleId);

  if (!article) return;

  await saveHelpContentVersion(
    "article",
    articleId,
    {
      slug: article.slug,
      title: article.title,
      summary: article.summary,
      body: article.body,
      status: article.status,
      publishedAt: article.publishedAt?.toISOString() ?? null,
    },
    actorUserId,
  );
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

export async function getHelpArticleForEdit(articleId: string) {
  const db = getDatabase();
  const article = await getArticle(articleId);

  if (!article) return null;

  const [publication] = await db
    .select({ publishedAt: helpPublications.publishedAt })
    .from(helpPublications)
    .where(
      and(
        eq(helpPublications.entityType, "article"),
        eq(helpPublications.entityId, articleId),
      ),
    )
    .limit(1);

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    summary: article.summary,
    bodyText: blocksToText(article.body),
    status: article.status,
    publishedAt: publication?.publishedAt ?? null,
    updatedAt: article.updatedAt,
    hasPublishedVersion: Boolean(publication),
  };
}

export async function createHelpArticle(
  actorUserId: string,
  input: HelpArticleInput,
) {
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

  await saveCurrentArticleVersion(article.id, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.article.created",
    entityType: "help_article",
    entityId: article.id,
    metadata: { slug: article.slug },
  });

  return article;
}

export async function updateHelpArticle(
  actorUserId: string,
  articleId: string,
  input: HelpArticleInput,
): Promise<void> {
  const db = getDatabase();
  const article = await getArticle(articleId);

  if (!article) throw new Error("ARTICLE_NOT_FOUND");
  if (article.status === "archived") throw new Error("ARTICLE_ARCHIVED");

  const slug = normalizeHelpSlug(input.slug || input.title);
  if (!slug) throw new Error("INVALID_SLUG");

  const [updated] = await db
    .update(helpArticles)
    .set({
      title: input.title.trim(),
      slug,
      summary: input.summary.trim(),
      body: buildArticleBlocks(input.bodyText),
      status: "draft",
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(helpArticles.id, articleId))
    .returning({ id: helpArticles.id });

  if (!updated) throw new Error("ARTICLE_NOT_FOUND");

  await saveCurrentArticleVersion(articleId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.article.updated",
    entityType: "help_article",
    entityId: articleId,
    metadata: {
      slug,
      previousStatus: article.status,
      hasUnpublishedChanges: article.status === "published",
    },
  });
}

export async function publishHelpArticle(
  actorUserId: string,
  articleId: string,
): Promise<void> {
  const db = getDatabase();
  const article = await getArticle(articleId);

  if (!article) throw new Error("ARTICLE_NOT_FOUND");
  if (article.status === "archived") throw new Error("ARTICLE_ARCHIVED");

  const publishedAt = new Date();
  const snapshot = {
    slug: article.slug,
    title: article.title,
    summary: article.summary,
    body: article.body,
  };

  await db.transaction(async (tx) => {
    await tx
      .update(helpArticles)
      .set({
        status: "published",
        publishedAt,
        updatedBy: actorUserId,
        updatedAt: publishedAt,
      })
      .where(eq(helpArticles.id, articleId));

    await tx
      .insert(helpPublications)
      .values({
        entityType: "article",
        entityId: articleId,
        snapshot,
        publishedBy: actorUserId,
        publishedAt,
      })
      .onConflictDoUpdate({
        target: [helpPublications.entityType, helpPublications.entityId],
        set: {
          snapshot,
          publishedBy: actorUserId,
          publishedAt,
        },
      });
  });

  await saveCurrentArticleVersion(articleId, actorUserId);
  await recordAuditEvent({
    actorUserId,
    action: "help.article.published",
    entityType: "help_article",
    entityId: articleId,
    metadata: { slug: article.slug },
  });
}
