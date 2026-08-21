import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { getHelpTrainingPath } from "$lib/server/help/helpTrainingRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.pathId)) throw error(404, "Trilha não encontrada.");
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");
  const path = await getHelpTrainingPath(params.pathId);
  if (!path) throw error(404, "Trilha não encontrada.");

  return {
    preview: {
      id: path.id,
      title: path.title,
      audience: path.audience,
      welcomeMessage: path.welcomeMessage,
      steps: path.steps.map((step) => ({
        id: step.id,
        title: step.title,
        instruction: step.instruction,
        expectedResult: step.expectedResult,
        successMessage: step.successMessage,
        interactionMode: step.interactionMode ?? "action",
        images: step.media
          .filter((media) => media.mediaType === "image" && media.assetId)
          .map((media) => ({ assetId: media.assetId as string, altText: media.altText })),
        videoUrl: step.media.find((media) => media.mediaType === "video")?.sourceUrl ?? null,
        failureReasons: step.failureReasons.map((reason) => ({
          key: reason.reasonKey,
          label: reason.label,
          recoveryMessage: reason.recoveryMessage,
        })),
      })),
    },
  };
};
