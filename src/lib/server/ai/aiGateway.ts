import {
  getAiTaskProfile,
} from "$lib/server/ai/aiConfigurationRepository";
import {
  AiProviderError,
  createProviderStructuredResponse,
} from "$lib/server/ai/aiProviderRegistry";
import type {
  AiCapability,
  AiProviderCode,
  AiTaskCode,
} from "$lib/server/ai/aiTypes";

type JsonSchema = Record<string, unknown>;

export type AiStructuredResponse<T> = {
  data: T;
  provider: AiProviderCode;
  model: string;
  responseId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  fallbackUsed: boolean;
};

export class AiGatewayError extends Error {
  constructor(
    public readonly code: string,
    public readonly provider: AiProviderCode | null,
    public readonly status: number | null = null,
  ) {
    super(code);
    this.name = "AiGatewayError";
  }
}

function shouldUseFallback(cause: AiProviderError): boolean {
  return (
    cause.code === "AI_PROVIDER_NOT_CONFIGURED" ||
    cause.code === "AI_CREDENTIAL_UNAVAILABLE" ||
    cause.code === "AI_TIMEOUT" ||
    cause.code === "AI_REQUEST_FAILED" ||
    cause.status === 429 ||
    (cause.status !== null && cause.status >= 500)
  );
}

async function attempt<T>(input: {
  provider: AiProviderCode;
  model: string;
  instructions: string;
  userInput: string;
  schemaName: string;
  schema: JsonSchema;
  maxOutputTokens?: number;
  timeoutMs?: number;
}) {
  return createProviderStructuredResponse<T>(input);
}

export async function createAiStructuredResponse<T>(input: {
  task: AiTaskCode;
  instructions: string;
  userInput: string;
  schemaName: string;
  schema: JsonSchema;
  maxOutputTokens?: number;
  timeoutMs?: number;
  requiredCapabilities?: AiCapability[];
}): Promise<AiStructuredResponse<T>> {
  const profile = await getAiTaskProfile(input.task);
  if (!profile.enabled) {
    throw new AiGatewayError("AI_TASK_DISABLED", profile.provider);
  }
  if (
    (input.requiredCapabilities ?? []).some(
      (capability) => !profile.capabilities.includes(capability),
    )
  ) {
    throw new AiGatewayError("AI_CAPABILITY_NOT_ALLOWED", profile.provider);
  }

  try {
    const response = await attempt<T>({
      provider: profile.provider,
      model: profile.model,
      instructions: input.instructions,
      userInput: input.userInput,
      schemaName: input.schemaName,
      schema: input.schema,
      maxOutputTokens: input.maxOutputTokens,
      timeoutMs: input.timeoutMs,
    });
    return { ...response, fallbackUsed: false };
  } catch (cause) {
    if (!(cause instanceof AiProviderError)) {
      throw new AiGatewayError("AI_REQUEST_FAILED", profile.provider);
    }

    if (
      !profile.fallbackProvider ||
      !profile.fallbackModel ||
      !shouldUseFallback(cause)
    ) {
      throw new AiGatewayError(cause.code, cause.provider, cause.status);
    }

    try {
      const response = await attempt<T>({
        provider: profile.fallbackProvider,
        model: profile.fallbackModel,
        instructions: input.instructions,
        userInput: input.userInput,
        schemaName: input.schemaName,
        schema: input.schema,
        maxOutputTokens: input.maxOutputTokens,
        timeoutMs: input.timeoutMs,
      });
      return { ...response, fallbackUsed: true };
    } catch (fallbackCause) {
      if (fallbackCause instanceof AiProviderError) {
        throw new AiGatewayError(
          fallbackCause.code,
          fallbackCause.provider,
          fallbackCause.status,
        );
      }
      throw new AiGatewayError("AI_REQUEST_FAILED", profile.fallbackProvider);
    }
  }
}
