import { json, type RequestHandler } from "@sveltejs/kit";
import {
  addPublicChatMessage,
  listPublicChatMessages,
} from "$lib/server/support/publicChatRepository";

const MAX_BODY_BYTES = 8 * 1024;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function getBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return "";

  const token = authorization.slice(7).trim();
  return /^[A-Za-z0-9_-]{40,120}$/.test(token) ? token : "";
}

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

export const GET: RequestHandler = async ({ params, request }) => {
  const sessionId = params.sessionId ?? "";
  const token = getBearerToken(request);

  if (!isUuid(sessionId) || !token) {
    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }

  try {
    const messages = await listPublicChatMessages(sessionId, token);
    return json(
      { messages },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }
};

export const POST: RequestHandler = async ({
  params,
  request,
  getClientAddress,
}) => {
  const sessionId = params.sessionId ?? "";
  const token = getBearerToken(request);

  if (!isUuid(sessionId) || !token) {
    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }

  if (isBodyTooLarge(request)) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const body = typeof payload.body === "string" ? payload.body.trim() : "";
  if (body.length < 1 || body.length > 4000) {
    return json({ error: "INVALID_MESSAGE" }, { status: 400 });
  }

  let clientAddress = "unknown";
  try {
    clientAddress = getClientAddress();
  } catch {
    clientAddress = "unknown";
  }

  try {
    await addPublicChatMessage(clientAddress, sessionId, token, body);
    return json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (cause instanceof Error && cause.message === "CHAT_RATE_LIMITED") {
      return json({ error: "RATE_LIMITED" }, { status: 429 });
    }

    if (cause instanceof Error && cause.message === "CHAT_TICKET_CLOSED") {
      return json({ error: "CHAT_CLOSED" }, { status: 409 });
    }

    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }
};
