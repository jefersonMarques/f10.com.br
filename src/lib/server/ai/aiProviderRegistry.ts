import { env } from "$env/dynamic/private";
import {
  defaultAiModel,
  markAiProviderTest,
  readAiProviderCredential,
} from "$lib/server/ai/aiConfigurationRepository";
import {
  AI_PROVIDER_DEFINITIONS,
  type AiProviderCode,
} from "$lib/server/ai/aiTypes";

type JsonSchema = Record<string, unknown>;

type ResponsesPayload = {
  id?: string;
  model?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    code?: string;
    message?: string;
  } | null;
};

export type AiProviderStructuredResponse<T> = {
  data: T;
  provider: AiProviderCode;
  responseId: string | null;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export class AiProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly provider: AiProviderCode,
    public readonly status: number | null = null,
  ) {
    super(code);
    this.name = "AiProviderError";
  }
}

function parseTimeoutMs(provider: AiProviderCode): number {
  const providerValue =
    provider === "openai" ? env.OPENAI_TIMEOUT_MS : env.DEEPSEEK_TIMEOUT_MS;
  const parsed = Number.parseInt(
    env.AI_TIMEOUT_MS?.trim() || providerValue?.trim() || "25000",
    10,
  );
  if (!Number.isFinite(parsed)) return 25_000;
  return Math.min(Math.max(parsed, 5_000), 90_000);
}

function extractOutputText(payload: ResponsesPayload): string {
  const parts: string[] = [];
  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

export async function createProviderStructuredResponse<T>(input: {
  provider: AiProviderCode;
  model: string;
  instructions: string;
  userInput: string;
  schemaName: string;
  schema: JsonSchema;
  maxOutputTokens?: number;
}): Promise<AiProviderStructuredResponse<T>> {
  const { apiKey } = await readAiProviderCredential(input.provider).catch((cause) => {
    if (cause instanceof Error && cause.message === "AI_PROVIDER_NOT_CONFIGURED") {
      throw new AiProviderError("AI_PROVIDER_NOT_CONFIGURED", input.provider);
    }
    throw new AiProviderError("AI_CREDENTIAL_UNAVAILABLE", input.provider);
  });
  const definition = AI_PROVIDER_DEFINITIONS[input.provider];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), parseTimeoutMs(input.provider));
  const format = input.provider === "openai"
    ? {
        type: "json_schema",
        name: input.schemaName,
        strict: true,
        schema: input.schema,
      }
    : {
        type: "json_schema",
        name: input.schemaName,
        schema: input.schema,
      };

  try {
    const response = await fetch(definition.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: input.model,
        ...(input.provider === "openai" ? { store: false } : {}),
        instructions: input.instructions,
        input: input.userInput,
        max_output_tokens: Math.min(
          Math.max(input.maxOutputTokens ?? 900, 100),
          10_000,
        ),
        text: { format },
      }),
    });

    let payload: ResponsesPayload = {};
    try {
      payload = await response.json() as ResponsesPayload;
    } catch {
      throw new AiProviderError("AI_INVALID_RESPONSE", input.provider, response.status);
    }

    if (!response.ok) {
      throw new AiProviderError(
        payload.error?.code
          ? `AI_PROVIDER_${payload.error.code.toUpperCase().replace(/[^A-Z0-9_]/g, "_")}`
          : `AI_HTTP_${response.status}`,
        input.provider,
        response.status,
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      throw new AiProviderError("AI_EMPTY_RESPONSE", input.provider, response.status);
    }

    let data: T;
    try {
      data = JSON.parse(outputText) as T;
    } catch {
      throw new AiProviderError("AI_INVALID_JSON", input.provider, response.status);
    }

    return {
      data,
      provider: input.provider,
      responseId: payload.id ?? null,
      model: payload.model ?? input.model,
      inputTokens: payload.usage?.input_tokens ?? null,
      outputTokens: payload.usage?.output_tokens ?? null,
    };
  } catch (cause) {
    if (cause instanceof AiProviderError) throw cause;
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new AiProviderError("AI_TIMEOUT", input.provider);
    }
    throw new AiProviderError("AI_REQUEST_FAILED", input.provider);
  } finally {
    clearTimeout(timeout);
  }
}

export async function testAiProviderConnection(
  actorUserId: string,
  provider: AiProviderCode,
  modelValue?: string,
): Promise<{ ok: boolean; model: string }> {
  const model = modelValue?.trim() || defaultAiModel(provider);
  try {
    await createProviderStructuredResponse<{ ok: boolean }>({
      provider,
      model,
      instructions: "Return a JSON object with ok=true. Do not add other fields.",
      userInput: "Connection test.",
      schemaName: "f10_ai_connection_test",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: { ok: { type: "boolean" } },
        required: ["ok"],
      },
      maxOutputTokens: 100,
    });
    await markAiProviderTest(actorUserId, provider, true);
    return { ok: true, model };
  } catch {
    await markAiProviderTest(actorUserId, provider, false).catch(() => undefined);
    return { ok: false, model };
  }
}
