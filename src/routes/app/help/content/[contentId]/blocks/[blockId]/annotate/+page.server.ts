import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  parseHelpImageAnnotationsJson,
  readHelpImageAnnotationsFromMetadata,
} from "$lib/help/helpImageAnnotations";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import { updateHelpImageBlockAnnotations } from "$lib/server/help/helpImageAnnotationRepository";
import { getStructuredHelpContent } from "$lib/server/help/structuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function editorPath(contentId: string): string {
  return `/app/help/content/${contentId}`;
}

export const load: PageServerLoad = async ({ params, parent }) => {
  if (!isUuid(params.contentId) || !isUuid(params.blockId)) {
    throw error(404, "Imagem não encontrada.");
  }

  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const content = await getStructuredHelpContent(params.contentId);
  if (!content) throw error(404, "Conteúdo não encontrado.");

  const block = content.steps
    .flatMap((step) => step.blocks.map((item) => ({ ...item, stepTitle: step.title })))
    .find((item) => item.id === params.blockId);

  if (!block || block.blockType !== "image" || block.asset?.assetType !== "image") {
    throw error(404, "Imagem não encontrada.");
  }

  return {
    content: {
      id: content.id,
      title: content.title,
      status: content.status,
      hasPublishedVersion: content.hasPublishedVersion,
    },
    block: {
      id: block.id,
      stepTitle: block.stepTitle,
      assetId: block.asset.id,
      altText: block.asset.altText,
      imageUrl: block.asset.storageKey
        ? `/api/app/help/assets/${block.asset.id}`
        : block.asset.sourceUrl,
      annotations: readHelpImageAnnotationsFromMetadata(block.metadata),
    },
    canEdit: content.status !== "archived" && hasPermission(permissions, "help.edit"),
  };
};

export const actions: Actions = {
  save: async ({ cookies, params, request }) => {
    if (!isUuid(params.contentId) || !isUuid(params.blockId)) {
      return fail(404, { success: false, message: "Imagem não encontrada." });
    }

    const { session } = await requireAppPermission(
      cookies,
      "help.edit",
      `/app/help/content/${params.contentId}/blocks/${params.blockId}/annotate`,
    );
    const formData = await request.formData();
    const raw = formData.get("annotations");
    const annotations = typeof raw === "string" ? parseHelpImageAnnotationsJson(raw) : null;
    if (!annotations) {
      return fail(400, { success: false, message: "As marcações enviadas são inválidas." });
    }

    try {
      await updateHelpImageBlockAnnotations(
        session.user.id,
        params.contentId,
        params.blockId,
        annotations,
      );
    } catch (cause) {
      return fail(409, {
        success: false,
        message:
          cause instanceof Error && cause.message === "CONTENT_ARCHIVED"
            ? "Conteúdos arquivados não podem ser alterados."
            : "Não foi possível salvar as marcações desta imagem.",
      });
    }

    throw redirect(303, editorPath(params.contentId));
  },
};
