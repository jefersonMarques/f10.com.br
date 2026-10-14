import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { requireAppPermission } from "$lib/server/auth/authorization";
import {
  getAiProviderStatuses,
  getAiRuntimePolicy,
  getAiTaskProfiles,
  isAiTaskConfigured,
  removeAiProviderCredential,
  saveAiProviderCredential,
  updateAiRuntimePolicy,
  updateAiTaskProfile,
} from "$lib/server/ai/aiConfigurationRepository";
import { isAiSecretsKeyConfigured } from "$lib/server/ai/aiSecretCrypto";
import { testAiProviderConnection, type AiProviderConnectionTest } from "$lib/server/ai/aiProviderRegistry";
import {
  AI_CAPABILITY_LABELS,
  AI_TASK_DEFINITIONS,
  isAiProviderCode,
  isAiTaskCode,
  type AiCapability,
} from "$lib/server/ai/aiTypes";
import { isHelpPublicAiSecretConfigured } from "$lib/server/help/helpPublicAiProtection";
import {
  getHelpPublicAiSettings,
  updateHelpPublicAiSettings,
} from "$lib/server/settings/operationsSettingsRepository";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readInteger(formData: FormData, key: string, fallback: number): number {
  const value = Number.parseInt(readString(formData, key), 10);
  return Number.isFinite(value) ? value : fallback;
}

function connectionTestFailure(result: AiProviderConnectionTest): string {
  const code = result.errorCode ?? "";
  const status = result.status;

  if (code === "AI_PROVIDER_INSUFFICIENT_QUOTA") {
    return "A OpenAI recusou a chamada por saldo insuficiente ou limite de cobrança. Confira os créditos da API.";
  }
  if (code === "AI_PROVIDER_INVALID_API_KEY" || status === 401) {
    return "A OpenAI rejeitou a chave de API (401). Confira a chave salva no painel.";
  }
  if (code === "AI_PROVIDER_MODEL_NOT_FOUND" || status === 404) {
    return `O modelo ${result.model} não foi encontrado ou não está disponível para esta chave.`;
  }
  if (status === 403) {
    return "A chave não tem permissão para acessar o modelo ou projeto selecionado (403).";
  }
  if (status === 429 || code.includes("RATE_LIMIT")) {
    return "A OpenAI bloqueou a chamada por limite de uso (429). Verifique as cotas, o saldo e tente novamente.";
  }
  if (code === "AI_TIMEOUT") {
    return "A OpenAI demorou mais que 45 segundos para responder ao teste. Tente novamente.";
  }
  if (code === "AI_OUTPUT_INCOMPLETE" || code === "AI_EMPTY_RESPONSE" || code === "AI_INVALID_JSON" || code === "AI_TEST_INVALID_RESULT") {
    return `A OpenAI respondeu, mas o F10 não conseguiu validar o resultado do modelo ${result.model}. Tente novamente ou escolha outro modelo.`;
  }
  if (code === "AI_CREDENTIAL_UNAVAILABLE" || code === "AI_PROVIDER_NOT_CONFIGURED") {
    return "O F10 não conseguiu acessar a chave salva. Confira a configuração da credencial no painel ou servidor.";
  }
  if (status === 400) {
    return `A OpenAI recusou a configuração enviada para o modelo ${result.model} (400). Confira o modelo selecionado.`;
  }
  return `O teste de conexão falhou${status ? ` (HTTP ${status})` : ""}. Consulte os registros do servidor para identificar a causa.`;
}

export const load: PageServerLoad = async ({ cookies }) => {
  await requireAppPermission(cookies, "system.settings.manage", "/app/settings/ai");
  const [providers, profiles, runtimePolicy, helpPublicAi, publicTaskReady] = await Promise.all([
    getAiProviderStatuses(),
    getAiTaskProfiles(),
    getAiRuntimePolicy(),
    getHelpPublicAiSettings(),
    isAiTaskConfigured("help_public_answer", [
      "knowledge.search",
      "knowledge.read",
      "public.reply",
    ]),
  ]);

  return {
    providers,
    profiles,
    runtimePolicy,
    helpPublicAi,
    publicTaskReady,
    publicHelpSecretConfigured: isHelpPublicAiSecretConfigured(),
    secretStorageConfigured: isAiSecretsKeyConfigured(),
    taskDefinitions: Object.values(AI_TASK_DEFINITIONS),
    capabilityLabels: AI_CAPABILITY_LABELS,
  };
};

export const actions: Actions = {
  saveCredential: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/ai",
    );
    const formData = await request.formData();
    const provider = readString(formData, "provider");
    const apiKey = readString(formData, "apiKey");

    if (!isAiProviderCode(provider) || apiKey.length < 8) {
      return fail(400, {
        success: false,
        action: "saveCredential",
        message: "Informe um provedor válido e uma chave de API.",
      });
    }

    try {
      await saveAiProviderCredential(session.user.id, provider, apiKey);
      return {
        success: true,
        action: "saveCredential",
        message: "Credencial " + (provider === "openai" ? "OpenAI" : "DeepSeek") + " salva com criptografia.",
      };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      return fail(400, {
        success: false,
        action: "saveCredential",
        message: code === "AI_SECRETS_KEY_NOT_CONFIGURED"
          ? "Defina AI_SECRETS_KEY no ambiente do servidor antes de salvar credenciais pelo painel."
          : "Não foi possível salvar a credencial do provedor.",
      });
    }
  },

  removeCredential: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/ai",
    );
    const provider = readString(await request.formData(), "provider");
    if (!isAiProviderCode(provider)) {
      return fail(400, {
        success: false,
        action: "removeCredential",
        message: "Provedor inválido.",
      });
    }

    await removeAiProviderCredential(session.user.id, provider);
    return {
      success: true,
      action: "removeCredential",
      message: "Credencial armazenada no banco removida. Uma credencial de ambiente, se existir, continua disponível como fallback.",
    };
  },

  testProvider: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/ai",
    );
    const formData = await request.formData();
    const provider = readString(formData, "provider");
    const model = readString(formData, "model");
    if (!isAiProviderCode(provider)) {
      return fail(400, {
        success: false,
        action: "testProvider",
        message: "Provedor inválido.",
      });
    }

    const result = await testAiProviderConnection(
      session.user.id,
      provider,
      model || undefined,
    );
    return result.ok
      ? {
          success: true,
          action: "testProvider",
          message: "Conexão com " +
            (provider === "openai" ? "OpenAI" : "DeepSeek") +
            " validada usando " +
            result.model +
            ".",
        }
      : fail(503, {
          success: false,
          action: "testProvider",
          message: connectionTestFailure(result),
        });
  },

  saveTask: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/ai",
    );
    const formData = await request.formData();
    const task = readString(formData, "task");
    const provider = readString(formData, "provider");
    const fallbackProviderValue = readString(formData, "fallbackProvider");
    const model = readString(formData, "model");
    const fallbackModel = readString(formData, "fallbackModel");

    if (
      !isAiTaskCode(task) ||
      !isAiProviderCode(provider) ||
      (fallbackProviderValue && !isAiProviderCode(fallbackProviderValue)) ||
      model.length < 2 ||
      model.length > 160 ||
      fallbackModel.length > 160
    ) {
      return fail(400, {
        success: false,
        action: "saveTask",
        message: "Revise provedor e modelo da função de IA.",
      });
    }

    const capabilities = formData
      .getAll("capability")
      .filter((value): value is AiCapability => typeof value === "string") as AiCapability[];

    try {
      await updateAiTaskProfile(session.user.id, {
        task,
        enabled: formData.has("enabled"),
        provider,
        model,
        fallbackProvider:
          fallbackProviderValue && isAiProviderCode(fallbackProviderValue)
            ? fallbackProviderValue
            : null,
        fallbackModel,
        capabilities,
      });
      return {
        success: true,
        action: "saveTask",
        message: "Função “" + AI_TASK_DEFINITIONS[task].label + "” atualizada.",
      };
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      return fail(400, {
        success: false,
        action: "saveTask",
        message: code === "AI_TASK_NOT_WIRED"
          ? "Esta função está preparada no painel, mas ainda não foi conectada ao fluxo do produto e não pode ser ativada."
          : code === "AI_TASK_CAPABILITY_REQUIRED"
            ? "Uma função ativa precisa ter pelo menos uma capacidade permitida."
            : "Não foi possível salvar esta função de IA.",
      });
    }
  },

  savePolicy: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/ai",
    );
    const formData = await request.formData();

    await updateAiRuntimePolicy(session.user.id, {
      maxRunsPerConversation: readInteger(formData, "maxRunsPerConversation", 6),
      dailyTokenBudget: readInteger(formData, "dailyTokenBudget", 100_000),
      maxOutputTokens: readInteger(formData, "maxOutputTokens", 500),
    });

    return {
      success: true,
      action: "savePolicy",
      message: "Limites operacionais de IA atualizados.",
    };
  },

  saveHelpPublicAi: async ({ cookies, request }) => {
    const { session } = await requireAppPermission(
      cookies,
      "system.settings.manage",
      "/app/settings/ai",
    );
    const formData = await request.formData();
    const enabled = formData.has("enabled");
    const anonymousAccessEnabled = formData.has("anonymousAccessEnabled");
    const rateLimitWindowMinutes = readInteger(formData, "rateLimitWindowMinutes", 10);
    const sessionRequestLimit = readInteger(formData, "sessionRequestLimit", 10);
    const ipRequestLimit = readInteger(formData, "ipRequestLimit", 30);
    const globalRequestLimitPerHour = readInteger(
      formData,
      "globalRequestLimitPerHour",
      1_000,
    );

    if (
      rateLimitWindowMinutes < 1 ||
      rateLimitWindowMinutes > 60 ||
      sessionRequestLimit < 1 ||
      sessionRequestLimit > 100 ||
      ipRequestLimit < 1 ||
      ipRequestLimit > 500 ||
      ipRequestLimit < sessionRequestLimit ||
      globalRequestLimitPerHour < 10 ||
      globalRequestLimitPerHour > 50_000
    ) {
      return fail(400, {
        success: false,
        action: "saveHelpPublicAi",
        message: "Revise os limites da IA pública. O limite por IP deve ser igual ou maior que o limite por sessão.",
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
      message: "Política da IA da Central de Ajuda atualizada.",
    };
  },
};
