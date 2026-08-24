import { json, type RequestHandler } from "@sveltejs/kit";
import { isOpenAiConfigured, OpenAiResponseError } from "$lib/server/ai/openAiResponses";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import {
  answerHelpQuestion,
  type HelpKnowledgeScope,
} from "$lib/server/help/helpKnowledgeEngine";
import { recordHelpKnowledgeRun } from "$lib/server/help/helpKnowledgeTelemetryRepository";
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

function parseScope(payload: Record<string, unknown>): HelpKnowledgeScope | null {
  const scope = payload.scope === "article" ? "article" : "global";
  if (scope === "article") {
    const articleSlug = typeof payload.articleSlug === "string" ? payload.articleSlug.trim() : "";
    if (!articleSlug || articleSlug.length > 160) return null;
    return { type: "article", slug: articleSlug };
  }

  const categoryId = typeof payload.categoryId === "string" ? payload.categoryId.trim() : "";
  if (categoryId && !isUuid(categoryId)) return null;
  return { type: "global", categoryId: categoryId || null };
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
  const scope = parseScope(payload);
  if (question.length < 3 || question.length > 600 || !scope) {
    return errorResponse("INVALID_QUESTION", 400);
  }

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  let requestId: string | null = null;
  let knowledgeStartedAt: number | null = null;
  try {
    const sessionKey = getOrCreateHelpPublicAiSessionKey(cookies);
    const ipKey = createHelpPublicAiIpKey(clientAddress);
    requestId = await claimHelpPublicAiRequest(sessionKey, ipKey, settings);

    knowledgeStartedAt = Date.now();
    const result = await answerHelpQuestion({
      question,
      scope,
      source: "public",
    });
    const latencyMs = Date.now() - knowledgeStartedAt;

    await finishHelpPublicAiRequest(requestId, {
      status:
        result.resolution === "answered" || result.resolution === "navigate"
          ? "answered"
          : "not_found",
      model: result.model ?? "",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    await recordHelpKnowledgeRun({
      source: "public",
      scope: scope.type,
      searchEventId: result.searchEventId,
      question,
      contextSlug: scope.type === "article" ? scope.slug : "",
      resolution: result.resolution,
      target: result.target
        ? {
            contentId: result.target.contentId,
            slug: result.target.slug,
            targetType: result.target.targetType,
          }
        : null,
      sources: result.sources,
      model: result.model,
      providerResponseId: result.providerResponseId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs,
    }).catch(() => undefined);

    return json(
      {
        resolution: result.resolution,
        resolved: result.resolved,
        answer: result.answer,
        target: result.target,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "HELP_PUBLIC_AI_FAILED";
    const failureCode = cause instanceof OpenAiResponseError ? cause.code : code;

    if (knowledgeStartedAt !== null) {
      await recordHelpKnowledgeRun({
        source: "public",
        scope: scope.type,
        question,
        contextSlug: scope.type === "article" ? scope.slug : "",
        resolution: "failed",
        latencyMs: Date.now() - knowledgeStartedAt,
        failureCode,
      }).catch(() => undefined);
    }

    if (requestId) {
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
    if (code === "HELP_KNOWLEDGE_QUESTION_INVALID") {
      return errorResponse("INVALID_QUESTION", 400);
    }
    if (code === "HELP_ARTICLE_NOT_FOUND") {
      return errorResponse("ARTICLE_NOT_FOUND", 404);
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
