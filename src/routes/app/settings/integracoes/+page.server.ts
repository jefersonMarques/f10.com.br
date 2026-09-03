import { env } from "$env/dynamic/private";
import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getMeshCentralControlStatus,
  listMeshCentralDeviceGroups,
} from "$lib/server/remote/meshCentralControl";
import {
  getRemoteProviderStatus,
  testRemoteSupportProvider,
} from "$lib/server/remote/remoteSupportProvider";
import { isServiceRequestSecretKeyConfigured } from "$lib/server/serviceRequests/serviceRequestCrypto";
import {
  getServiceRequestStorageStatus,
  testServiceRequestStorageConnection,
} from "$lib/server/serviceRequests/serviceRequestStorage";
import {
  getAssetStorageStatus,
  testAssetStorageConnection,
} from "$lib/server/storage/assetStorage";

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(
    cookies,
    "system.settings.manage",
    "/app/settings/integracoes",
  );

  return {
    storage: getAssetStorageStatus(),
    serviceRequestStorage: getServiceRequestStorageStatus(),
    serviceRequestSecretConfigured: isServiceRequestSecretKeyConfigured(),
    email: {
      configured: Boolean(
        env.BREVO_API_KEY?.trim() &&
        env.BREVO_SENDER_EMAIL?.trim(),
      ),
      senderEmail: env.BREVO_SENDER_EMAIL?.trim() ?? "",
      senderName: env.BREVO_SENDER_NAME?.trim() ?? "",
    },
    google: {
      configured: Boolean(
        env.GOOGLE_CALENDAR_CLIENT_ID?.trim() &&
        env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() &&
        env.GOOGLE_CALENDAR_REDIRECT_URI?.trim(),
      ),
      redirectUri: env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() ?? "",
    },
    f10: {
      backendUrl: env.F10_BACKEND_URL?.trim() ?? "",
      customerTokenConfigured:
        (env.F10_CUSTOMER_TOKEN_KEY?.trim().length ?? 0) >= 32,
    },
    remote: getRemoteProviderStatus(),
    remoteControl: getMeshCentralControlStatus(),
  };
};

export const actions: Actions = {
  testStorage: async ({ cookies }) => {
    await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/integracoes",
    );
    const ok = await testAssetStorageConnection();
    return ok
      ? {
          success: true,
          action: "testStorage",
          message: "Bucket da Central de Ajuda respondeu ao teste de escrita e remoção.",
        }
      : fail(503, {
          success: false,
          action: "testStorage",
          message: "Não foi possível gravar no bucket da Central de Ajuda.",
        });
  },

  testServiceRequestStorage: async ({ cookies }) => {
    await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/integracoes",
    );
    const ok = await testServiceRequestStorageConnection();
    return ok
      ? {
          success: true,
          action: "testServiceRequestStorage",
          message: "Bucket privado de solicitações respondeu ao teste de escrita e remoção.",
        }
      : fail(503, {
          success: false,
          action: "testServiceRequestStorage",
          message: "Não foi possível gravar no bucket privado de solicitações. Revise bucket e permissões.",
        });
  },

  testRemote: async ({ cookies }) => {
    await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/integracoes",
    );
    const ok = await testRemoteSupportProvider();
    return ok
      ? {
          success: true,
          action: "testRemote",
          message: "A interface pública do MeshCentral está acessível.",
        }
      : fail(503, {
          success: false,
          action: "testRemote",
          message: "Não foi possível acessar a interface pública do MeshCentral.",
        });
  },

  testRemoteControl: async ({ cookies }) => {
    await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/integracoes",
    );
    try {
      const groups = await listMeshCentralDeviceGroups();
      return {
        success: true,
        action: "testRemoteControl",
        message: "Integração automática respondeu corretamente (" +
          groups.length +
          " grupo(s) visível(is)).",
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
