import { and, eq, inArray, sql } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpMovideskArticles } from "$lib/server/db/helpMovideskSchema";
import { helpPublications } from "$lib/server/db/helpPublications";
import {
  helpCategories, helpContentCategories, helpContentFeaturedVideos,
  helpContentSteps, helpContents, helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";

type ReviewBlock = { id: string; type: string; text?: string; label?: string };
type ReviewStep = {
  id: string; title: string; description: string;
  assistantKnowledge: string; blocks: ReviewBlock[];
};
type ReviewItem = {
  sourceId: number; contentId: string; baseUpdatedAt: string;
  action: string; title: string; summary: string; quickGuide: string;
  assistantKnowledge: string; internalSupportNotes: string;
  recommendedCategoryId: string | null;
  featuredVideoAssetId: string | null;
  imageAssetIds: string[];
  steps: ReviewStep[];
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ITEMS = 250;
const MAX_TEXT = 50_000;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("HELP_EDITORIAL_INVALID_FORMAT");
  return value as Record<string, unknown>;
}
function field(row: Record<string, unknown>, key: string, max = MAX_TEXT): string {
  const value = row[key];
  if (typeof value !== "string" || value.length > max)
    throw new Error(`HELP_EDITORIAL_INVALID_FIELD:${key}`);
  return value;
}
function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value))
    throw new Error("HELP_EDITORIAL_INVALID_ID");
  return value;
}
function parseReview(raw: string): ReviewItem[] {
  if (raw.length > 8_000_000) throw new Error("HELP_EDITORIAL_FILE_TOO_LARGE");
  const root = record(JSON.parse(raw) as unknown);
  if (root.format !== "f10-help-editorial-review" || root.version !== 1
    || root.source !== "movidesk" || !Array.isArray(root.items)
    || root.items.length === 0 || root.items.length > MAX_ITEMS) {
    throw new Error("HELP_EDITORIAL_INVALID_FORMAT");
  }
  const ids = new Set<string>();
  return root.items.map((rawItem) => {
    const item = record(rawItem);
    const contentId = uuid(item.contentId);
    const sourceId = Number(item.sourceId);
    if (!Number.isSafeInteger(sourceId) || sourceId < 1
      || ids.has(contentId)) throw new Error("HELP_EDITORIAL_DUPLICATE_ID");
    ids.add(contentId);
    const action = field(item, "action", 40);
    if (!["update-draft", "hold-duplicate"].includes(action))
      throw new Error("HELP_EDITORIAL_ACTION_UNSUPPORTED");
    const baseUpdatedAt = field(item, "baseUpdatedAt", 50);
    if (!Number.isFinite(Date.parse(baseUpdatedAt)))
      throw new Error("HELP_EDITORIAL_INVALID_DATE");
    if (!Array.isArray(item.steps) || item.steps.length === 0 || item.steps.length > 80)
      throw new Error("HELP_EDITORIAL_INVALID_STEPS");
    const stepIds = new Set<string>();
    const blockIds = new Set<string>();
    const steps = item.steps.map((rawStep) => {
      const step = record(rawStep);
      const id = uuid(step.id);
      if (stepIds.has(id)) throw new Error("HELP_EDITORIAL_DUPLICATE_STEP");
      stepIds.add(id);
      if (!Array.isArray(step.blocks) || !step.blocks.length || step.blocks.length > 80)
        throw new Error("HELP_EDITORIAL_INVALID_BLOCKS");
      const blocks = step.blocks.map((rawBlock) => {
        const block = record(rawBlock);
        const bid = uuid(block.id);
        if (blockIds.has(bid)) throw new Error("HELP_EDITORIAL_DUPLICATE_BLOCK");
        blockIds.add(bid);
        const type = field(block, "type", 20);
        if (!["text", "image", "link", "notice", "file"].includes(type))
          throw new Error("HELP_EDITORIAL_BLOCK_TYPE");
        return {
          id: bid, type,
          text: type === "text" ? field(block, "text") : undefined,
          label: type === "link" ? field(block, "label", 240) : undefined,
        };
      });
      return {
        id, title: field(step, "title", 180),
        description: field(step, "description", 2000),
        assistantKnowledge: field(step, "assistantKnowledge", 20_000),
        blocks,
      };
    });
    const imageAssetIds = Array.isArray(item.imageAssetIds)
      ? item.imageAssetIds.map(uuid) : [];
    const recommendedCategoryId = item.recommendedCategoryId === null
      ? null : uuid(item.recommendedCategoryId);
    return {
      sourceId, contentId, action, baseUpdatedAt,
      title: field(item, "title", 160),
      summary: field(item, "summary", 320),
      quickGuide: field(item, "quickGuide", 12_000),
      assistantKnowledge: field(item, "assistantKnowledge", 40_000),
      internalSupportNotes: field(item, "internalSupportNotes", 40_000),
      recommendedCategoryId,
      featuredVideoAssetId: item.featuredVideoAssetId === null
        ? null : uuid(item.featuredVideoAssetId),
      imageAssetIds, steps,
    };
  });
}

export async function processMovideskEditorialReview(
  rawJson: string, actorUserId: string, apply: boolean,
) {
  const parsed = parseReview(rawJson);
  const active = parsed.filter((item) => item.action === "update-draft");
  if (!active.length) throw new Error("HELP_EDITORIAL_NOTHING_TO_APPLY");
  const contentIds = active.map((item) => item.contentId);
  const sourceIds = active.map((item) => item.sourceId);
  const db = getDatabase();

  const report = await db.transaction(async (tx) => {
    const [native, originals, publications, steps, categories, featured, links] = await Promise.all([
      tx.select({
        id: helpContents.id, status: helpContents.status,
        importSource: helpContents.importSource, updatedAt: helpContents.updatedAt,
      }).from(helpContents).where(inArray(helpContents.id, contentIds)),
      tx.select({
        id: helpMovideskArticles.sourceId,
        contentId: helpMovideskArticles.contentId,
        needsReview: helpMovideskArticles.needsReview,
      }).from(helpMovideskArticles).where(inArray(helpMovideskArticles.sourceId, sourceIds)),
      tx.select({ id: helpPublications.entityId })
        .from(helpPublications)
        .where(and(eq(helpPublications.entityType, "content"),
          inArray(helpPublications.entityId, contentIds))),
      tx.select({
        id: helpContentSteps.id, contentId: helpContentSteps.contentId,
      }).from(helpContentSteps).where(inArray(helpContentSteps.contentId, contentIds)),
      tx.select({ id: helpCategories.id })
        .from(helpCategories).where(eq(helpCategories.active, true)),
      tx.select({ contentId: helpContentFeaturedVideos.contentId, assetId: helpContentFeaturedVideos.assetId })
        .from(helpContentFeaturedVideos).where(inArray(helpContentFeaturedVideos.contentId, contentIds)),
      tx.select({ contentId: helpContentCategories.contentId, categoryId: helpContentCategories.categoryId })
        .from(helpContentCategories).where(inArray(helpContentCategories.contentId, contentIds)),
    ]);
    const stepIds = steps.map((row) => row.id);
    const blocks = stepIds.length ? await tx.select({
      id: helpStepBlocks.id, stepId: helpStepBlocks.stepId,
      type: helpStepBlocks.blockType, assetId: helpStepBlocks.assetId,
    }).from(helpStepBlocks).where(inArray(helpStepBlocks.stepId, stepIds)) : [];

    const nativeById = new Map(native.map((row) => [row.id, row]));
    const originalById = new Map(originals.map((row) => [row.id, row]));
    const published = new Set(publications.map((row) => row.id));
    const validCategories = new Set(categories.map((row) => row.id));
    const featuredById = new Map(featured.map((row) => [row.contentId, row.assetId]));
    const existingCategories = new Set(links.map((row) => `${row.contentId}:${row.categoryId}`));
    const stepsById = new Map(steps.map((row) => [row.id, row]));
    const blocksById = new Map(blocks.map((row) => [row.id, row]));
    const stepsByContent = new Map<string, string[]>();
    const blocksByStep = new Map<string, string[]>();
    for (const row of steps) stepsByContent.set(row.contentId,
      [...(stepsByContent.get(row.contentId) ?? []), row.id]);
    for (const row of blocks) blocksByStep.set(row.stepId,
      [...(blocksByStep.get(row.stepId) ?? []), row.id]);

    for (const item of active) {
      const current = nativeById.get(item.contentId);
      const source = originalById.get(item.sourceId);
      if (!current || current.status !== "draft"
        || current.importSource !== "movidesk" || published.has(item.contentId)
        || !source || source.contentId !== item.contentId || !source.needsReview) {
        throw new Error(`HELP_EDITORIAL_CONTENT_PROTECTED:${item.sourceId}`);
      }
      if (current.updatedAt.getTime() !== Date.parse(item.baseUpdatedAt)) {
        throw new Error(`HELP_EDITORIAL_VERSION_CHANGED:${item.sourceId}`);
      }
      if (item.recommendedCategoryId && !validCategories.has(item.recommendedCategoryId))
        throw new Error(`HELP_EDITORIAL_CATEGORY_INVALID:${item.sourceId}`);
      if ((featuredById.get(item.contentId) ?? null) !== item.featuredVideoAssetId)
        throw new Error(`HELP_EDITORIAL_VIDEO_CHANGED:${item.sourceId}`);

      const knownSteps = stepsByContent.get(item.contentId) ?? [];
      if (knownSteps.length !== item.steps.length
        || item.steps.some((step) => !knownSteps.includes(step.id))) {
        throw new Error(`HELP_EDITORIAL_STEPS_CHANGED:${item.sourceId}`);
      }
      const actualImages: string[] = [];
      for (const step of item.steps) {
        if (stepsById.get(step.id)?.contentId !== item.contentId)
          throw new Error(`HELP_EDITORIAL_STEP_OWNERSHIP:${item.sourceId}`);
        const knownBlocks = blocksByStep.get(step.id) ?? [];
        if (knownBlocks.length !== step.blocks.length
          || step.blocks.some((block) => !knownBlocks.includes(block.id))) {
          throw new Error(`HELP_EDITORIAL_BLOCKS_CHANGED:${item.sourceId}`);
        }
        for (const block of step.blocks) {
          const existing = blocksById.get(block.id);
          if (!existing || existing.stepId !== step.id || existing.type !== block.type)
            throw new Error(`HELP_EDITORIAL_BLOCK_OWNERSHIP:${item.sourceId}`);
          if (existing.type === "image" && existing.assetId) actualImages.push(existing.assetId);
        }
      }
      const expectedImages = [...item.imageAssetIds].sort();
      if (JSON.stringify(actualImages.sort()) !== JSON.stringify(expectedImages))
        throw new Error(`HELP_EDITORIAL_IMAGES_CHANGED:${item.sourceId}`);
    }

    if (!apply) return { checked: active.length, applied: 0, held: parsed.length - active.length };

    // Três alterações SQL parametrizadas; nenhum bloco de imagem/vídeo é recriado.
    const contentChanges = active.map((row) => ({
      id: row.contentId, title: row.title, summary: row.summary,
      quickGuide: row.quickGuide, assistantKnowledge: row.assistantKnowledge,
      internalSupportNotes: row.internalSupportNotes,
    }));
    const stepChanges = active.flatMap((row) => row.steps.map((step) => ({
      id: step.id, title: step.title, description: step.description,
      assistantKnowledge: step.assistantKnowledge,
    })));
    const textChanges = active.flatMap((row) => row.steps.flatMap((step) =>
      step.blocks.filter((block) => block.type === "text" || block.type === "link")
        .map((block) => ({ id: block.id, textContent: block.text ?? "",
          linkLabel: block.label ?? "" }))));

    await tx.execute(sql`UPDATE ${helpContents} AS c
      SET title = r.title, summary = r.summary, quick_guide = r.quick_guide,
          assistant_knowledge = r.assistant_knowledge,
          internal_support_notes = r.internal_support_notes,
          updated_by = ${actorUserId}::uuid, updated_at = now()
      FROM jsonb_to_recordset(${JSON.stringify(contentChanges)}::jsonb)
        AS r(id uuid, title text, summary text, quick_guide text,
             assistant_knowledge text, internal_support_notes text)
      WHERE c.id = r.id`);

    await tx.execute(sql`UPDATE ${helpContentSteps} AS s
      SET title = r.title, description = r.description,
          assistant_knowledge = r.assistant_knowledge, updated_at = now()
      FROM jsonb_to_recordset(${JSON.stringify(stepChanges)}::jsonb)
        AS r(id uuid, title text, description text, assistant_knowledge text)
      WHERE s.id = r.id`);

    if (textChanges.length) await tx.execute(sql`UPDATE ${helpStepBlocks} AS b
      SET text_content = CASE WHEN b.block_type = 'text' THEN r.text_content
                              ELSE b.text_content END,
          link_label = CASE WHEN b.block_type = 'link' THEN r.link_label
                            ELSE b.link_label END,
          updated_at = now()
      FROM jsonb_to_recordset(${JSON.stringify(textChanges)}::jsonb)
        AS r(id uuid, text_content text, link_label text)
      WHERE b.id = r.id AND b.block_type IN ('text','link')`);

    const addCategories = active
      .filter((item) => item.recommendedCategoryId
        && !existingCategories.has(`${item.contentId}:${item.recommendedCategoryId}`))
      .map((item) => ({
        contentId: item.contentId, categoryId: item.recommendedCategoryId!,
        destinationUrl: "", sortOrder: 5,
      }));
    if (addCategories.length) await tx.insert(helpContentCategories)
      .values(addCategories).onConflictDoNothing();

    return { checked: active.length, applied: active.length, held: parsed.length - active.length };
  });

  if (apply) await recordAuditEvent({
    actorUserId, action: "help.movidesk.editorial_review_applied",
    entityType: "help_content", entityId: active[0]!.contentId,
    metadata: { applied: report.applied, held: report.held,
      sourceExportedAt: record(JSON.parse(rawJson) as unknown).sourceExportedAt },
  });
  return report;
}
