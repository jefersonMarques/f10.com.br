import { json, type RequestHandler } from "@sveltejs/kit";
import { AiGatewayError } from "$lib/server/ai/aiGateway";
import { isAiTaskConfigured } from "$lib/server/ai/aiConfigurationRepository";
import { getDatabase } from "$lib/server/db";
import {
  helpTrainingEvents,
  helpTrainingPublicEvents,
} from "$lib/server/db/helpTrainingSchema";
import { tryAnswerHelpArticleDeterministically } from "$lib/server/help/helpArticleDeterministicAnswer";
import { answerHelpQuestion } from "$lib/server/help/helpKnowledgeEngine";
import { recordHelpKnowledgeRun } from "$lib/server/help/helpKnowledgeTelemetryRepository";
import {
  claimHelpPublicAiRequest,
  createHelpPublicAiIpKey,
  finishHelpPublicAiRequest,
  getOrCreateHelpPublicAiSessionKey,
  isHelpPublicAiSecretConfigured,
} from "$lib/server/help/helpPublicAiProtection";
import { getPublicHelpTrainingSession } from "$lib/server/help/helpTrainingPublicRepository";
import { getHelpTrainingSession } from "$lib/server/help/helpTrainingRepository";
import {
  getHelpTrainingPublicSessionCookie,
  getHelpTrainingSessionCookie,
} from "$lib/server/help/helpTrainingSession";
import { getHelpPublicAiSettings } from "$lib/server/settings/operationsSettingsRepository";

const MAX_BODY_BYTES = 12 * 1024;
const MAX_CONVERSATION_CONTEXT_CHARS = 6_000;
const MAX_OUTPUT_TOKENS = 1_000;

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

async function resolveTrainingContext(cookies: Parameters<RequestHandler>[0]["cookies"]) {
  const inviteToken = getHelpTrainingSessionCookie(cookies);
  if (inviteToken) {
    const state = await getHelpTrainingSession(inviteToken);
    if (state) {
      return {
        kind: "invite" as const,
        sessionId: state.session.id,
        stepId: state.currentStep?.id ?? null,
        articleSlug: state.snapshot.sourceContent.slug,
      };
    }
  }

  const publicToken = getHelpTrainingPublicSessionCookie(cookies);
  if (publicToken) {
    const state = await getPublicHelpTrainingSession(publicToken);
    if (state) {
      return {
        kind: "public" as const,
        sessionId: state.session.id,
        stepId: state.currentStep?.id ?? null,
        articleSlug: state.snapshot.sourceContent.slug,
      };
    }
  }

  return null;
}

async function recordTutorEvent(
  context: NonNullable<Awaited<ReturnType<typeof resolveTrainingContext>>>,
  metadata: Record<string, unknown>,
): Promise<void> {
  const values = {
    sessionId: context.sessionId,
    stepKey: context.stepId,
    eventType: "tutor_question",
    metadata,
  };
  if (context.kind === "invite") {
    await getDatabase().insert(helpTrainingEvents).values(values);
  } else {
    await getDatabase().insert(helpTrainingPublicEvents).values(values);
  }
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress, url }) => {
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return errorResponse("INVALID_ORIGIN", 403);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse("PAYLOAD_TOO_LARGE", 413);
  }

  const context = await resolveTrainingContext(cookies);
  if (!context) return errorResponse("TRAINING_SESSION_REQUIRED", 401);

  const settings = await getHelpPublicAiSettings();
  if (
    !settings.enabled ||
    !(await isAiTaskConfigured("help_public_answer", [
      "knowledge.search",
      "knowledge.read",
      "public.reply",
    ])) ||
    !isHelpPublicAiSecretConfigured()
  ) {
    return errorResponse("AI_UNAVAILABLE", 503);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return errorResponse("INVALID_JSON", 400);
  }

  const question = typeof payload.question === "string" ? payload.question.trim() : "";
  const conversationContext = typeof payload.conversationContext === "string"
    ? payload.conversationContext.trim()
    : "";
  if (
    question.length < 3 ||
    question.length > 600 ||
    conversationContext.length > MAX_CONVERSATION_CONTEXT_CHARS
  ) {
    return errorResponse("INVALID_QUESTION", 400);
  }

  const deterministic = await tryAnswerHelpArticleDeterministically({
    question,
    slug: context.articleSlug,
  });
  if (deterministic) {
    await Promise.allSettled([
      recordHelpKnowledgeRun({
        source: "public",
        scope: "article",
        question,
        retrievalQuery: deterministic.retrievalQuery,
        contextSlug: context.articleSlug,
        resolution: deterministic.resolution,
        target: deterministic.target
          ? {
              contentId: deterministic.target.contentId,
              slug: deterministic.target.slug,
              targetType: deterministic.target.targetType,
            }
          : null,
        sources: deterministic.sources,
        latencyMs: 0,
      }),
      recordTutorEvent(context, {
        resolution: deterministic.resolution,
        deterministic: true,
      }),
    ]);
    return json(
      {
        resolution: deterministic.resolution,
        answer: deterministic.answer,
        target: deterministic.target,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  let requestId: string | null = null;
  const startedAt = Date.now();
  try {
    let clientAddress = "unknown";
    try {
      clientAddress = getClientAddress();
    } catch {
      clientAddress = "unknown";
    }

    requestId = await claimHelpPublicAiRequest(
      getOrCreateHelpPublicAiSessionKey(cookies),
      createHelpPublicAiIpKey(clientAddress),
      settings,
    );

    const result = await answerHelpQuestion({
      question,
      scope: { type: "article", slug: context.articleSlug },
      source: "public",
      conversationContext,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });

    await finishHelpPublicAiRequest(requestId, {
      status:
        result.resolution === "answered" || result.resolution === "navigate"
          ? "answered"
          : "not_found",
      model: result.model ?? "",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });

    await Promise.allSettled([
      recordHelpKnowledgeRun({
        source: "public",
        scope: "article",
        searchEventId: result.searchEventId,
        question,
        retrievalQuery: result.retrievalQuery,
        contextSlug: context.articleSlug,
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
        latencyMs: Date.now() - startedAt,
      }),
      recordTutorEvent(context, {
        resolution: result.resolution,
        deterministic: false,
      }),
    ]);

    return json(
      {
        resolution: result.resolution,
        answer: result.answer,
        target: result.target,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "TRAINING_TUTOR_FAILED";
    if (requestId) {
      await finishHelpPublicAiRequest(requestId, {
        status: "failed",
        failureCode: cause instanceof AiGatewayError ? cause.code : code,
      }).catch(() => undefined);
    }
    await recordTutorEvent(context, {
      resolution: "failed",
      code: cause instanceof AiGatewayError ? cause.code : code,
    }).catch(() => undefined);

    if (code === "HELP_PUBLIC_AI_BUSY") return errorResponse("REQUEST_IN_PROGRESS", 429, 5);
    if (
      code === "HELP_PUBLIC_AI_SESSION_RATE_LIMITED" ||
      code === "HELP_PUBLIC_AI_IP_RATE_LIMITED" ||
      code === "HELP_PUBLIC_AI_GLOBAL_RATE_LIMITED"
    ) {
      return errorResponse("RATE_LIMITED", 429, settings.rateLimitWindowMinutes * 60);
    }
    console.error("[help.training.tutor]", {
      code: cause instanceof AiGatewayError ? cause.code : code,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return errorResponse("AI_UNAVAILABLE", 503);
  }
};
