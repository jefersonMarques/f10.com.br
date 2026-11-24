import { json, type RequestHandler } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { createCustomerF10Ticket } from "$lib/server/customerPortal/customerF10TicketRepository";
import { isAuthorizedF10Context } from "$lib/server/customerPortal/customerF10AuthRepository";
import { findActiveCustomerChat } from "$lib/server/support/customerChatSessionRepository";
import { SUPPORT_ATTACHMENT_MAX_BYTES, SUPPORT_ATTACHMENT_MAX_FILES } from "$lib/server/support/supportMessageAttachmentRepository";

const MAX_BODY_BYTES = 34 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const headers = { "Cache-Control": "private, no-store" };

function readText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export const POST: RequestHandler = async ({ request, cookies, url }) => {
  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "INVALID_ORIGIN" }, { status: 403, headers });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413, headers });
  }

  const customer = await getOptionalCustomerF10PortalSession(cookies);
  if (!customer) return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401, headers });
  const { legacyUserId, selectedGroupId: groupId, selectedUnitId: unitId } = customer;
  if (groupId === null || unitId === null || !isAuthorizedF10Context(customer, groupId, unitId)) {
    return json({ error: "CUSTOMER_CONTEXT_REQUIRED" }, { status: 409, headers });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "INVALID_PAYLOAD" }, { status: 400, headers });
  }

  const subject = readText(form, "subject");
  const description = readText(form, "description");
  const requestId = readText(form, "requestId");
  const assistantTranscript = readText(form, "assistantTranscript");
  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  if (subject.length < 3 || subject.length > 180 || !description || description.length > 10000
    || assistantTranscript.length > 8000
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
    return json({ error: "CHAT_TICKET_INVALID_INPUT" }, { status: 400, headers });
  }
  if (files.length > SUPPORT_ATTACHMENT_MAX_FILES
    || files.some((file) => file.size > SUPPORT_ATTACHMENT_MAX_BYTES)
    || files.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
    return json({ error: "INVALID_ATTACHMENTS" }, { status: 413, headers });
  }

  try {
    if (await findActiveCustomerChat({ legacyUserId, groupId, unitId })) {
      return json({ error: "ACTIVE_CHAT_EXISTS" }, { status: 409, headers });
    }
    const ticket = await createCustomerF10Ticket(customer, {
      scope: "unit",
      groupId,
      unitId,
      subject,
      message: description,
      assistantTranscript,
      requestId,
      files,
    });
    return json({ ticketId: ticket.id, ticketNumber: ticket.ticketNumber }, { status: 200, headers });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    if (code === "CUSTOMER_TICKET_CONTEXT_NOT_AUTHORIZED") {
      return json({ error: code }, { status: 403, headers });
    }
    if (code.startsWith("SUPPORT_ATTACHMENT_") || code === "CUSTOMER_TICKET_SUBJECT_INVALID"
      || code === "CUSTOMER_TICKET_MESSAGE_INVALID") {
      return json({ error: code }, { status: 400, headers });
    }
    console.error("[support.chat.direct_ticket]", { errorType: cause instanceof Error ? cause.name : typeof cause });
    return json({ error: "CHAT_TICKET_UNAVAILABLE" }, { status: 503, headers });
  }
};
