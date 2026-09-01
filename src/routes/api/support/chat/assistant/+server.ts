import { dev } from "$app/environment";
import { json, type RequestHandler } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { isSupportAiChatEnabled } from "$lib/server/support/supportAiChat";
import { runSupportAi } from "$lib/server/support/supportAiAgent";
import { consumeSupportPublicRateLimit } from "$lib/server/support/supportPublicRateLimit";

const MAX_BODY_BYTES = 24 * 1024;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_CONTEXT_CHARS = 6_000;
const MAX_PAGE_CONTEXT_CHARS = 1_200;
const MAX_UNRESOLVED_COUNT = 2;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_BLOCK_MS = 30 * 60 * 1000;
const LAST_HELP_SEARCH_COOKIE = "f10_support_last_help_search";

type AssistantAction = "answer" | "clarify" | "handoff" | "ticket_offer";

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function readString(value: unknown, maxChars: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxChars) : "";
}

function readUnresolvedCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.trunc(value), 0), MAX_UNRESOLVED_COUNT);
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

function requestsTicketCreation(message: string): boolean {
  const normalized = normalizeText(message);
  return /(?:quero|preciso|gostaria|pode|poderia|vamos|vou).{0,28}(?:abrir|criar|registrar).{0,20}(?:chamado|ticket)|(?:abrir|criar|registrar).{0,20}(?:um |o )?(?:chamado|ticket)/i.test(normalized);
}

function requestsHumanSupport(message: string): boolean {
  const normalized = normalizeText(message);
  return /(?:quero|preciso|gostaria|posso|pode|chama|chamar|falar|conversar).{0,28}(?:atendente|humano|pessoa)|(?:atendente humano|suporte humano|falar com alguem)/i.test(normalized);
}

function showsFrustration(message: string): boolean {
  const normalized = normalizeText(message);
  return /(?:nao resolveu|nao resolve|nao funciona|continua igual|ja tentei|tentei de tudo|estou cansad|muito ruim|pessimo|horrivel|irritad|frustrad)/i.test(normalized);
}

function isGenericSupportRequest(message: string): boolean {
  const normalized = normalizeText(message);
  if (normalized.length > 100) return false;
  return /^(?:(?:oi|ola|opa|bom dia|boa tarde|boa noite|tudo bem|oi tudo bem)\s*)?(?:eu\s+)?(?:preciso|quero|gostaria|poderia|pode)?\s*(?:de\s+)?(?:uma\s+)?(?:ajuda|ajuda com o f10|ajuda no f10|suporte|suporte no f10|suporte com o f10)(?:\s+por favor)?$/i.test(normalized);
}

function localAssistantReply(message: string): string | null {
  const normalized = normalizeText(message);
  if (/^(?:oi|ola|opa|e ai|bom dia|boa tarde|boa noite|oi tudo bem|ola tudo bem|tudo bem)$/.test(normalized)) {
    return "Olá! Claro. Me conte o que você está tentando fazer no F10 ou o que não está funcionando.";
  }
  if (/^(?:obrigado|obrigada|muito obrigado|muito obrigada|valeu|agradeco)$/.test(normalized)) {
    return "Por nada. Se precisar de mais alguma coisa no F10, pode continuar por aqui.";
  }
  return null;
}

function buildConversationContext(conversationContext: string, pageContext: string): string {
  if (!pageContext) return conversationContext;
  const pageBlock = `Contexto da página atual:\n${pageContext}`;
  return conversationContext ? `${conversationContext}\n\n${pageBlock}`.slice(0, MAX_CONTEXT_CHARS) : pageBlock;
}

function assistantPayload(input: {
  answer: string;
  action: AssistantAction;
  aiAvailable: boolean;
  unresolvedCount?: number;
  handoffReason?: string;
  searchEventId?: string | null;
  ticketUrl?: string;
}) {
  return {
    answer: input.answer,
    action: input.action,
    requiresHuman: input.action === "handoff",
    canEscalate: input.action === "clarify",
    offerTicket: input.action === "ticket_offer",
    ticketUrl: input.ticketUrl,
    unresolvedCount: input.unresolvedCount ?? 0,
    handoffReason: input.handoffReason,
    aiAvailable: input.aiAvailable,
    searchEventId: input.searchEventId ?? null,
  };
}

export const POST: RequestHandler = async ({ request, getClientAddress, cookies }) => {
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
  const pageContext = readString(body.pageContext, MAX_PAGE_CONTEXT_CHARS);
  const unresolvedCount = readUnresolvedCount(body.unresolvedCount);
  if (!message) return json({ error: "INVALID_MESSAGE" }, { status: 400 });

  // Mensagem enviada pelo cliente é atividade real; polling continua sem renovar a sessão.
  await getOptionalCustomerF10PortalSession(cookies).catch(() => null);

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

    if (requestsTicketCreation(message)) {
      return json(assistantPayload({
        answer: "Entendi. Posso levar você para a abertura de um chamado. Ele só será criado depois que você revisar e confirmar os dados.",
        action: "ticket_offer",
        ticketUrl: "/cliente/chamados/novo",
        aiAvailable: isSupportAiChatEnabled(),
      }), { headers: { "Cache-Control": "no-store" } });
    }

    if (requestsHumanSupport(message)) {
      return json(assistantPayload({
        answer: "Certo. Passei a conversa para um atendente da equipe F10, que continua com você por aqui.",
        action: "handoff",
        handoffReason: "O cliente pediu explicitamente atendimento humano.",
        aiAvailable: isSupportAiChatEnabled(),
      }), { headers: { "Cache-Control": "no-store" } });
    }

    if (showsFrustration(message) && conversationContext) {
      return json(assistantPayload({
        answer: "Entendi. Como as tentativas anteriores não resolveram, passei a conversa para um atendente da equipe F10, que continua com você por aqui.",
        action: "handoff",
        handoffReason: "O cliente demonstrou frustração após tentativas de resolução.",
        aiAvailable: isSupportAiChatEnabled(),
      }), { headers: { "Cache-Control": "no-store" } });
    }

    if (isGenericSupportRequest(message)) {
      return json(assistantPayload({
        answer: "Claro. Me conte o que você está tentando fazer no F10, em qual tela está e o que aconteceu.",
        action: "clarify",
        unresolvedCount: 0,
        aiAvailable: isSupportAiChatEnabled(),
      }), { headers: { "Cache-Control": "no-store" } });
    }

    const localReply = localAssistantReply(message);
    if (localReply) {
      return json(assistantPayload({
        answer: localReply,
        action: "answer",
        aiAvailable: isSupportAiChatEnabled(),
      }), { headers: { "Cache-Control": "no-store" } });
    }

    if (!isSupportAiChatEnabled()) {
      return json(assistantPayload({
        answer: "Não consegui consultar as orientações do F10 agora. Passei a conversa para um atendente da equipe F10, que continua com você por aqui.",
        action: "handoff",
        handoffReason: "O Assistente F10 está temporariamente indisponível.",
        aiAvailable: false,
      }), { headers: { "Cache-Control": "no-store" } });
    }

    const result = await runSupportAi({
      question: message,
      conversationContext: buildConversationContext(conversationContext, pageContext),
      maxOutputTokens: 500,
    });

    if (result.searchEventId) {
      cookies.set(LAST_HELP_SEARCH_COOKIE, result.searchEventId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: !dev,
        maxAge: 30 * 60,
      });
    }

    if (result.resolution === "answered") {
      return json(assistantPayload({
        answer: result.answer,
        action: "answer",
        aiAvailable: true,
        unresolvedCount: 0,
        searchEventId: result.searchEventId,
      }), { headers: { "Cache-Control": "no-store" } });
    }

    if (result.resolution === "failed" || unresolvedCount >= 1) {
      return json(assistantPayload({
        answer: "Não consegui resolver isso com segurança por aqui. Passei a conversa para um atendente da equipe F10, que continua com você por aqui.",
        action: "handoff",
        handoffReason: result.escalationReason || "O Assistente F10 não conseguiu sustentar uma resposta segura após tentativa de esclarecimento.",
        aiAvailable: result.resolution !== "failed",
        unresolvedCount: Math.min(unresolvedCount + 1, MAX_UNRESOLVED_COUNT),
        searchEventId: result.searchEventId,
      }), { headers: { "Cache-Control": "no-store" } });
    }

    return json(assistantPayload({
      answer: "Ainda não encontrei uma orientação segura. Para eu tentar mais uma vez, me diga o que você estava tentando fazer, em qual tela isso aconteceu e qual resultado apareceu para você.",
      action: "clarify",
      aiAvailable: true,
      unresolvedCount: 1,
      searchEventId: result.searchEventId,
    }), { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("[support.chat.assistant]", {
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return json(assistantPayload({
      answer: "Não consegui consultar as orientações do F10 agora. Passei a conversa para um atendente da equipe F10, que continua com você por aqui.",
      action: "handoff",
      handoffReason: "Falha técnica ao consultar o Assistente F10.",
      aiAvailable: false,
    }), { status: 200, headers: { "Cache-Control": "no-store" } });
  }
};
