import { createHash, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";
import { getDatabase } from "$lib/server/db";
import {
  helpCategories,
  helpContentCategories,
  helpContents,
} from "$lib/server/db/structuredHelpSchema";
import {
  createHelpVideoProcessingJob,
  type HelpVideoProcessingJobView,
} from "$lib/server/help/helpVideoProcessingRepository";

const VIDEO_IMPORT_SOURCE = "f10-auto-video";

function normalizeExternalId(bytes: Uint8Array, value: string): string {
  const explicit = value.trim().slice(0, 200);
  if (explicit) return explicit;
  const checksum = createHash("sha256").update(bytes).digest("hex");
  return `sha256:${checksum}`;
}

function pendingTitle(fileName: string): string {
  const title = fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return title || "Vídeo em processamento";
}

async function findImportTarget(externalId: string): Promise<string | null> {
  const [content] = await getDatabase()
    .select({ id: helpContents.id })
    .from(helpContents)
    .where(
      and(
        eq(helpContents.importSource, VIDEO_IMPORT_SOURCE),
        eq(helpContents.importExternalId, externalId),
      ),
    )
    .limit(1);
  return content?.id ?? null;
}

async function createPendingContent(input: {
  actorUserId: string;
  fileName: string;
  externalId: string;
}): Promise<{ contentId: string; created: boolean }> {
  const existingId = await findImportTarget(input.externalId);
  if (existingId) return { contentId: existingId, created: false };

  const db = getDatabase();
  const [uncategorized] = await db
    .select({ id: helpCategories.id })
    .from(helpCategories)
    .where(
      and(
        eq(helpCategories.slug, UNCATEGORIZED_HELP_CATEGORY_SLUG),
        eq(helpCategories.active, true),
      ),
    )
    .limit(1);
  if (!uncategorized) {
    throw new Error("HELP_CATEGORY_UNCATEGORIZED_NOT_FOUND");
  }

  const contentId = randomUUID();
  try {
    await db.transaction(async (tx) => {
      await tx.insert(helpContents).values({
        id: contentId,
        slug: `video-processing-${contentId}`,
        title: pendingTitle(input.fileName),
        summary: "",
        quickGuide: "",
        searchAliases: [],
        assistantKnowledge: "",
        internalSupportNotes: "",
        status: "draft",
        importSource: VIDEO_IMPORT_SOURCE,
        importExternalId: input.externalId,
        createdBy: input.actorUserId,
        updatedBy: input.actorUserId,
      });
      await tx.insert(helpContentCategories).values({
        contentId,
        categoryId: uncategorized.id,
        destinationUrl: "",
        sortOrder: 10,
      });
    });
    return { contentId, created: true };
  } catch (cause) {
    const racedId = await findImportTarget(input.externalId).catch(() => null);
    if (racedId) return { contentId: racedId, created: false };
    throw cause;
  }
}

export async function createHelpVideoImportProcessingJob(input: {
  actorUserId: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  externalId: string;
}): Promise<HelpVideoProcessingJobView> {
  const externalId = normalizeExternalId(input.bytes, input.externalId);
  const target = await createPendingContent({
    actorUserId: input.actorUserId,
    fileName: input.fileName,
    externalId,
  });

  try {
    return await createHelpVideoProcessingJob({
      actorUserId: input.actorUserId,
      contentId: target.contentId,
      operation: "import",
      importExternalId: externalId,
      source: {
        type: "upload",
        fileName: input.fileName,
        mimeType: input.mimeType,
        bytes: input.bytes,
      },
    });
  } catch (cause) {
    if (target.created) {
      await getDatabase()
        .delete(helpContents)
        .where(eq(helpContents.id, target.contentId))
        .catch(() => undefined);
    }
    throw cause;
  }
}
