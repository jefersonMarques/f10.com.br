import { and, eq } from "drizzle-orm";
import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppAnyPermission } from "$lib/server/auth/authorization";
import { getDatabase } from "$lib/server/db";
import { webChatMessages } from "$lib/server/db/chatSchema";
import { ticketMessages } from "$lib/server/db/supportSchema";
import { getInternalChat } from "$lib/server/support/internalChatRepository";
import { getSupportTicket } from "$lib/server/support/supportRepository";
import {
  isMessageReactionCode,
  isMessageSourceKind,
  toggleMessageReaction,
} from "$lib/server/support/supportMessageReactionRepository";

const isUuid = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const POST: RequestHandler = async ({ cookies, request, url }) => {
  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }

  const { session, permissions } = await requireAppAnyPermission(
    cookies, ["chat.view", "tickets.view"], url.pathname,
  );
  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const { messageId, sourceKind, reaction } = payload;
  if (!isUuid(messageId) || !isMessageSourceKind(sourceKind) || !isMessageReactionCode(reaction)) {
    return json({ error: "INVALID_REACTION" }, { status: 400 });
  }

  try {
    if (isUuid(payload.sourceSessionId)) {
      const chat = await getInternalChat(session.user.id, permissions, payload.sourceSessionId);
      if (sourceKind === "chat") {
        if (chat.ticketId) return json({ error: "REFRESH_REQUIRED" }, { status: 409 });
        const [message] = await getDatabase().select({ authorType: webChatMessages.authorType })
          .from(webChatMessages).where(and(
            eq(webChatMessages.id, messageId),
            eq(webChatMessages.sessionId, payload.sourceSessionId),
          )).limit(1);
        if (!message || message.authorType === "system") throw new Error("MESSAGE_NOT_FOUND");
      } else {
        if (!chat.ticketId) throw new Error("MESSAGE_NOT_FOUND");
        const [message] = await getDatabase().select({ authorType: ticketMessages.authorType })
          .from(ticketMessages).where(and(
            eq(ticketMessages.id, messageId),
            eq(ticketMessages.ticketId, chat.ticketId),
          )).limit(1);
        if (!message || message.authorType === "system") throw new Error("MESSAGE_NOT_FOUND");
      }
    } else {
      if (sourceKind !== "ticket" || !isUuid(payload.ticketId)) throw new Error("MESSAGE_NOT_FOUND");
      const ticket = await getSupportTicket(session.user.id, permissions, payload.ticketId);
      const message = ticket.messages.find((item) => item.id === messageId);
      if (!message || message.authorType === "system") throw new Error("MESSAGE_NOT_FOUND");
    }

    const selected = await toggleMessageReaction(
      sourceKind, messageId, "agent", session.user.id, reaction,
    );
    return json({ ok: true, selected }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return json({ error: "MESSAGE_NOT_FOUND" }, { status: 404 });
  }
};
