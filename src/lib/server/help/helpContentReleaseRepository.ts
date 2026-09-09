import { and, desc, eq } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import {
  helpAssets,
  helpContentCategories,
  helpContentFeaturedVideos,
  helpContentReleaseAssets,
  helpContentReleases,
  helpContentSteps,
  helpContents,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { saveHelpContentVersion } from "$lib/server/help/helpVersionRepository";
import {
  parsePublishedStructuredHelpSnapshot,
  type PublishedStructuredHelp,
} from "$lib/server/help/publicStructuredHelpRepository";

type EditorSnapshotAsset = {
  id: string;
  assetType: "image" | "video" | "file";
  sourceUrl: string | null;
  storageKey: string | null;
  altText: string;
  assistantDescription: string;
  subtitles: string;
  assistantSummary: string;
  extractedText: string;
};

type EditorSnapshotCategory = {
  id: string;
  destinationUrl?: string;
  sortOrder?: number;
};

type EditorSnapshotBlock = {
  id: string;
  blockType: "text" | "image" | "notice" | "link" | "file";
  textContent: string;
  linkUrl: string | null;
  linkLabel: string | null;
  noticeVariant: string | null;
  sortOrder: number;
  asset: EditorSnapshotAsset | null;
};

type EditorSnapshotStep = {
  id: string;
  title: string;
  description: string;
  assistantKnowledge: string;
  sortOrder: number;
  blocks: EditorSnapshotBlock[];
};

type EditorSnapshot = {
  slug: string;
  title: string;
  summary: string;
  quickGuide?: string;
  searchAliases: string[];
  assistantKnowledge: string;
  internalSupportNotes: string;
  categories: EditorSnapshotCategory[];
  featuredVideo: EditorSnapshotAsset | null;
  steps: EditorSnapshotStep[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? String(record[key]) : "";
}

function parseEditorAsset(value: unknown): EditorSnapshotAsset | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id");
  const assetType = readString(record, "assetType");
  if (!id || !["image", "video", "file"].includes(assetType)) return null;
  return {
    id,
    assetType: assetType as EditorSnapshotAsset["assetType"],
    sourceUrl: readString(record, "sourceUrl") || null,
    storageKey: readString(record, "storageKey") || null,
    altText: readString(record, "altText"),
    assistantDescription: readString(record, "assistantDescription"),
    subtitles: readString(record, "subtitles"),
    assistantSummary: readString(record, "assistantSummary"),
    extractedText: readString(record, "extractedText"),
  };
}

function parseEditorSnapshot(value: unknown): EditorSnapshot | null {
  const record = asRecord(value);
  if (!record) return null;
  const slug = readString(record, "slug");
  const title = readString(record, "title");
  if (!slug || !title) return null;

  const categories = Array.isArray(record.categories)
    ? record.categories.flatMap((value, index) => {
        const category = asRecord(value);
        const id = category ? readString(category, "id") : "";
        if (!id) return [];
        return [{
          id,
          destinationUrl: category ? readString(category, "destinationUrl") : "",
          sortOrder:
            category && typeof category.sortOrder === "number"
              ? category.sortOrder
              : (index + 1) * 10,
        }];
      })
    : [];

  const steps = Array.isArray(record.steps)
    ? record.steps.flatMap((value, stepIndex) => {
        const step = asRecord(value);
        if (!step) return [];
        const title = readString(step, "title");
        if (!title) return [];
        const blocks = Array.isArray(step.blocks)
          ? step.blocks.flatMap((blockValue, blockIndex) => {
              const block = asRecord(blockValue);
              if (!block) return [];
              const blockType = readString(block, "blockType");
              if (!["text", "image", "notice", "link", "file"].includes(blockType)) return [];
              return [{
                id: readString(block, "id"),
                blockType: blockType as EditorSnapshotBlock["blockType"],
                textContent: readString(block, "textContent"),
                linkUrl: readString(block, "linkUrl") || null,
                linkLabel: readString(block, "linkLabel") || null,
                noticeVariant: readString(block, "noticeVariant") || null,
                sortOrder:
                  typeof block.sortOrder === "number"
                    ? block.sortOrder
                    : (blockIndex + 1) * 10,
                asset: parseEditorAsset(block.asset),
              }];
            })
          : [];
        return [{
          id: readString(step, "id"),
          title,
          description: readString(step, "description"),
          assistantKnowledge: readString(step, "assistantKnowledge"),
          sortOrder:
            typeof step.sortOrder === "number"
              ? step.sortOrder
              : (stepIndex + 1) * 10,
          blocks,
        }];
      })
    : [];

  const aliases = Array.isArray(record.searchAliases)
    ? record.searchAliases.filter((item): item is string => typeof item === "string")
    : [];

  return {
    slug,
    title,
    summary: readString(record, "summary"),
    quickGuide: readString(record, "quickGuide"),
    searchAliases: aliases,
    assistantKnowledge: readString(record, "assistantKnowledge"),
    internalSupportNotes: readString(record, "internalSupportNotes"),
    categories,
    featuredVideo: parseEditorAsset(record.featuredVideo),
    steps,
  };
}

export async function listHelpContentReleases(contentId: string) {
  return getDatabase()
    .select({
      id: helpContentReleases.id,
      releaseNumber: helpContentReleases.releaseNumber,
      changeSummary: helpContentReleases.changeSummary,
      sourceVideoAssetId: helpContentReleases.sourceVideoAssetId,
      canRestore: helpContentReleases.editorSnapshot,
      publishedBy: helpContentReleases.publishedBy,
      publishedAt: helpContentReleases.publishedAt,
    })
    .from(helpContentReleases)
    .where(eq(helpContentReleases.contentId, contentId))
    .orderBy(desc(helpContentReleases.releaseNumber))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        canRestore: Boolean(row.canRestore),
      })),
    );
}

export async function getHelpContentRelease(
  contentId: string,
  releaseNumber: number,
) {
  const [row] = await getDatabase()
    .select()
    .from(helpContentReleases)
    .where(
      and(
        eq(helpContentReleases.contentId, contentId),
        eq(helpContentReleases.releaseNumber, releaseNumber),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function getPublicHelpContentReleaseBySlug(
  slug: string,
  releaseNumber: number,
): Promise<PublishedStructuredHelp | null> {
  const rows = await getDatabase()
    .select({
      contentId: helpContentReleases.contentId,
      releaseNumber: helpContentReleases.releaseNumber,
      publicSnapshot: helpContentReleases.publicSnapshot,
      publishedAt: helpContentReleases.publishedAt,
    })
    .from(helpContentReleases)
    .orderBy(desc(helpContentReleases.releaseNumber));

  for (const row of rows) {
    if (row.releaseNumber !== releaseNumber) continue;
    const parsed = parsePublishedStructuredHelpSnapshot(
      row.contentId,
      row.publishedAt,
      row.publicSnapshot,
    );
    if (parsed?.slug === slug) return parsed;
  }
  return null;
}

export async function restoreHelpContentReleaseAsDraft(input: {
  actorUserId: string;
  contentId: string;
  releaseNumber: number;
}): Promise<void> {
  const release = await getHelpContentRelease(input.contentId, input.releaseNumber);
  if (!release?.editorSnapshot) throw new Error("HELP_RELEASE_NOT_RESTORABLE");
  const snapshot = parseEditorSnapshot(release.editorSnapshot);
  if (!snapshot) throw new Error("HELP_RELEASE_SNAPSHOT_INVALID");
  if (snapshot.categories.length === 0 || snapshot.steps.length === 0) {
    throw new Error("HELP_RELEASE_SNAPSHOT_INVALID");
  }

  const db = getDatabase();
  const assetIds = Array.from(new Set([
    ...(snapshot.featuredVideo ? [snapshot.featuredVideo.id] : []),
    ...snapshot.steps.flatMap((step) =>
      step.blocks.flatMap((block) => block.asset ? [block.asset.id] : []),
    ),
  ]));
  const availableAssets = assetIds.length
    ? await db.select({ id: helpAssets.id }).from(helpAssets)
        .where(
          // IDs são protegidos por help_content_release_assets.
          // O filtro individual evita restaurar uma release corrompida.
          assetIds.length === 1
            ? eq(helpAssets.id, assetIds[0]!)
            : undefined as never,
        )
    : [];
  if (assetIds.length === 1 && availableAssets.length !== 1) {
    throw new Error("HELP_RELEASE_ASSET_MISSING");
  }
  if (assetIds.length > 1) {
    const allAssets = await Promise.all(
      assetIds.map(async (assetId) => {
        const [row] = await db.select({ id: helpAssets.id })
          .from(helpAssets)
          .where(eq(helpAssets.id, assetId))
          .limit(1);
        return row?.id ?? null;
      }),
    );
    if (allAssets.some((assetId) => !assetId)) throw new Error("HELP_RELEASE_ASSET_MISSING");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(helpContentFeaturedVideos)
      .where(eq(helpContentFeaturedVideos.contentId, input.contentId));
    await tx
      .delete(helpContentCategories)
      .where(eq(helpContentCategories.contentId, input.contentId));
    await tx
      .delete(helpContentSteps)
      .where(eq(helpContentSteps.contentId, input.contentId));

    await tx
      .update(helpContents)
      .set({
        slug: snapshot.slug,
        title: snapshot.title,
        summary: snapshot.summary,
        quickGuide: snapshot.quickGuide ?? "",
        searchAliases: snapshot.searchAliases,
        assistantKnowledge: snapshot.assistantKnowledge,
        internalSupportNotes: snapshot.internalSupportNotes,
        status: "draft",
        updatedBy: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(helpContents.id, input.contentId));

    await tx.insert(helpContentCategories).values(
      snapshot.categories.map((category, index) => ({
        contentId: input.contentId,
        categoryId: category.id,
        destinationUrl: category.destinationUrl ?? "",
        sortOrder: category.sortOrder ?? (index + 1) * 10,
      })),
    );

    if (snapshot.featuredVideo) {
      await tx.insert(helpContentFeaturedVideos).values({
        contentId: input.contentId,
        assetId: snapshot.featuredVideo.id,
      });
    }

    for (const [stepIndex, step] of snapshot.steps.entries()) {
      const [createdStep] = await tx
        .insert(helpContentSteps)
        .values({
          contentId: input.contentId,
          title: step.title,
          description: step.description,
          assistantKnowledge: step.assistantKnowledge,
          sortOrder: (stepIndex + 1) * 10,
        })
        .returning({ id: helpContentSteps.id });
      if (!createdStep) throw new Error("HELP_RELEASE_STEP_RESTORE_FAILED");

      if (step.blocks.length > 0) {
        await tx.insert(helpStepBlocks).values(
          step.blocks.map((block, blockIndex) => ({
            stepId: createdStep.id,
            blockType: block.blockType,
            textContent: block.textContent,
            assetId: block.asset?.id ?? null,
            linkUrl: block.linkUrl,
            linkLabel: block.linkLabel,
            noticeVariant: block.noticeVariant,
            sortOrder: (blockIndex + 1) * 10,
          })),
        );
      }
    }
  });

  await saveHelpContentVersion(
    "content",
    input.contentId,
    release.editorSnapshot,
    input.actorUserId,
  );
  await recordAuditEvent({
    actorUserId: input.actorUserId,
    action: "help.content.release_restored",
    entityType: "help_content",
    entityId: input.contentId,
    metadata: { releaseNumber: input.releaseNumber },
  });
}

export async function isHelpAssetUsedByRelease(assetId: string): Promise<boolean> {
  const [row] = await getDatabase()
    .select({ releaseId: helpContentReleaseAssets.releaseId })
    .from(helpContentReleaseAssets)
    .where(eq(helpContentReleaseAssets.assetId, assetId))
    .limit(1);
  return Boolean(row);
}
