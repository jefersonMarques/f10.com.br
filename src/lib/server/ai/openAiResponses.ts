import { env } from "$env/dynamic/private";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5-mini";
const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_TIMEOUT_MS = 60_000;

type JsonSchema = Record<string, unknown>;

type OpenAiResponsePayload = {
  id?: string;
  model?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
      refusal?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    code?: string;
  };
};

export type OpenAiStructuredResponse<T> = {
  data: T;
  responseId: string | null;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export class OpenAiResponseError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number | null = null,
  ) {
    super(code);
    this.name = "OpenAiResponseError";
  }
}

function parseTimeoutMs(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? String(DEFAULT_TIMEOUT_MS), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  return Math.min(Math.max(parsed, 5_000), MAX_TIMEOUT_MS);
}

function extractOutputText(payload: OpenAiResponsePayload): string {
  const textParts: string[] = [];

  for (const item of payload.output ?? []) {
    if (item.type !== "message") continue;

    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n").trim();
}

export function isOpenAiConfigured(): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export function getOpenAiModel(): string {
  return env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

export async function createOpenAiStructuredResponse<T>(input: {
  instructions: string;
  userInput: string;
  schemaName: string;
  schema: JsonSchema;
  maxOutputTokens?: number;
}): Promise<OpenAiStructuredResponse<T>> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new OpenAiResponseError("OPENAI_NOT_CONFIGURED");

  const model = getOpenAiModel();
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    parseTimeoutMs(env.OPENAI_TIMEOUT_MS),
  );

  try {
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        store: false,
        instructions: input.instructions,
        input: input.userInput,
        max_output_tokens: Math.min(
          Math.max(input.maxOutputTokens ?? 900, 100),
          2_000,
        ),
        text: {
          format: {
            type: "json_schema",
            name: input.schemaName,
            strict: true,
            schema: input.schema,
          },
        },
      }),
    });

    let payload: OpenAiResponsePayload = {};

    try {
      payload = (await response.json()) as OpenAiResponsePayload;
    } catch {
      throw new OpenAiResponseError("OPENAI_INVALID_RESPONSE", response.status);
    }

    if (!response.ok) {
      throw new OpenAiResponseError(
        payload.error?.code || `OPENAI_HTTP_${response.status}`,
        response.status,
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      throw new OpenAiResponseError("OPENAI_EMPTY_RESPONSE", response.status);
    }

    let parsed: T;

    try {
      parsed = JSON.parse(outputText) as T;
    } catch {
      throw new OpenAiResponseError("OPENAI_INVALID_JSON", response.status);
    }

    return {
      data: parsed,
      responseId: payload.id ?? null,
      model: payload.model ?? model,
      inputTokens: payload.usage?.input_tokens ?? null,
      outputTokens: payload.usage?.output_tokens ?? null,
    };
  } catch (cause) {
    if (cause instanceof OpenAiResponseError) throw cause;
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new OpenAiResponseError("OPENAI_TIMEOUT");
    }
    throw new OpenAiResponseError("OPENAI_REQUEST_FAILED");
  } finally {
    clearTimeout(timeout);
  }
}
