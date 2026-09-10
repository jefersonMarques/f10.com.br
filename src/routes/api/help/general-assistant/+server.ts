import { json, type RequestHandler } from "@sveltejs/kit";
import { isAiTaskConfigured } from "$lib/server/ai/aiConfigurationRepository";
import { runGeneralHelpAssistant } from "$lib/server/help/helpGeneralAssistant";
import { consumeSupportPublicRateLimit } from "$lib/server/support/supportPublicRateLimit";

const MAX_BODY_BYTES = 24 * 1024;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_UNRESOLVED_COUNT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1_000;
const RATE_BLOCK_MS = 30 * 60 * 1_000;

function readMessage(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_MESSAGE_CHARS) : "";
}

function readUnresolvedCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), MAX_UNRESOLVED_COUNT);
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const message = readMessage(body.message);
  if (!message) return json({ error: "INVALID_MESSAGE" }, { status: 400 });

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  const allowed = await consumeSupportPublicRateLimit("help-general-assistant", clientAddress, {
    maxRequests: 12,
    windowMs: RATE_WINDOW_MS,
    blockMs: RATE_BLOCK_MS,
  });
  if (!allowed) return json({ error: "RATE_LIMITED" }, { status: 429 });

  const aiAvailable = await isAiTaskConfigured("help_public_answer", [
    "knowledge.search",
    "knowledge.read",
    "public.reply",
  ]).catch(() => false);
  if (!aiAvailable) {
    return json({ error: "ASSISTANT_UNAVAILABLE" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const result = await runGeneralHelpAssistant({ question: message });
    const unresolvedCount = readUnresolvedCount(body.unresolvedCount);
    const nextUnresolvedCount = result.action === "answer"
      ? 0
      : result.action === "clarify"
        ? Math.min(unresolvedCount + 1, MAX_UNRESOLVED_COUNT)
        : unresolvedCount;

    return json({
      answer: result.answer,
      action: result.action,
      articleUrl: result.articleUrl,
      requiresHuman: result.action === "handoff",
      offerTicket: result.action === "ticket_offer",
      ticketUrl: result.action === "ticket_offer" ? "/cliente/chamados/novo" : undefined,
      unresolvedCount: nextUnresolvedCount,
      handoffReason: result.action === "handoff"
        ? "O cliente pediu atendimento humano no Assistente F10."
        : undefined,
      searchEventId: result.searchEventId,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("[f10.assistant.helpdesk]", {
      causeType: cause instanceof Error ? cause.name : typeof cause,
      code: cause instanceof Error ? cause.message.slice(0, 120) : "UNKNOWN",
    });
    return json({ error: "ASSISTANT_UNAVAILABLE" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
};
