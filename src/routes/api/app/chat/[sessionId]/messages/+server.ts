import { json, type RequestHandler } from "@sveltejs/kit";
import { resolveUserPermissions } from "$lib/server/auth/permissions";
import {
  getSessionUser,
  SESSION_COOKIE_NAME,
} from "$lib/server/auth/session";
import { listInternalChatConversationMessages } from "$lib/server/support/internalChatConversationRepository";
import { respondToInternalChat } from "$lib/server/support/internalChatRepository";

const MAX_BODY_BYTES = 8 * 1024;
const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 100;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES;
}

function readCursor(searchParams: URLSearchParams, prefix: "before" | "after") {
  const rawAt = searchParams.get(`${prefix}At`)?.trim() ?? "";
  const id = searchParams.get(`${prefix}Id`)?.trim() ?? "";
  if (!rawAt && !id) return null;
  if (!rawAt || !isUuid(id)) throw new Error("INVALID_CURSOR");

  const createdAt = new Date(rawAt);
  if (Number.isNaN(createdAt.getTime())) throw new Error("INVALID_CURSOR");
  return { createdAt, id };
}

function readLimit(searchParams: URLSearchParams): number {
  const raw = Number(searchParams.get("limit") ?? DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(raw)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(raw), 1), MAX_PAGE_SIZE);
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

export const GET: RequestHandler = async ({ params, cookies, url }) => {
  const sessionId = params.sessionId ?? "";
  if (!isUuid(sessionId)) {
    return json({ error: "CHAT_NOT_FOUND" }, { status: 404 });
  }

  const authentication = await getAuthenticatedContext(cookies);
  if (!authentication) {
    return json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const before = readCursor(url.searchParams, "before");
    const after = readCursor(url.searchParams, "after");
    if (before && after) return json({ error: "INVALID_CURSOR" }, { status: 400 });

    const result = await listInternalChatConversationMessages(
      authentication.session.user.id,
      authentication.permissions,
      sessionId,
      {
        before,
        after,
        limit: readLimit(url.searchParams),
      },
    );

    return json(
      {
        chat: result.chat,
        conversationKey: result.conversationKey,
        hasOlder: result.hasOlder,
        messages: result.messages,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    if (cause instanceof Error && cause.message === "INVALID_CURSOR") {
      return json({ error: "INVALID_CURSOR" }, { status: 400 });
    }
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
