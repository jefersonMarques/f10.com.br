import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  getHelpHumanReviewStatus,
  listHelpScreenshotReviewGroups,
} from "$lib/server/help/helpScreenshotReviewRepository";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.contentId)) throw error(404, "Conteúdo não encontrado.");

  const layout = await parent();
  const permissions = new Map(
    layout.permissions.map((permission) => [permission.code, permission.scope]),
  );
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const [content, screenshotReview, humanReview] = await Promise.all([
    getStructuredHelpContent(params.contentId),
    listHelpScreenshotReviewGroups(params.contentId),
    getHelpHumanReviewStatus(params.contentId),
  ]);
  if (!content) throw error(404, "Conteúdo não encontrado.");

  return {
    content,
    screenshotReview,
    humanReview,
    canEdit: content.status !== "archived" && hasPermission(permissions, "help.edit"),
  };
};
