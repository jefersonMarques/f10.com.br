import { json, type RequestHandler } from "@sveltejs/kit";
import { resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { getInternalChat } from "$lib/server/support/internalChatRepository";
import {
  getLiveChatDraft,
  subscribeLiveChatDraft,
} from "$lib/server/support/liveChatDrafts";

const CONNECTION_LIFETIME_MS = 20_000;
const EXPIRATION_CHECK_MS = 2_000;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, cookies, request }) => {
  const sessionId = params.sessionId ?? "";
  if (!isUuid(sessionId)) return json({ error: "CHAT_NOT_FOUND" }, { status: 404 });

  const token = cookies.get(SESSION_COOKIE_NAME);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  const session = await getSessionUser(token);
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const permissions = await resolveUserPermissions(session.user.id);
    const chat = await getInternalChat(session.user.id, permissions, sessionId);
    if (chat.closedAt) return json({ error: "CHAT_CLOSED" }, { status: 410 });
  } catch {
    return json({ error: "CHAT_NOT_FOUND" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let cleanup: () => void = () => undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let stopped = false;
      const send = (body: string): void => {
        if (stopped) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ body })}\n\n`));
      };

      const unsubscribe = subscribeLiveChatDraft(sessionId, send);
      const expirationTimer = setInterval(() => {
        getLiveChatDraft(sessionId);
        if (!stopped) controller.enqueue(encoder.encode(": keepalive\n\n"));
      }, EXPIRATION_CHECK_MS);

      const reconnectTimer = setTimeout(() => {
        cleanup();
        controller.close();
      }, CONNECTION_LIFETIME_MS);

      const onAbort = () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // O navegador pode já ter encerrado o fluxo.
        }
      };

      cleanup = () => {
        if (stopped) return;
        stopped = true;
        unsubscribe();
        clearInterval(expirationTimer);
        clearTimeout(reconnectTimer);
        request.signal.removeEventListener("abort", onAbort);
      };

      request.signal.addEventListener("abort", onAbort, { once: true });
      if (request.signal.aborted) onAbort();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
