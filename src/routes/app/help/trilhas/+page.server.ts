import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { AiGatewayError } from "$lib/server/ai/aiGateway";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  getHelpTrainingLifecycleState,
  restoreHelpTrainingPath,
} from "$lib/server/help/helpTrainingLifecycleRepository";
import { generateHelpTrainingFromPublishedContent } from "$lib/server/help/helpTrainingGeneration";
import { listHelpTrainingPaths } from "$lib/server/help/helpTrainingRepository";
import { listPublishedStructuredHelpCatalog } from "$lib/server/help/publicStructuredHelpRepository";

function read(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function generationMessage(cause: unknown): string {
  const code = cause instanceof Error ? cause.message : "";
  if (code === "TRAINING_SOURCE_CONTENT_NOT_PUBLISHED") return "Selecione um conteúdo publicado.";
  if (code === "TRAINING_GENERATION_EMPTY") return "A IA não encontrou slides visuais seguros para gerar a trilha. Revise o conteúdo publicado.";
  if (code === "TRAINING_SOURCE_CONTENT_VIDEO_REQUIRED") return "O conteúdo publicado precisa ter um vídeo para criar a trilha.";
  if (code === "TRAINING_SOURCE_CONTENT_IMAGES_REQUIRED" || code === "TRAINING_GENERATION_IMAGE_REQUIRED") return "O conteúdo publicado precisa ter imagens associadas aos passos. Cada slide da trilha exige uma imagem.";
  if (cause instanceof AiGatewayError) {
    if (cause.code === "AI_TASK_DISABLED") return "Habilite a função “Geração de trilhas” em Configurações > Inteligência Artificial.";
    if (cause.code === "AI_PROVIDER_NOT_CONFIGURED" || cause.code === "AI_CREDENTIAL_UNAVAILABLE") {
      return "Configure a credencial do provedor usado em “Geração de trilhas”.";
    }
    if (cause.code === "AI_TIMEOUT") return "A geração demorou além do limite. Tente novamente.";
  }
  return "Não foi possível gerar a trilha a partir deste conteúdo.";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = new Map(layout.permissions.map((permission) => [permission.code, permission.scope]));
  if (!hasPermission(permissions, "help.view")) throw error(403, "Acesso não autorizado.");

  const [paths, publishedContents] = await Promise.all([
    listHelpTrainingPaths(),
    listPublishedStructuredHelpCatalog(),
  ]);

  return {
    paths,
    publishedContents,
    canEdit: hasPermission(permissions, "help.edit"),
    canPublish: hasPermission(permissions, "help.publish"),
  };
};

export const actions: Actions = {
  create: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.edit", "/app/help/trilhas");
    const formData = await request.formData();
    const contentId = read(formData, "contentId");
    if (!isUuid(contentId)) {
      return fail(400, { success: false, action: "create", message: "Selecione um conteúdo publicado." });
    }

    try {
      const path = await generateHelpTrainingFromPublishedContent(session.user.id, contentId);
      throw redirect(303, `/app/help/trilhas/${path.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      return fail(409, { success: false, action: "create", message: generationMessage(cause) });
    }
  },

  restore: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "help.publish", "/app/help/trilhas");
    const pathId = read(await request.formData(), "pathId");
    if (!isUuid(pathId)) return fail(400, { success: false, message: "Trilha inválida." });
    const target = await getHelpTrainingLifecycleState(pathId);
    if (!target) return fail(404, { success: false, message: "Trilha não encontrada." });
    try {
      await restoreHelpTrainingPath(session.user.id, pathId);
    } catch {
      return fail(409, { success: false, message: "Não foi possível restaurar esta trilha." });
    }
    throw redirect(303, `/app/help/trilhas/${pathId}`);
  },
};
