import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getOpenAiModel, isOpenAiConfigured } from "$lib/server/ai/openAiResponses";
import { getAssetStorageStatus, testAssetStorageConnection } from "$lib/server/storage/assetStorage";
import { getRemoteProviderStatus, testRemoteSupportProvider } from "$lib/server/remote/remoteSupportProvider";
import { isSupportAiChatEnabled } from "$lib/server/support/supportAiChat";
import {
  getGeneralOperationsSettings,
  updateGeneralOperationsSettings,
} from "$lib/server/settings/operationsSettingsRepository";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings");
  return {
    general: await getGeneralOperationsSettings(),
    storage: getAssetStorageStatus(),
    ai: {
      configured: isOpenAiConfigured(),
      model: getOpenAiModel(),
      chatEnabled: isSupportAiChatEnabled(),
    },
    remote: getRemoteProviderStatus(),
  };
};

export const actions: Actions = {
  saveGeneral: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(cookies, "system.settings.manage", "/app/settings");
    const formData = await request.formData();
    const supportDisplayName = readString(formData, "supportDisplayName");
    const timezone = readString(formData, "timezone");
    const remoteConsentMinutes = Number(readString(formData, "remoteConsentMinutes"));
    if (supportDisplayName.length < 2 || supportDisplayName.length > 120 || timezone.length < 3 || timezone.length > 80 || !Number.isInteger(remoteConsentMinutes) || remoteConsentMinutes < 5 || remoteConsentMinutes > 120) {
      return fail(400, { success: false, action: "saveGeneral", message: "Revise os valores das configurações gerais." });
    }
    await updateGeneralOperationsSettings(session.user.id, { supportDisplayName, timezone, remoteConsentMinutes });
    return { success: true, action: "saveGeneral", message: "Configurações gerais atualizadas." };
  },

  testStorage: async ({ cookies }) => {
    await requireAppPermission(cookies, "system.settings.manage", "/app/settings");
    const ok = await testAssetStorageConnection();
    return ok
      ? { success: true, action: "testStorage", message: "MinIO/S3 respondeu ao teste de escrita e remoção." }
      : fail(503, { success: false, action: "testStorage", message: "Não foi possível gravar no MinIO/S3. Revise endpoint, bucket e credenciais." });
  },

  testRemote: async ({ cookies }) => {
    await requireAppPermission(cookies, "system.settings.manage", "/app/settings");
    const ok = await testRemoteSupportProvider();
    return ok
      ? { success: true, action: "testRemote", message: "MeshCentral está acessível pelo servidor F10." }
      : fail(503, { success: false, action: "testRemote", message: "Não foi possível acessar o MeshCentral com a configuração atual." });
  },
};
