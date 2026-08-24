import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getOpenAiModel } from "$lib/server/ai/openAiResponses";
import { getHelpVideoAutomationRuntimeStatus } from "$lib/server/help/helpVideoImportAutomation";
import {
  getHelpVideoAutomationSettings,
  updateHelpVideoAutomationSettings,
} from "$lib/server/settings/operationsSettingsRepository";

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings/help-video");
  const [settings, runtime] = await Promise.all([
    getHelpVideoAutomationSettings(),
    getHelpVideoAutomationRuntimeStatus(),
  ]);
  return {
    settings,
    runtime,
    model: getOpenAiModel(),
  };
};

export const actions: Actions = {
  save: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/help-video",
    );
    const formData = await request.formData();
    await updateHelpVideoAutomationSettings(session.user.id, {
      enabled: formData.get("enabled") === "on",
    });
    return {
      success: true,
      message: "Configuração da automação de vídeos atualizada.",
    };
  },
};
