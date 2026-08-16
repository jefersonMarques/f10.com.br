import { dev } from "$app/environment";
import { json, type RequestHandler } from "@sveltejs/kit";
import {
  isSupportAiChatEnabled,
  processSupportAiChatMessage,
} from "$lib/server/support/supportAiChat";
import { handlePureSupportGreeting } from "$lib/server/support/supportChatLocalIntent";
import { startPublicChat } from "$lib/server/support/publicChatRepository";
import { autoAssignTicketIfConfigured } from "$lib/server/support/supportRoutingRepository";
import { notifySupportTicketNeedsAttention } from "$lib/server/support/supportTeamNotifications";

const MAX_BODY_BYTES = 20 * 1024;

type ChatStartDiagnosticCode =
  | "RATE_LIMIT_NOT_CONFIGURED"
  | "SUPPORT_QUEUE_UNAVAILABLE"
  | "DATABASE_UNAVAILABLE"
  | "CHAT_START_FAILED";

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidEmail(value: string): boolean {
  return (
    !value ||
    (value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
  );
}

function sanitizeContextUrl(value: string): string {
  if (!value || value.length > 1000) return "";

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function diagnoseChatStartFailure(cause: unknown): ChatStartDiagnosticCode {
  if (!(cause instanceof Error)) return "CHAT_START_FAILED";
  if (cause.message.includes("SUPPORT_RATE_LIMIT_SECRET")) {
    return "RATE_LIMIT_NOT_CONFIGURED";
  }
  if (cause.message === "CHAT_QUEUE_NOT_FOUND") {
    return "SUPPORT_QUEUE_UNAVAILABLE";
  }
  if (
    cause.message.includes("DATABASE_URL") ||
    cause.name === "PostgresError" ||
    cause.name === "PostgresConnectionError"
  ) {
    return "DATABASE_UNAVAILABLE";
  }
  return "CHAT_START_FAILED";
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

  const name = readString(body.name);
  const email = readString(body.email).toLowerCase();
  const phone = readString(body.phone);
  const message = readString(body.message);
  const entryOptionId = readString(body.entryOptionId) || null;
  const contextUrl = sanitizeContextUrl(readString(body.contextUrl));
  const pageTitle = readString(body.pageTitle).slice(0, 200);
  const helpContext = readString(body.helpContext).slice(0, 200);

  if (name.length < 2 || name.length > 120) {
    return json({ error: "INVALID_NAME" }, { status: 400 });
  }

  if (!isValidEmail(email) || phone.length > 40) {
    return json({ error: "INVALID_CONTACT" }, { status: 400 });
  }

  if (message.length < 1 || message.length > 4000) {
    return json({ error: "INVALID_MESSAGE" }, { status: 400 });
  }

  if (entryOptionId && !isUuid(entryOptionId)) {
    return json({ error: "INVALID_ENTRY_OPTION" }, { status: 400 });
  }

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  try {
    const session = await startPublicChat(clientAddress, {
      name,
      email,
      phone,
      message,
      entryOptionId,
      contextUrl,
      contextData: {
        pageTitle: pageTitle || null,
        helpContext: helpContext || null,
      },
      enableAi: isSupportAiChatEnabled(),
    });

    let ai: { state: "active" | "escalated" | "human" | "disabled"; processed: boolean } | null = null;
    if (session.aiState === "active") {
      const handledLocally = await handlePureSupportGreeting(session.sessionId, message);
      ai = handledLocally
        ? { state: "active", processed: true }
        : await processSupportAiChatMessage(session.sessionId, message);
    }

    if (session.aiState !== "active") {
      const assignedUserId = await autoAssignTicketIfConfigured(session.ticketId).catch(() => null);
      if (!assignedUserId) {
        await notifySupportTicketNeedsAttention(
          session.ticketId,
          "Novo atendimento direcionado para atendimento humano.",
        ).catch(() => undefined);
      }
    }

    return json(
      {
        sessionId: session.sessionId,
        token: session.token,
        ticketNumber: session.ticketNumber,
        entryOptionLabel: session.entryOptionLabel,
        expiresAt: session.expiresAt.toISOString(),
        aiState: ai?.state ?? session.aiState,
        aiProcessed: ai?.processed ?? false,
      },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (cause) {
    if (cause instanceof Error && cause.message === "CHAT_RATE_LIMITED") {
      return json({ error: "RATE_LIMITED" }, { status: 429 });
    }
    if (cause instanceof Error && cause.message === "CHAT_ENTRY_OPTION_NOT_FOUND") {
      return json({ error: "INVALID_ENTRY_OPTION" }, { status: 400 });
    }

    const diagnosticCode = diagnoseChatStartFailure(cause);
    console.error("[support.chat.start]", {
      diagnosticCode,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });

    return json(
      {
        error: "CHAT_UNAVAILABLE",
        ...(dev ? { diagnosticCode } : {}),
      },
      { status: 503 },
    );
  }
};
