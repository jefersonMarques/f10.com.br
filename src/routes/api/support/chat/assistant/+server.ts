import { dev } from "$app/environment";
import { json, type RequestHandler } from "@sveltejs/kit";
import { createOpenAiStructuredResponse } from "$lib/server/ai/openAiResponses";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import {
  getHelpPresentation,
  type HelpPresentation,
} from "$lib/server/help/helpPresentation";
import { isSupportAiChatEnabled } from "$lib/server/support/supportAiChat";
import { runSupportAi, type SupportAiResult } from "$lib/server/support/supportAiAgent";
import { consumeSupportPublicRateLimit } from "$lib/server/support/supportPublicRateLimit";

const MAX_BODY_BYTES = 24 * 1024;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_CONTEXT_CHARS = 6_000;
const MAX_PAGE_CONTEXT_CHARS = 1_200;
const MAX_SOURCE_SLUG_CHARS = 160;
const MAX_UNRESOLVED_COUNT = 2;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_BLOCK_MS = 30 * 60 * 1000;
const LAST_HELP_SEARCH_COOKIE = "f10_support_last_help_search";

const HANDOFF_INTENT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    intent: {
      type: "string",
      enum: ["confirm_handoff", "decline_handoff", "other"],
    },
  },
  required: ["intent"],
} as const;

const HANDOFF_INTENT_INSTRUCTIONS = `Classifique somente a resposta do cliente à oferta explícita de falar com uma pessoa da equipe F10.
Retorne confirm_handoff quando o cliente aceitar ou pedir o atendimento humano.
Retorne decline_handoff quando o cliente recusar ou disser que prefere continuar sem atendimento humano.
Retorne other quando a mensagem não responder claramente à oferta, mudar de assunto ou for ambígua demais.
Tolere abreviações, linguagem informal e pequenos erros de digitação.
Não transforme dúvida, hesitação ou ausência de resposta em confirmação.`;

type AssistantAction = "answer" | "clarify" | "handoff" | "ticket_offer";
type HandoffIntent = "confirm_handoff" | "decline_handoff" | "other";
type HandoffIntentResponse = { intent: HandoffIntent };

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

function requestsPreviousVideo(message: string): boolean {
  const normalized = normalizeText(message);
  if (!/\bvideo\b/.test(normalized)) return false;
  return /\b(?:ver|assistir|abrir|mostrar|mostra|manda|mandar|tem|possui|existe|quero|posso|pode)\b/.test(normalized) || normalized === "video";
}

function requestsPreviousArticle(message: string): boolean {
  const normalized = normalizeText(message);
  return (
    /\b(?:link|artigo|conteudo|central de ajuda)\b/.test(normalized) &&
    /\b(?:ver|abrir|mostrar|mostra|manda|mandar|quero|posso|pode|qual|onde)\b/.test(normalized)
  );
}

function localAssistantReply(message: string): string | null {
  const normalized = normalizeText(message);
  if (/^(?:oi|ola|opa|e ai|bom dia|boa tarde|boa noite|oi tudo bem|ola tudo bem|tudo bem)$/.test(normalized)) {
    return "Olá! Como posso ajudar com o F10 hoje?";
  }
  if (/^(?:obrigado|obrigada|muito obrigado|muito obrigada|valeu|agradeco)$/.test(normalized)) {
    return "Por nada. Se precisar de mais alguma coisa no F10, pode continuar por aqui.";
  }
  return null;
}

function currentArticleSlug(pageContext: string): string {
  const match = pageContext.match(/(?:^|\n)Caminho:\s*\/ajuda-f10\/([^/?#\s]+)/i);
  if (!match?.[1]) return "";
  try {
    const slug = decodeURIComponent(match[1]).trim().slice(0, MAX_SOURCE_SLUG_CHARS);
    return /^[a-z0-9][a-z0-9-]{0,159}$/i.test(slug) ? slug : "";
  } catch {
    return "";
  }
}

function lastAssistantMessage(conversationContext: string): string {
  return conversationContext
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^Assistente F10:/i.test(line))
    .at(-1)
    ?.replace(/^Assistente F10:\s*/i, "")
    .trim() ?? "";
}

function previousAssistantOfferedHuman(conversationContext: string): boolean {
  const normalized = normalizeText(lastAssistantMessage(conversationContext));
  return (
    /quer falar com (?:uma pessoa|a equipe|um atendente)/.test(normalized) ||
    /posso encaminhar (?:voce|a conversa) para (?:uma pessoa|a equipe|um atendente)/.test(normalized)
  );
}

function deterministicHandoffIntent(message: string): HandoffIntent | null {
  const normalized = normalizeText(message);
  if (!normalized) return null;

  if (
    /^(?:nao|agora nao|prefiro nao|nao quero|melhor nao|deixa pra la|deixa para la)\b/.test(normalized)
  ) {
    return "decline_handoff";
  }

  if (
    /^(?:sim|quero|pode|claro|ok|okay|beleza|vamos)\b/.test(normalized) &&
    !/\bnao\b/.test(normalized)
  ) {
    return "confirm_handoff";
  }

  return null;
}

function isHandoffIntent(value: unknown): value is HandoffIntent {
  return value === "confirm_handoff" || value === "decline_handoff" || value === "other";
}

async function classifyHandoffIntent(
  message: string,
  conversationContext: string,
): Promise<HandoffIntent> {
  if (!previousAssistantOfferedHuman(conversationContext)) return "other";

  const deterministic = deterministicHandoffIntent(message);
  if (deterministic) return deterministic;
  if (!isSupportAiChatEnabled()) return "other";

  try {
    const response = await createOpenAiStructuredResponse<HandoffIntentResponse>({
      instructions: HANDOFF_INTENT_INSTRUCTIONS,
      userInput: [
        `Oferta do Assistente F10: ${lastAssistantMessage(conversationContext)}`,
        `Resposta do cliente: ${message}`,
      ].join("\n"),
      schemaName: "f10_support_handoff_intent",
      schema: HANDOFF_INTENT_SCHEMA,
      maxOutputTokens: 100,
    });
    return isHandoffIntent(response.data?.intent) ? response.data.intent : "other";
  } catch {
    return "other";
  }
}

function buildConversationContext(conversationContext: string, pageContext: string): string {
  if (!pageContext) return conversationContext;
  const pageBlock = `Contexto da página atual:\n${pageContext}`;
  return conversationContext ? `${conversationContext}\n\n${pageBlock}`.slice(0, MAX_CONTEXT_CHARS) : pageBlock;
}

async function resultPresentation(result: SupportAiResult): Promise<HelpPresentation | null> {
  const slug = result.target?.slug || result.sources[0]?.slug || "";
  if (!slug) return null;
  return getHelpPresentation(slug, result.target?.anchor ?? null);
}

function currentArticlePresentation(presentation: HelpPresentation | null): HelpPresentation | null {
  if (!presentation) return null;
  return {
    source: {
      ...presentation.source,
      title: "Ver ponto no artigo",
    },
    media: null,
  };
}

function assistantPayload(input: {
  answer: string;
  action: AssistantAction;
  aiAvailable: boolean;
  unresolvedCount?: number;
  handoffReason?: string;
  searchEventId?: string | null;
  ticketUrl?: string;
  presentation?: HelpPresentation | null;
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
    source: input.presentation?.source ?? null,
    media: input.presentation?.media ?? null,
  };
}

function humanOffer(input: {
  aiAvailable: boolean;
  unresolvedCount: number;
  searchEventId?: string | null;
  technical?: boolean;
}) {
  return assistantPayload({
    answer: input.technical
      ? "Não consegui consultar as orientações do F10 agora. Quer falar com uma pessoa da equipe F10?"
      : "Não encontrei uma orientação segura na Central de Ajuda para responder isso. Quer falar com uma pessoa da equipe F10?",
    action: "clarify",
    aiAvailable: input.aiAvailable,
    unresolvedCount: Math.min(input.unresolvedCount + 1, MAX_UNRESOLVED_COUNT),
    searchEventId: input.searchEventId,
  });
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
  const contextSourceSlug = readString(body.contextSourceSlug, MAX_SOURCE_SLUG_CHARS);
  const unresolvedCount = readUnresolvedCount(body.unresolvedCount);
  const preferredArticleSlug = currentArticleSlug(pageContext);
  const preferredArticleConversationContext =
    preferredArticleSlug && contextSourceSlug === preferredArticleSlug
      ? conversationContext
      : "";
  if (!message) return json({ error: "INVALID_MESSAGE" }, { status: 400 });

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

    const explicitHumanRequest = requestsHumanSupport(message);
    const handoffIntent = explicitHumanRequest
      ? "confirm_handoff"
      : await classifyHandoffIntent(message, conversationContext);

    if (handoffIntent === "confirm_handoff") {
      return json(assistantPayload({
        answer: "Certo. Vou encaminhar esta mesma conversa para uma pessoa da equipe F10.",
        action: "handoff",
        handoffReason: explicitHumanRequest
          ? "O cliente pediu explicitamente atendimento humano."
          : "O cliente confirmou a oferta de atendimento humano após a IA não encontrar uma orientação segura.",
        aiAvailable: isSupportAiChatEnabled(),
      }), { headers: { "Cache-Control": "no-store" } });
    }

    if (handoffIntent === "decline_handoff") {
      return json(assistantPayload({
        answer: "Tudo bem. Vamos continuar por aqui. Me diga de outra forma o que você precisa ou o que estava tentando fazer no F10.",
        action: "clarify",
        aiAvailable: isSupportAiChatEnabled(),
        unresolvedCount: 0,
      }), { headers: { "Cache-Control": "no-store" } });
    }

    if (showsFrustration(message) && conversationContext) {
      return json(assistantPayload({
        answer: "Entendi que as tentativas anteriores não resolveram. Quer falar com uma pessoa da equipe F10?",
        action: "clarify",
        aiAvailable: isSupportAiChatEnabled(),
        unresolvedCount: Math.min(unresolvedCount + 1, MAX_UNRESOLVED_COUNT),
      }), { headers: { "Cache-Control": "no-store" } });
    }

    if (contextSourceSlug && (requestsPreviousVideo(message) || requestsPreviousArticle(message))) {
      const presentation = await getHelpPresentation(contextSourceSlug);
      if (presentation) {
        if (requestsPreviousVideo(message)) {
          return json(assistantPayload({
            answer: presentation.media
              ? "Sim. O vídeo deste conteúdo está disponível logo abaixo. Também deixei o link da orientação completa na Central de Ajuda."
              : "Este conteúdo não possui um vídeo publicado no momento. Você pode abrir a orientação completa na Central de Ajuda pelo link abaixo.",
            action: "answer",
            aiAvailable: isSupportAiChatEnabled(),
            unresolvedCount: 0,
            presentation,
          }), { headers: { "Cache-Control": "no-store" } });
        }

        return json(assistantPayload({
          answer: "Claro. A orientação completa está na Central de Ajuda. Você pode abrir pelo link abaixo.",
          action: "answer",
          aiAvailable: isSupportAiChatEnabled(),
          unresolvedCount: 0,
          presentation,
        }), { headers: { "Cache-Control": "no-store" } });
      }
    }

    if (isGenericSupportRequest(message)) {
      return json(assistantPayload({
        answer: preferredArticleSlug
          ? "Claro. Pergunte sobre este conteúdo ou me diga o que você está tentando fazer no F10. Se a resposta não estiver aqui, eu procuro em toda a Central de Ajuda."
          : "Claro. Me conte o que você está tentando fazer no F10, em qual tela está e o que aconteceu.",
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
      return json(humanOffer({
        aiAvailable: false,
        unresolvedCount,
        technical: true,
      }), { headers: { "Cache-Control": "no-store" } });
    }

    const result = await runSupportAi({
      question: message,
      conversationContext: buildConversationContext(conversationContext, pageContext),
      preferredArticleSlug: preferredArticleSlug || null,
      preferredArticleConversationContext: buildConversationContext(
        preferredArticleConversationContext,
        pageContext,
      ),
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
      const rawPresentation = await resultPresentation(result).catch(() => null);
      const presentation = result.answerOrigin === "current_article"
        ? currentArticlePresentation(rawPresentation)
        : rawPresentation;
      const answer = result.answerOrigin === "other_article" && preferredArticleSlug
        ? `Encontrei a resposta em outro conteúdo da Central de Ajuda.\n\n${result.answer}`
        : result.answer;
      return json(assistantPayload({
        answer,
        action: "answer",
        aiAvailable: true,
        unresolvedCount: 0,
        searchEventId: result.searchEventId,
        presentation,
      }), { headers: { "Cache-Control": "no-store" } });
    }

    return json(humanOffer({
      aiAvailable: result.resolution !== "failed",
      unresolvedCount,
      searchEventId: result.searchEventId,
      technical: result.resolution === "failed",
    }), { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("[support.chat.assistant]", {
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return json(humanOffer({
      aiAvailable: false,
      unresolvedCount,
      technical: true,
    }), { status: 200, headers: { "Cache-Control": "no-store" } });
  }
};
