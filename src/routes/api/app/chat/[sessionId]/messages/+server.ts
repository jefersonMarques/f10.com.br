import { json, type RequestHandler } from "@sveltejs/kit";
import { resolveUserPermissions } from "$lib/server/auth/permissions";
import {
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "$lib/server/auth/session";
import {
  listInternalChatMessages,
  respondToInternalChat,
} from "$lib/server/support/internalChatRepository";

const MAX_BODY_BYTES = 8 * 1024;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

async function getAuthenticatedContext(cookies: Parameters<RequestHandler>[0]["cookies"]) {
  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return null;

  const session = await getSessionUser(token);
  if (!session) return null;

  return {
    session,
    permissions: await resolveUserPermissions(session.user.id),
  };
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const sessionId = params.sessionId ?? "";
  if (!isUuid(sessionId)) {
    return json({ error: "CHAT_NOT_FOUND" }, { status: 404 });
  }

  const authentication = await getAuthenticatedContext(cookies);
  if (!authentication) {
    return json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const result = await listInternalChatMessages(
      authentication.session.user.id,
      authentication.permissions,
      sessionId,
    );

    return json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return json({ error: "CHAT_NOT_FOUND" }, { status: 404 });
  }
};

export const POST: RequestHandler = async ({
  params,
  request,
  cookies,
  url,
}) => {
  const sessionId = params.sessionId ?? "";
  if (!isUuid(sessionId)) {
    return json({ error: "CHAT_NOT_FOUND" }, { status: 404 });
  }

  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }

  if (isBodyTooLarge(request)) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  const authentication = await getAuthenticatedContext(cookies);
  if (!authentication) {
    return json({ error: "UNAUTHORIZED" }, { status: 401 });
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

  try {
    await respondToInternalChat(
      authentication.session.user.id,
      authentication.permissions,
      sessionId,
      body,
    );
    return json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return json({ error: "CHAT_NOT_WRITABLE" }, { status: 403 });
  }
};
