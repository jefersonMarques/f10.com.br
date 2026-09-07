import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { AiGatewayError } from "$lib/server/ai/aiGateway";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { hasPermission } from "$lib/server/auth/permissions";
import {
  getHelpTrainingLifecycleState,
  restoreHelpTrainingPath,
} from "$lib/server/help/helpTrainingLifecycleRepository";
import {
  generateHelpTrainingFromPublishedContent,
  generateHelpTrainingFromPublishedContents,
} from "$lib/server/help/helpTrainingGeneration";
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
  if (code === "TRAINING_GENERATION_EMPTY") return "A IA não conseguiu associar a linha do tempo do vídeo às etapas publicadas.";
  if (code === "TRAINING_SOURCE_CONTENT_VIDEO_REQUIRED") return "O conteúdo publicado precisa ter um vídeo para criar a trilha.";
  if (code === "TRAINING_SOURCE_CONTENT_STEPS_REQUIRED") return "O conteúdo publicado precisa ter pelo menos uma etapa.";
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
    const contentIds = Array.from(
      new Set(
        formData
          .getAll("contentIds")
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(isUuid),
      ),
    );
    const legacyContentId = read(formData, "contentId");
    if (contentIds.length === 0 && isUuid(legacyContentId)) contentIds.push(legacyContentId);
    if (contentIds.length === 0) {
      return fail(400, { success: false, action: "create", message: "Selecione pelo menos um conteúdo publicado." });
    }
    if (contentIds.length > 20) {
      return fail(400, { success: false, action: "create", message: "Uma trilha pode ter até 20 conteúdos." });
    }

    const title = read(formData, "title");
    if (contentIds.length > 1 && (title.length < 4 || title.length > 160)) {
      return fail(400, { success: false, action: "create", message: "Informe o nome da trilha." });
    }

    try {
      const path = contentIds.length === 1
        ? await generateHelpTrainingFromPublishedContent(session.user.id, contentIds[0]!)
        : await generateHelpTrainingFromPublishedContents(session.user.id, contentIds, title);
      throw redirect(303, `/app/help/trilhas/${path.id}`);
    } catch (cause) {
      if (cause && typeof cause === "object" && "status" in cause && cause.status === 303) throw cause;
      const technicalCode = cause instanceof AiGatewayError
        ? cause.code
        : cause instanceof Error
          ? cause.message
          : "TRAINING_GENERATION_FAILED";
      console.error("[help-training] create failed", {
        moduleCount: contentIds.length,
        technicalCode,
        cause,
      });
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
