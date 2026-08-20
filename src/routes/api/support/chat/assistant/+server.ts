import { json, type RequestHandler } from "@sveltejs/kit";
import { isSupportAiChatEnabled } from "$lib/server/support/supportAiChat";
import { runSupportAi } from "$lib/server/support/supportAiAgent";
import { consumeSupportPublicRateLimit } from "$lib/server/support/supportPublicRateLimit";

const MAX_BODY_BYTES = 24 * 1024;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_CONTEXT_CHARS = 6_000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_BLOCK_MS = 30 * 60 * 1000;

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function readString(value: unknown, maxChars: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxChars) : "";
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function requestsHumanSupport(message: string): boolean {
  const normalized = normalizeText(message);
  return /(?:quero|preciso|gostaria|posso|pode|chama|chamar|falar|conversar).{0,28}(?:atendente|humano|pessoa)|(?:atendente humano|suporte humano|falar com alguem)/i.test(normalized);
}

function localAssistantReply(message: string): string | null {
  const normalized = normalizeText(message);
  if (/^(?:oi|ola|opa|e ai|bom dia|boa tarde|boa noite|oi tudo bem|ola tudo bem|tudo bem)$/.test(normalized)) {
    return "Olá! Posso tentar resolver sua dúvida agora. Conte o que está acontecendo no F10 ou escolha uma das opções abaixo.";
  }
  if (/^(?:obrigado|obrigada|muito obrigado|muito obrigada|valeu|agradeco)$/.test(normalized)) {
    return "Por nada. Se precisar de mais alguma coisa no F10, pode continuar por aqui.";
  }
  return null;
}

export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  if (isBodyTooLarge(request)) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const message = readString(body.message, MAX_MESSAGE_CHARS);
  const conversationContext = readString(body.conversationContext, MAX_CONTEXT_CHARS);
  if (!message) return json({ error: "INVALID_MESSAGE" }, { status: 400 });

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  try {
    const allowed = await consumeSupportPublicRateLimit("chat-assistant", clientAddress, {
      maxRequests: 12,
      windowMs: RATE_WINDOW_MS,
      blockMs: RATE_BLOCK_MS,
    });
    if (!allowed) return json({ error: "RATE_LIMITED" }, { status: 429 });

    if (requestsHumanSupport(message)) {
      return json({
        answer: "Certo. Para falar com alguém da equipe F10, vou pedir a identificação da sua conta aqui no chat.",
        requiresHuman: true,
        aiAvailable: isSupportAiChatEnabled(),
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const localReply = localAssistantReply(message);
    if (localReply) {
      return json({
        answer: localReply,
        requiresHuman: false,
        aiAvailable: isSupportAiChatEnabled(),
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (!isSupportAiChatEnabled()) {
      return json({
        answer: "Não consegui consultar o assistente agora. Posso encaminhar você para alguém da equipe F10.",
        requiresHuman: true,
        aiAvailable: false,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const result = await runSupportAi({
      question: message,
      conversationContext,
      maxOutputTokens: 500,
    });

    if (result.resolution === "answered") {
      return json({
        answer: result.answer,
        requiresHuman: false,
        aiAvailable: true,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    return json({
      answer: "Não encontrei informação suficiente para responder isso com segurança. Posso chamar alguém da equipe F10 para continuar com você por aqui.",
      requiresHuman: true,
      aiAvailable: true,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("[support.chat.assistant]", {
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return json({
      answer: "Não consegui consultar o assistente agora. Posso encaminhar você para alguém da equipe F10.",
      requiresHuman: true,
      aiAvailable: false,
    }, { status: 200, headers: { "Cache-Control": "no-store" } });
  }
};
