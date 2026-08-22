import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getOpenAiModel, isOpenAiConfigured } from "$lib/server/ai/openAiResponses";
import { isHelpPublicAiSecretConfigured } from "$lib/server/help/helpPublicAiProtection";
import {
  getMeshCentralControlStatus,
  listMeshCentralDeviceGroups,
} from "$lib/server/remote/meshCentralControl";
import {
  getRemoteProviderStatus,
  testRemoteSupportProvider,
} from "$lib/server/remote/remoteSupportProvider";
import {
  getGeneralOperationsSettings,
  getHelpPublicAiSettings,
  updateGeneralOperationsSettings,
  updateHelpPublicAiSettings,
} from "$lib/server/settings/operationsSettingsRepository";
import {
  getAssetStorageStatus,
  testAssetStorageConnection,
} from "$lib/server/storage/assetStorage";
import { isSupportAiChatEnabled } from "$lib/server/support/supportAiChat";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on";
}

function isValidOptionalEmail(value: string): boolean {
  return !value || (value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings");
  const [general, helpPublicAi] = await Promise.all([
    getGeneralOperationsSettings(),
    getHelpPublicAiSettings(),
  ]);

  return {
    general,
    helpPublicAi,
    storage: getAssetStorageStatus(),
    ai: {
      configured: isOpenAiConfigured(),
      model: getOpenAiModel(),
      chatEnabled: isSupportAiChatEnabled(),
      publicHelpSecretConfigured: isHelpPublicAiSecretConfigured(),
    },
    remote: getRemoteProviderStatus(),
    remoteControl: getMeshCentralControlStatus(),
  };
};

export const actions: Actions = {
  saveGeneral: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings",
    );
    const formData = await request.formData();
    const supportDisplayName = readString(formData, "supportDisplayName");
    const supportSenderEmail = readString(formData, "supportSenderEmail").toLowerCase();
    const supportSenderName = readString(formData, "supportSenderName");
    const timezone = readString(formData, "timezone");
    const remoteConsentMinutes = Number(readString(formData, "remoteConsentMinutes"));
    if (
      supportDisplayName.length < 2 ||
      supportDisplayName.length > 120 ||
      !isValidOptionalEmail(supportSenderEmail) ||
      supportSenderName.length < 2 ||
      supportSenderName.length > 120 ||
      timezone.length < 3 ||
      timezone.length > 80 ||
      !Number.isInteger(remoteConsentMinutes) ||
      remoteConsentMinutes < 5 ||
      remoteConsentMinutes > 120
    ) {
      return fail(400, {
        success: false,
        action: "saveGeneral",
        message: "Revise os valores das configurações gerais.",
      });
    }
    await updateGeneralOperationsSettings(session.user.id, {
      supportDisplayName,
      supportSenderEmail,
      supportSenderName,
      timezone,
      remoteConsentMinutes,
    });
    return {
      success: true,
      action: "saveGeneral",
      message: "Configurações gerais atualizadas.",
    };
  },

  saveHelpPublicAi: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings",
    );
    const formData = await request.formData();
    const enabled = readBoolean(formData, "enabled");
    const anonymousAccessEnabled = readBoolean(formData, "anonymousAccessEnabled");
    const rateLimitWindowMinutes = Number(readString(formData, "rateLimitWindowMinutes"));
    const sessionRequestLimit = Number(readString(formData, "sessionRequestLimit"));
    const ipRequestLimit = Number(readString(formData, "ipRequestLimit"));
    const globalRequestLimitPerHour = Number(readString(formData, "globalRequestLimitPerHour"));

    if (
      !Number.isInteger(rateLimitWindowMinutes) ||
      rateLimitWindowMinutes < 1 ||
      rateLimitWindowMinutes > 60 ||
      !Number.isInteger(sessionRequestLimit) ||
      sessionRequestLimit < 1 ||
      sessionRequestLimit > 100 ||
      !Number.isInteger(ipRequestLimit) ||
      ipRequestLimit < 1 ||
      ipRequestLimit > 500 ||
      ipRequestLimit < sessionRequestLimit ||
      !Number.isInteger(globalRequestLimitPerHour) ||
      globalRequestLimitPerHour < 10 ||
      globalRequestLimitPerHour > 50_000
    ) {
      return fail(400, {
        success: false,
        action: "saveHelpPublicAi",
        message: "Revise os limites da IA da Central de Ajuda. O limite por IP deve ser igual ou maior que o limite por sessão.",
      });
    }

    await updateHelpPublicAiSettings(session.user.id, {
      enabled,
      anonymousAccessEnabled,
      rateLimitWindowMinutes,
      sessionRequestLimit,
      ipRequestLimit,
      globalRequestLimitPerHour,
    });

    return {
      success: true,
      action: "saveHelpPublicAi",
      message: "Proteções da IA da Central de Ajuda atualizadas.",
    };
  },

  testStorage: async ({ cookies }) => {
    await requireAppPermission(cookies, "system.settings.manage", "/app/settings");
    const ok = await testAssetStorageConnection();
    return ok
      ? {
          success: true,
          action: "testStorage",
          message: "MinIO/S3 respondeu ao teste de escrita e remoção.",
        }
      : fail(503, {
          success: false,
          action: "testStorage",
          message: "Não foi possível gravar no MinIO/S3. Revise endpoint, bucket e credenciais.",
        });
  },

  testRemote: async ({ cookies }) => {
    await requireAppPermission(cookies, "system.settings.manage", "/app/settings");
    const ok = await testRemoteSupportProvider();
    return ok
      ? {
          success: true,
          action: "testRemote",
          message: "A interface pública do MeshCentral está acessível pelo servidor F10.",
        }
      : fail(503, {
          success: false,
          action: "testRemote",
          message: "Não foi possível acessar a interface pública do MeshCentral.",
        });
  },

  testRemoteControl: async ({ cookies }) => {
    await requireAppPermission(cookies, "system.settings.manage", "/app/settings");
    try {
      const groups = await listMeshCentralDeviceGroups();
      return {
        success: true,
        action: "testRemoteControl",
        message: `Integração automática respondeu corretamente (${groups.length} grupo(s) visível(is)).`,
      };
    } catch {
      return fail(503, {
        success: false,
        action: "testRemoteControl",
        message: "Não foi possível autenticar o Operations no controle do MeshCentral.",
      });
    }
  },
};
