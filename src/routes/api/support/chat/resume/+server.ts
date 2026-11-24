import { json, type RequestHandler } from "@sveltejs/kit";
import { isAuthorizedF10Context } from "$lib/server/customerPortal/customerF10AuthRepository";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { findActiveCustomerChat, resumeActiveCustomerChatSession } from "$lib/server/support/customerChatSessionRepository";

const headers = { "Cache-Control": "private, no-store" };

export const GET: RequestHandler = async ({ cookies }) => {
  try {
    const customer = await getOptionalCustomerF10PortalSession(cookies, { touchActivity: false });
    if (!customer) return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401, headers });
    const { legacyUserId, selectedGroupId, selectedUnitId } = customer;
    if (selectedGroupId === null || selectedUnitId === null
      || !isAuthorizedF10Context(customer, selectedGroupId, selectedUnitId)) {
      return json({ error: "CUSTOMER_CONTEXT_REQUIRED" }, { status: 409, headers });
    }
    const active = await findActiveCustomerChat({ legacyUserId, groupId: selectedGroupId, unitId: selectedUnitId });
    return json({ active }, { headers });
  } catch {
    return json({ error: "CHAT_RESUME_UNAVAILABLE" }, { status: 503, headers });
  }
};

export const POST: RequestHandler = async ({ cookies, request, url }) => {
  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "INVALID_ORIGIN" }, { status: 403, headers });
  }

  try {
    const customer = await getOptionalCustomerF10PortalSession(cookies);
    if (!customer) return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401, headers });

    const { legacyUserId, selectedGroupId, selectedUnitId } = customer;
    if (selectedGroupId === null || selectedUnitId === null
      || !isAuthorizedF10Context(customer, selectedGroupId, selectedUnitId)) {
      return json({ error: "CUSTOMER_CONTEXT_REQUIRED" }, { status: 409, headers });
    }

    const chat = await resumeActiveCustomerChatSession({
      customerContext: { legacyUserId, groupId: selectedGroupId, unitId: selectedUnitId },
    });
    if (!chat) return json({ session: null }, { headers });

    return json({
      session: {
        sessionId: chat.sessionId,
        token: chat.token,
        ticketNumber: chat.chatNumber,
        ticketId: chat.ticketId,
        expiresAt: chat.expiresAt.toISOString(),
        aiState: chat.aiState,
        entryOptionLabel: chat.entryOptionLabel,
        department: chat.department,
      },
    }, { headers });
  } catch (cause) {
    console.error("[support.chat.resume]", { causeType: cause instanceof Error ? cause.name : typeof cause });
    return json({ error: "CHAT_RESUME_UNAVAILABLE" }, { status: 503, headers });
  }
};
