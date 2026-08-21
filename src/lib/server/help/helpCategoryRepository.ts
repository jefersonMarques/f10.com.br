import { and, asc, count, eq, gt, inArray } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingPathCategories,
  helpTrainingPaths,
  type HelpTrainingAccessMode,
} from "$lib/server/db/helpTrainingSchema";
import { helpCategories } from "$lib/server/db/structuredHelpSchema";
import { normalizeTrainingSlug } from "$lib/server/help/helpTrainingRepository";

const MAX_CATEGORIES_PER_TRAINING = 12;

export type HelpCategorySummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  sortOrder: number;
  active: boolean;
};

export function normalizeHelpCategorySlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function uniqueCategoryIds(categoryIds: string[]): string[] {
  const normalized = Array.from(new Set(categoryIds));
  if (normalized.length > MAX_CATEGORIES_PER_TRAINING) throw new Error("HELP_CATEGORY_LIMIT");
  return normalized;
}

async function assertActiveCategoryIds(categoryIds: string[]): Promise<string[]> {
  const normalized = uniqueCategoryIds(categoryIds);
  if (normalized.length === 0) return [];
  const rows = await getDatabase()
    .select({ id: helpCategories.id })
    .from(helpCategories)
    .where(and(inArray(helpCategories.id, normalized), eq(helpCategories.active, true)));
  if (rows.length !== normalized.length) throw new Error("HELP_CATEGORY_INVALID");
  return normalized;
}

export async function listHelpCategories(activeOnly = false): Promise<HelpCategorySummary[]> {
  const db = getDatabase();
  if (activeOnly) {
    return db
      .select({
        id: helpCategories.id,
        slug: helpCategories.slug,
        name: helpCategories.name,
        description: helpCategories.description,
        icon: helpCategories.icon,
        sortOrder: helpCategories.sortOrder,
        active: helpCategories.active,
      })
      .from(helpCategories)
      .where(eq(helpCategories.active, true))
      .orderBy(asc(helpCategories.sortOrder), asc(helpCategories.name));
  }
  return db
    .select({
      id: helpCategories.id,
      slug: helpCategories.slug,
      name: helpCategories.name,
      description: helpCategories.description,
      icon: helpCategories.icon,
      sortOrder: helpCategories.sortOrder,
      active: helpCategories.active,
    })
    .from(helpCategories)
    .orderBy(asc(helpCategories.sortOrder), asc(helpCategories.name));
}

export async function createHelpCategory(
  actorUserId: string,
  input: { name: string; slug: string; description: string; icon: string; sortOrder: number },
): Promise<string> {
  const name = input.name.trim().slice(0, 160);
  const slug = normalizeHelpCategorySlug(input.slug || name);
  if (name.length < 2 || !slug) throw new Error("HELP_CATEGORY_INVALID");
  const sortOrder = Number.isFinite(input.sortOrder) ? input.sortOrder : 10;
  const [category] = await getDatabase()
    .insert(helpCategories)
    .values({
      name,
      slug,
      description: input.description.trim().slice(0, 600),
      icon: input.icon.trim().slice(0, 32),
      sortOrder: Math.min(Math.max(Math.round(sortOrder), 0), 10000),
      createdBy: actorUserId,
      updatedBy: actorUserId,
    })
    .returning({ id: helpCategories.id });
  if (!category) throw new Error("HELP_CATEGORY_NOT_CREATED");
  await recordAuditEvent({
    actorUserId,
    action: "help.category.created",
    entityType: "help_category",
    entityId: category.id,
    metadata: { slug },
  });
  return category.id;
}

export async function updateHelpCategory(
  actorUserId: string,
  categoryId: string,
  input: { name: string; slug: string; description: string; icon: string; sortOrder: number; active: boolean },
): Promise<void> {
  const name = input.name.trim().slice(0, 160);
  const slug = normalizeHelpCategorySlug(input.slug || name);
  if (name.length < 2 || !slug) throw new Error("HELP_CATEGORY_INVALID");
  const sortOrder = Number.isFinite(input.sortOrder) ? input.sortOrder : 10;
  const [updated] = await getDatabase()
    .update(helpCategories)
    .set({
      name,
      slug,
      description: input.description.trim().slice(0, 600),
      icon: input.icon.trim().slice(0, 32),
      sortOrder: Math.min(Math.max(Math.round(sortOrder), 0), 10000),
      active: input.active,
      updatedBy: actorUserId,
      updatedAt: new Date(),
    })
    .where(eq(helpCategories.id, categoryId))
    .returning({ id: helpCategories.id });
  if (!updated) throw new Error("HELP_CATEGORY_NOT_FOUND");
  await recordAuditEvent({
    actorUserId,
    action: "help.category.updated",
    entityType: "help_category",
    entityId: categoryId,
    metadata: { slug, active: input.active },
  });
}

export async function listHelpTrainingPathCategories(pathId: string): Promise<HelpCategorySummary[]> {
  return getDatabase()
    .select({
      id: helpCategories.id,
      slug: helpCategories.slug,
      name: helpCategories.name,
      description: helpCategories.description,
      icon: helpCategories.icon,
      sortOrder: helpTrainingPathCategories.sortOrder,
      active: helpCategories.active,
    })
    .from(helpTrainingPathCategories)
    .innerJoin(helpCategories, eq(helpTrainingPathCategories.categoryId, helpCategories.id))
    .where(eq(helpTrainingPathCategories.pathId, pathId))
    .orderBy(asc(helpCategories.sortOrder), asc(helpCategories.name));
}

export async function listHelpTrainingCategoryAssignments(pathIds: string[]): Promise<Map<string, HelpCategorySummary[]>> {
  const result = new Map<string, HelpCategorySummary[]>();
  if (pathIds.length === 0) return result;
  const rows = await getDatabase()
    .select({
      pathId: helpTrainingPathCategories.pathId,
      id: helpCategories.id,
      slug: helpCategories.slug,
      name: helpCategories.name,
      description: helpCategories.description,
      icon: helpCategories.icon,
      sortOrder: helpTrainingPathCategories.sortOrder,
      active: helpCategories.active,
      categorySortOrder: helpCategories.sortOrder,
    })
    .from(helpTrainingPathCategories)
    .innerJoin(helpCategories, eq(helpTrainingPathCategories.categoryId, helpCategories.id))
    .where(inArray(helpTrainingPathCategories.pathId, pathIds))
    .orderBy(asc(helpCategories.sortOrder), asc(helpCategories.name));
  for (const row of rows) {
    const current = result.get(row.pathId) ?? [];
    current.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      icon: row.icon,
      sortOrder: row.categorySortOrder,
      active: row.active,
    });
    result.set(row.pathId, current);
  }
  return result;
}

export async function updateHelpTrainingPathWithCategories(
  actorUserId: string,
  pathId: string,
  input: {
    title: string;
    slug: string;
    audience: string;
    description: string;
    welcomeMessage: string;
    supportQueueId: string | null;
    accessMode: HelpTrainingAccessMode;
    categoryIds: string[];
  },
): Promise<void> {
  const categoryIds = await assertActiveCategoryIds(input.categoryIds);
  const db = getDatabase();
  const [path] = await db
    .select({ id: helpTrainingPaths.id, status: helpTrainingPaths.status })
    .from(helpTrainingPaths)
    .where(eq(helpTrainingPaths.id, pathId))
    .limit(1);
  if (!path) throw new Error("TRAINING_PATH_NOT_FOUND");
  if (path.status === "archived") throw new Error("TRAINING_PATH_ARCHIVED");

  const title = input.title.trim();
  const slug = normalizeTrainingSlug(input.slug || title);
  if (title.length < 4 || !slug) throw new Error("INVALID_TRAINING_PATH");
  if (input.accessMode !== "invite_only" && input.accessMode !== "public") {
    throw new Error("TRAINING_ACCESS_MODE_INVALID");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(helpTrainingPaths)
      .set({
        title,
        slug,
        audience: input.audience.trim(),
        description: input.description.trim(),
        welcomeMessage: input.welcomeMessage.trim(),
        supportQueueId: input.supportQueueId,
        accessMode: input.accessMode,
        status: "draft",
        updatedBy: actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(helpTrainingPaths.id, pathId));

    await tx.delete(helpTrainingPathCategories).where(eq(helpTrainingPathCategories.pathId, pathId));
    if (categoryIds.length > 0) {
      await tx.insert(helpTrainingPathCategories).values(
        categoryIds.map((categoryId) => ({
          pathId,
          categoryId,
          sortOrder: 10,
        })),
      );
    }
  });
}

export async function getHelpCategoriesBySlugs(slugs: string[]): Promise<HelpCategorySummary[]> {
  const normalized = Array.from(new Set(slugs.map(normalizeHelpCategorySlug).filter(Boolean)));
  if (normalized.length === 0) return [];
  return getDatabase()
    .select({
      id: helpCategories.id,
      slug: helpCategories.slug,
      name: helpCategories.name,
      description: helpCategories.description,
      icon: helpCategories.icon,
      sortOrder: helpCategories.sortOrder,
      active: helpCategories.active,
    })
    .from(helpCategories)
    .where(and(inArray(helpCategories.slug, normalized), eq(helpCategories.active, true)))
    .orderBy(asc(helpCategories.sortOrder), asc(helpCategories.name));
}

export async function listPublicHelpCategories() {
  return getDatabase()
    .select({
      id: helpCategories.id,
      slug: helpCategories.slug,
      name: helpCategories.name,
      description: helpCategories.description,
      icon: helpCategories.icon,
      sortOrder: helpCategories.sortOrder,
      trainingCount: count(helpTrainingPaths.id),
    })
    .from(helpCategories)
    .innerJoin(helpTrainingPathCategories, eq(helpTrainingPathCategories.categoryId, helpCategories.id))
    .innerJoin(helpTrainingPaths, eq(helpTrainingPathCategories.pathId, helpTrainingPaths.id))
    .where(and(
      eq(helpCategories.active, true),
      eq(helpTrainingPaths.status, "published"),
      eq(helpTrainingPaths.accessMode, "public"),
      gt(helpTrainingPaths.currentVersion, 0),
    ))
    .groupBy(
      helpCategories.id,
      helpCategories.slug,
      helpCategories.name,
      helpCategories.description,
      helpCategories.icon,
      helpCategories.sortOrder,
    )
    .orderBy(asc(helpCategories.sortOrder), asc(helpCategories.name));
}

export async function getPublicHelpCategory(slug: string) {
  const normalizedSlug = normalizeHelpCategorySlug(slug);
  if (!normalizedSlug) return null;
  const db = getDatabase();
  const [category] = await db
    .select({
      id: helpCategories.id,
      slug: helpCategories.slug,
      name: helpCategories.name,
      description: helpCategories.description,
      icon: helpCategories.icon,
    })
    .from(helpCategories)
    .where(and(eq(helpCategories.slug, normalizedSlug), eq(helpCategories.active, true)))
    .limit(1);
  if (!category) return null;

  const trainings = await db
    .select({
      id: helpTrainingPaths.id,
      slug: helpTrainingPaths.slug,
      title: helpTrainingPaths.title,
      audience: helpTrainingPaths.audience,
    })
    .from(helpTrainingPathCategories)
    .innerJoin(helpTrainingPaths, eq(helpTrainingPathCategories.pathId, helpTrainingPaths.id))
    .where(and(
      eq(helpTrainingPathCategories.categoryId, category.id),
      eq(helpTrainingPaths.status, "published"),
      eq(helpTrainingPaths.accessMode, "public"),
      gt(helpTrainingPaths.currentVersion, 0),
    ))
    .orderBy(asc(helpTrainingPathCategories.sortOrder), asc(helpTrainingPaths.title));

  return { ...category, trainings };
}
