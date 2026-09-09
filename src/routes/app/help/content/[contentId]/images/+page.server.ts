import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import {
  getHelpHumanReviewStatus,
  listHelpScreenshotReviewGroups,
} from "$lib/server/help/helpScreenshotReviewRepository";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generationCoverageSummary(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const coverage = value as Record<string, unknown>;
  const summaryValue = coverage.summary;
  if (!summaryValue || typeof summaryValue !== "object" || Array.isArray(summaryValue)) return null;
  const summary = summaryValue as Record<string, unknown>;
  const readNumber = (key: string) => {
    const number = Number(summary[key]);
    return Number.isFinite(number) && number >= 0 ? number : 0;
  };
  return {
    totalSegments: readNumber("totalSegments"),
    relevantSegments: readNumber("relevantSegments"),
    coveredRelevantSegments: readNumber("coveredRelevantSegments"),
    ignoredSegments: readNumber("ignoredSegments"),
    uncoveredRelevantSegments: readNumber("uncoveredRelevantSegments"),
    processingParts: readNumber("processingParts"),
    generatedSteps: readNumber("generatedSteps"),
  };
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.contentId)) throw error(404, "Conteúdo não encontrado.");

  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const [content, screenshotReview, humanReview, categories] = await Promise.all([
    getStructuredHelpContent(params.contentId),
    listHelpScreenshotReviewGroups(params.contentId),
    getHelpHumanReviewStatus(params.contentId),
    listHelpCategories(true),
  ]);
  if (!content) throw error(404, "Conteúdo não encontrado.");
  const transcriptTimeline = content.featuredVideo?.metadata?.transcriptTimeline;
  const generationCoverage = generationCoverageSummary(
    content.featuredVideo?.metadata?.generationCoverage,
  );

  return {
    content,
    screenshotReview,
    humanReview,
    categories,
    generationCoverage,
    canGenerateVideoFrames: Boolean(
      content.featuredVideo?.storageKey
      && Array.isArray(transcriptTimeline)
      && transcriptTimeline.length > 0,
    ),
    canEdit: content.status !== "archived" && hasPermission(permissions, "help.edit"),
    canPublish: content.status !== "archived" && hasPermission(permissions, "help.publish"),
  };
};
