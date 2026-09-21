import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { hasPermission } from "$lib/server/auth/permissions";
import { getHelpTrainingPath } from "$lib/server/help/helpTrainingRepository";
import { parseHelpImageAnnotations } from "$lib/help/helpImageAnnotations";

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
      sourceContent: path.items[0]?.sourcePublicationSnapshot ?? path.sourcePublicationSnapshot,
      modules: path.items.map((item) => ({
        id: item.id,
        title: item.sourcePublicationSnapshot.title,
        summary: item.sourcePublicationSnapshot.summary || item.sourcePublicationSnapshot.quickGuide || "",
        slug: item.sourcePublicationSnapshot.slug,
        sortOrder: item.sortOrder,
        stepIds: path.steps.filter((step) => step.pathItemId === item.id).map((step) => step.id),
      })),
      steps: path.steps.map((step) => {
        const interactionMode = step.interactionMode ?? "action";
        const sourceContent = path.items.find((item) => item.id === step.pathItemId)?.sourcePublicationSnapshot
          ?? path.sourcePublicationSnapshot;
        return {
          id: step.id,
          pathItemId: step.pathItemId,
          sourceContentSlug: sourceContent.slug,
          title: step.title,
          question: step.question?.trim() || step.title,
          instruction: step.instruction,
          expectedResult: step.expectedResult,
          successMessage: step.successMessage,
          primaryActionLabel: step.primaryActionLabel?.trim() || "Continuar",
          interactionMode,
          estimatedSeconds: step.estimatedSeconds,
          videoStartSeconds: step.videoStartSeconds,
          videoEndSeconds: step.videoEndSeconds,
          images: step.media
            .filter((media) => media.mediaType === "image" && media.assetId)
            .slice(0, 1)
            .map((media) => {
              const sourceStep = step.sourceContentStepId
                ? sourceContent.steps.find(
                    (source) => source.id === step.sourceContentStepId,
                  )
                : null;
              const sourceBlock = sourceStep?.blocks.find(
                (block) => block.blockType === "image" && block.asset?.id === media.assetId,
              );
              return {
                assetId: media.assetId as string,
                altText: media.altText,
                annotations: parseHelpImageAnnotations(sourceBlock?.annotations) ?? [],
              };
            }),
          videoUrl: (() => {
            const video = step.media.find(
              (media) =>
                media.mediaType === "video" &&
                media.assetId &&
                media.assetMimeType === "video/mp4",
            );
            return video?.assetId ? `asset:${video.assetId}` : null;
          })(),
        };
      }),
    },
  };
};
