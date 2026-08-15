import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getPermissionScope,
  hasPermission,
} from "$lib/server/auth/permissions";
import {
  getSupportAiLabConfiguration,
  listRecentSupportAiRuns,
  runSupportAiLab,
} from "$lib/server/support/supportAiAgent";
import { enforceSupportAiRateLimit } from "$lib/server/support/supportAiRateLimit";

function createPermissionMap(
  permissions: Array<{ code: string; scope: "own" | "team" | "all" }>,
) {
  return new Map(
    permissions.map((permission) => [permission.code, permission.scope]),
  );
}

function readQuestion(formData: FormData): string {
  const value = formData.get("question");
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ parent }) => {
  const layout = await parent();
  const permissions = createPermissionMap(layout.permissions);

  if (!hasPermission(permissions, "chat.view")) {
    throw error(403, "Acesso não autorizado.");
  }

  const chatScope = getPermissionScope(permissions, "chat.view");

  return {
    configuration: getSupportAiLabConfiguration(),
    recentRuns: chatScope === "all" ? await listRecentSupportAiRuns(12) : [],
    canAsk: hasPermission(permissions, "chat.respond"),
  };
};

export const actions: Actions = {
  ask: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "chat.respond",
      "/app/chat/lab",
    );
    const formData = await request.formData();
    const question = readQuestion(formData);

    if (question.length < 3 || question.length > 2_000) {
      return fail(400, {
        success: false,
        message: "A pergunta deve ter entre 3 e 2.000 caracteres.",
        question,
        result: null,
      });
    }

    try {
      await enforceSupportAiRateLimit(session.user.id);
      const result = await runSupportAiLab(session.user.id, question);
      const message =
        result.resolution === "answered"
          ? "Resposta gerada com base em conteúdo publicado."
          : result.resolution === "escalate"
            ? "A base não sustentou uma resposta segura. O caso foi marcado para atendimento humano."
            : "O agente falhou e o caso foi marcado para atendimento humano.";

      return {
        success: result.resolution === "answered",
        message,
        question,
        result,
      };
    } catch (cause) {
      if (cause instanceof Error && cause.message === "SUPPORT_AI_RATE_LIMIT") {
        return fail(429, {
          success: false,
          message:
            "Muitas execuções do agente em poucos minutos. Aguarde um pouco antes de testar novamente.",
          question,
          result: null,
        });
      }

      return fail(500, {
        success: false,
        message: "Não foi possível executar o laboratório de IA.",
        question,
        result: null,
      });
    }
  },
};
