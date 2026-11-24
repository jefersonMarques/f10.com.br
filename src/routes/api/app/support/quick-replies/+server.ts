import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppAnyPermission } from "$lib/server/auth/authorization";
import { listQuickReplies, mutateQuickReply } from "$lib/server/support/quickReplyRepository";

const headers = { "Cache-Control": "private, no-store" };

export const GET: RequestHandler = async ({ cookies, url }) => {
  const { session, permissions } = await requireAppAnyPermission(cookies, ["chat.respond", "tickets.reply"], url.pathname);
  return json({ scopes: await listQuickReplies(session.user.id, permissions), agentName: session.user.name }, { headers });
};

export const POST: RequestHandler = async ({ cookies, request, url }) => {
  if (request.headers.get("origin") !== url.origin) return json({ error: "INVALID_ORIGIN" }, { status: 403, headers });
  const { session, permissions } = await requireAppAnyPermission(cookies, ["chat.respond", "tickets.reply"], url.pathname);
  try {
    const text = await request.text();
    if (text.length > 16_384) return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413, headers });
    await mutateQuickReply(session.user.id, permissions, JSON.parse(text));
    return json({ scopes: await listQuickReplies(session.user.id, permissions), agentName: session.user.name }, { headers });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    const status = code === "QUICK_REPLY_ACCESS_DENIED" ? 403
      : code === "QUICK_REPLY_NOT_FOUND" ? 404
      : code === "QUICK_REPLY_DUPLICATE" ? 409
      : code === "INVALID_QUICK_REPLY" || code === "QUICK_REPLY_LIMIT" || cause instanceof SyntaxError ? 400 : 503;
    return json({ error: status === 503 ? "QUICK_REPLY_UNAVAILABLE" : code }, { status, headers });
  }
};
