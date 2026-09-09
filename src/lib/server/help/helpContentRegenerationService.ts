import { recordHelpAiUsage } from "$lib/server/help/helpAiUsageRepository";
import { readManagedHelpAsset } from "$lib/server/help/helpAssetRepository";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import {
  findImportedHelpVideoByChecksum,
  attachImportedMp4AsFeaturedVideo,
  saveHelpImportedVideoTimeline,
} from "$lib/server/help/helpImportedFeaturedVideo";
import { replaceHelpScreenshotReviewCandidates } from "$lib/server/help/helpScreenshotReviewRepository";
import {
  importStructuredHelpFile,
  type HelpImportFile,
} from "$lib/server/help/structuredHelpImport";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";
import {
  generateHelpImportFromVideo,
  type HelpVideoAutomationProgress,
} from "$lib/server/help/helpVideoImportAutomation";

export type HelpContentRegenerationSource =
  | { type: "current" }
  | {
      type: "upload";
      fileName: string;
      mimeType: string;
      bytes: Uint8Array;
    };

function normalizeSingleScreenshotPerStep(file: HelpImportFile): void {
  for (const content of file.contents) {
    for (const step of content.steps) {
      let imageFound = false;
      step.blocks = step.blocks.filter((block) => {
        if (block.type !== "image") return true;
        if (imageFound) return false;
        imageFound = true;
        return true;
      });
    }
  }
}

function mergeAliases(current: string[], generated: string[]): string[] {
  return Array.from(
    new Set(
      [...current, ...generated]
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 80);
}

export async function regenerateHelpContentFromVideo(input: {
  actorUserId: string;
  contentId: string;
  source: HelpContentRegenerationSource;
  onProgress?: (progress: HelpVideoAutomationProgress) => void | Promise<void>;
}) {
  const current = await getStructuredHelpContent(input.contentId);
  if (!current) throw new Error("CONTENT_NOT_FOUND");
  if (current.status === "archived") throw new Error("CONTENT_ARCHIVED");

  let videoBytes: Uint8Array;
  let fileName: string;
  let mimeType = "video/mp4";
  let reusedExistingVideo = input.source.type === "current";

  if (input.source.type === "current") {
    if (!current.featuredVideo?.storageKey) throw new Error("HELP_VIDEO_LOCAL_COPY_REQUIRED");
    const managed = await readManagedHelpAsset(current.featuredVideo.id);
    videoBytes = new Uint8Array(await managed.response.arrayBuffer());
    fileName = managed.asset.originalName || "video-atual.mp4";
    mimeType = managed.asset.mimeType || "video/mp4";
  } else {
    videoBytes = input.source.bytes;
    fileName = input.source.fileName || "video-atualizado.mp4";
    mimeType = input.source.mimeType || "video/mp4";
    const duplicate = await findImportedHelpVideoByChecksum(videoBytes, input.contentId);
    if (duplicate?.contentId && duplicate.contentId !== input.contentId) {
      throw new Error(`HELP_VIDEO_ALREADY_USED:${duplicate.contentId}`);
    }
    reusedExistingVideo = duplicate?.contentId === input.contentId;
  }

  const categories = (await listHelpCategories(true))
    .filter((category) => category.active)
    .map((category) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
    }));

  const generated = await generateHelpImportFromVideo({
    source: {
      type: "upload",
      fileName,
      mimeType,
      bytes: videoBytes,
    },
    categories,
    externalIdHint: current.importExternalId || `content:${current.id}`,
    onProgress: input.onProgress,
    onAiUsage: (usage) =>
      recordHelpAiUsage({
        actorUserId: input.actorUserId,
        ...usage,
        metadata: {
          sourceType: input.source.type === "current" ? "existing_video" : "updated_video",
          contentId: input.contentId,
        },
      }).catch(() => undefined),
  });

  normalizeSingleScreenshotPerStep(generated.file);
  const generatedContent = generated.file.contents[0];
  if (!generatedContent) throw new Error("IMPORT_CONTENT_NOT_CREATED");

  generated.file = {
    ...generated.file,
    source: current.importSource || "content-regeneration",
    contents: [{
      ...generatedContent,
      externalId: current.importExternalId || `content:${current.id}`,
      title: current.title,
      slug: current.slug,
      categories: current.categories.map((category) => ({
        slug: category.slug,
        destinationUrl: category.destinationUrl,
      })),
      searchAliases: mergeAliases(current.searchAliases, generatedContent.searchAliases),
      assistantKnowledge:
        current.assistantKnowledge.trim() || generatedContent.assistantKnowledge || "",
      internalSupportNotes: current.internalSupportNotes,
      featuredVideo: undefined,
    }],
  };

  const result = await importStructuredHelpFile(
    input.actorUserId,
    generated.file,
    generated.assets,
    { targetContentId: input.contentId },
  );
  const importedContent = result.imported[0];
  if (!importedContent) throw new Error("IMPORT_CONTENT_NOT_CREATED");

  await attachImportedMp4AsFeaturedVideo({
    actorUserId: input.actorUserId,
    contentId: input.contentId,
    bytes: videoBytes,
    fileName,
    subtitles: generated.transcript,
    altText: generatedContent.summary || current.summary || current.title,
    assistantSummary:
      generatedContent.quickGuide || generatedContent.summary || current.summary || current.title,
    transcriptTimeline: generated.transcriptTimeline,
    generationCoverage: generated.coverage,
  });

  await saveHelpImportedVideoTimeline(
    input.actorUserId,
    input.contentId,
    generated.transcriptTimeline,
  );

  await replaceHelpScreenshotReviewCandidates(
    input.actorUserId,
    input.contentId,
    generated.reviewCandidates,
  );

  const updated = await getStructuredHelpContent(input.contentId);
  if (!updated) throw new Error("CONTENT_NOT_FOUND");

  const previousStepCount = current.steps.length;
  const nextStepCount = updated.steps.length;
  return {
    content: updated,
    summary: {
      previousStepCount,
      nextStepCount,
      addedSteps: Math.max(0, nextStepCount - previousStepCount),
      removedSteps: Math.max(0, previousStepCount - nextStepCount),
      screenshotCount: generated.selectedScreenshotCount,
      transcriptChars: generated.transcriptChars,
      videoReused: reusedExistingVideo,
      coverage: generated.coverage.summary,
    },
  };
}
