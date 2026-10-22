import type { RequestHandler } from "@sveltejs/kit";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { getNotificationSummary } from "$lib/server/notifications/notificationRepository";

export const GET: RequestHandler = async ({ cookies, request }) => {
  const token = cookies.get(SESSION_COOKIE_NAME);
  const session = token ? await getSessionUser(token) : null;
  if (!session) return new Response(null, { status: 401 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let fetching = false;
  let previous = "";

  let closeStream = () => undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      closeStream = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        if (timeout) clearTimeout(timeout);
        try { controller.close(); } catch { /* aborted */ }
      };
      const poll = async () => {
        if (closed || fetching) return;
        fetching = true;
        try {
          const summary = await getNotificationSummary(session.user.id);
          const json = JSON.stringify(summary);
          if (json !== previous) {
            previous = json;
            controller.enqueue(encoder.encode("data: " + json + "\n\n"));
          } else {
            controller.enqueue(encoder.encode(": alive\n\n"));
          }
        } catch {
          closeStream();
        } finally {
          fetching = false;
        }
      };
      void poll();
      timer = setInterval(() => void poll(), 3_000);
      timeout = setTimeout(closeStream, 55_000);
      request.signal.addEventListener("abort", closeStream, { once: true });
    },
    cancel() { closeStream(); },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
