import { json, type RequestHandler } from "@sveltejs/kit";
import { isOpenAiConfigured, OpenAiResponseError } from "$lib/server/ai/openAiResponses";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { answerPublicHelpQuestion } from "$lib/server/help/helpPublicAi";
import {
  claimHelpPublicAiRequest,
  createHelpPublicAiIpKey,
  finishHelpPublicAiRequest,
  getOrCreateHelpPublicAiSessionKey,
  isHelpPublicAiSecretConfigured,
} from "$lib/server/help/helpPublicAiProtection";
import { getHelpPublicAiSettings } from "$lib/server/settings/operationsSettingsRepository";

const MAX_BODY_BYTES = 4 * 1024;

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function errorResponse(error: string, status: number, retryAfter?: number) {
  return json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
      },
    },
  );
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress, url }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return errorResponse("INVALID_ORIGIN", 403);
  if (isBodyTooLarge(request)) return errorResponse("PAYLOAD_TOO_LARGE", 413);

  const settings = await getHelpPublicAiSettings();
  if (!settings.enabled || !isOpenAiConfigured() || !isHelpPublicAiSecretConfigured()) {
    return errorResponse("AI_UNAVAILABLE", 503);
  }

  if (!settings.anonymousAccessEnabled) {
    const customer = await getOptionalCustomerF10PortalSession(cookies);
    if (!customer || customer.selectedUnitId === null) {
      return errorResponse("AUTH_REQUIRED", 401);
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return errorResponse("INVALID_JSON", 400);
  }

  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  if (question.length < 3 || question.length > 600) {
    return errorResponse("INVALID_QUESTION", 400);
  }

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  let requestId: string | null = null;
  try {
    const sessionKey = getOrCreateHelpPublicAiSessionKey(cookies);
    const ipKey = createHelpPublicAiIpKey(clientAddress);
    requestId = await claimHelpPublicAiRequest(sessionKey, ipKey, settings);

    const result = await answerPublicHelpQuestion(question);
    await finishHelpPublicAiRequest(requestId, {
      status: result.resolved ? "answered" : "not_found",
      model: result.model ?? "",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    return json(
      {
        resolved: result.resolved,
        answer: result.answer,
        target: result.target,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "HELP_PUBLIC_AI_FAILED";

    if (requestId) {
      const failureCode = cause instanceof OpenAiResponseError ? cause.code : code;
      await finishHelpPublicAiRequest(requestId, {
        status: "failed",
        failureCode,
      }).catch(() => undefined);
    }

    if (code === "HELP_PUBLIC_AI_BUSY") {
      return errorResponse("REQUEST_IN_PROGRESS", 429, 5);
    }
    if (
      code === "HELP_PUBLIC_AI_SESSION_RATE_LIMITED" ||
      code === "HELP_PUBLIC_AI_IP_RATE_LIMITED" ||
      code === "HELP_PUBLIC_AI_GLOBAL_RATE_LIMITED"
    ) {
      return errorResponse("RATE_LIMITED", 429, settings.rateLimitWindowMinutes * 60);
    }
    if (code === "HELP_PUBLIC_AI_QUESTION_INVALID") {
      return errorResponse("INVALID_QUESTION", 400);
    }
    if (code === "HELP_PUBLIC_AI_SECRET_NOT_CONFIGURED") {
      return errorResponse("AI_UNAVAILABLE", 503);
    }

    console.error("[help.public-ai]", {
      causeType: cause instanceof Error ? cause.name : typeof cause,
      code: cause instanceof OpenAiResponseError ? cause.code : "UNEXPECTED_FAILURE",
    });
    return errorResponse("AI_UNAVAILABLE", 503);
  }
};
