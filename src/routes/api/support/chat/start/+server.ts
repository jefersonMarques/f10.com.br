import { json, type RequestHandler } from "@sveltejs/kit";
import {
  isSupportAiChatEnabled,
  processSupportAiChatMessage,
} from "$lib/server/support/supportAiChat";
import { startPublicChat } from "$lib/server/support/publicChatRepository";

const MAX_BODY_BYTES = 20 * 1024;

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  try {
    const enableAi = isSupportAiChatEnabled();
    const session = await startPublicChat(clientAddress, {
      name,
      email,
      phone,
      message,
      contextUrl,
      contextData: {
        pageTitle: pageTitle || null,
        helpContext: helpContext || null,
      },
      enableAi,
    });
    const ai = enableAi
      ? await processSupportAiChatMessage(session.sessionId, message)
      : null;

    return json(
      {
        sessionId: session.sessionId,
        token: session.token,
        ticketNumber: session.ticketNumber,
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

    return json({ error: "CHAT_UNAVAILABLE" }, { status: 503 });
  }
};
