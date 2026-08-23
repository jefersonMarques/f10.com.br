import type { LayoutServerLoad } from "./$types";
import { isOpenAiConfigured } from "$lib/server/ai/openAiResponses";
import { isHelpPublicAiSecretConfigured } from "$lib/server/help/helpPublicAiProtection";
import { getHelpPublicAiSettings } from "$lib/server/settings/operationsSettingsRepository";

export const load: LayoutServerLoad = async () => {
  const settings = await getHelpPublicAiSettings();
  return {
    helpPublicAi: {
      enabled: settings.enabled,
      available:
        settings.enabled &&
        isOpenAiConfigured() &&
        isHelpPublicAiSecretConfigured(),
      requiresAuthentication: !settings.anonymousAccessEnabled,
    },
  };
};
