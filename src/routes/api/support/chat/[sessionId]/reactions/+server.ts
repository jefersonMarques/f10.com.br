import { and, eq } from "drizzle-orm";
import { json, type RequestHandler } from "@sveltejs/kit";
import { getDatabase } from "$lib/server/db";
import { webChatMessages } from "$lib/server/db/chatSchema";
import { ticketMessages } from "$lib/server/db/supportSchema";
import { authorizePublicChatSessionForRead } from "$lib/server/support/publicChatRepository";
import { getAuthenticatedPublicChatCustomer } from "$lib/server/support/publicChatCustomerAccess";
import {
  isMessageReactionCode,
  toggleMessageReaction,
} from "$lib/server/support/supportMessageReactionRepository";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,120}$/;

export const POST: RequestHandler = async ({ params, cookies, request, url }) => {
  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  const sessionId = params.sessionId ?? "";
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "").trim();
  if (!UUID_PATTERN.test(sessionId) || !TOKEN_PATTERN.test(token)) {
    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }

  try {
    const chat = await authorizePublicChatSessionForRead(sessionId, token);
    const customer = await getAuthenticatedPublicChatCustomer(cookies, chat, false);
    if (!customer) return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401 });

    const payload = await request.json() as Record<string, unknown>;
    const messageId = payload.messageId;
    if (typeof messageId !== "string" || !UUID_PATTERN.test(messageId) ||
      !isMessageReactionCode(payload.reaction)) {
      return json({ error: "INVALID_REACTION" }, { status: 400 });
    }

    const sourceKind = chat.ticketId ? "ticket" : "chat";
    const message = chat.ticketId
      ? await getDatabase().select({ authorType: ticketMessages.authorType })
        .from(ticketMessages).where(and(
          eq(ticketMessages.id, messageId),
          eq(ticketMessages.ticketId, chat.ticketId),
          eq(ticketMessages.visibility, "public"),
        )).limit(1)
      : await getDatabase().select({ authorType: webChatMessages.authorType })
        .from(webChatMessages).where(and(
          eq(webChatMessages.id, messageId),
          eq(webChatMessages.sessionId, sessionId),
          eq(webChatMessages.visibility, "public"),
        )).limit(1);

    if (!message.length || message[0].authorType === "system") {
      return json({ error: "MESSAGE_NOT_FOUND" }, { status: 404 });
    }

    const selected = await toggleMessageReaction(
      sourceKind, messageId, "customer", customer.contactId, payload.reaction,
    );
    return json({ ok: true, selected }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }
};
