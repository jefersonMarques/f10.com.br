import { json, type RequestHandler } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { createCustomerTicketFromChat } from "$lib/server/support/chatTicketBridge";
import { SUPPORT_ATTACHMENT_MAX_BYTES, SUPPORT_ATTACHMENT_MAX_FILES } from "$lib/server/support/supportMessageAttachmentRepository";

const MAX_BODY_BYTES = 42 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, cookies, params, url }) => {
  if (request.headers.get("origin") !== url.origin) return json({ error: "INVALID_ORIGIN" }, { status: 403 });
  const sessionId = params.sessionId ?? "";
  const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{40,120})$/)?.[1];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId) || !token) {
    return json({ error: "INVALID_SESSION" }, { status: 401 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }
  const customer = await getOptionalCustomerF10PortalSession(cookies);
  if (!customer) return json({ error: "CUSTOMER_AUTH_REQUIRED" }, { status: 401 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ error: "INVALID_PAYLOAD" }, { status: 400 }); }
  const subjectValue = form.get("subject");
  const descriptionValue = form.get("description");
  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length > SUPPORT_ATTACHMENT_MAX_FILES || files.some((file) => file.size > SUPPORT_ATTACHMENT_MAX_BYTES)) {
    return json({ error: "INVALID_ATTACHMENTS" }, { status: 413 });
  }

  try {
    const result = await createCustomerTicketFromChat(customer, sessionId, token, {
      subject: typeof subjectValue === "string" ? subjectValue : "",
      description: typeof descriptionValue === "string" ? descriptionValue : "",
      files,
    });
    return json({ ticketId: result.ticketId, ticketNumber: result.ticketNumber, created: result.created },
      { status: result.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "";
    if (code === "CHAT_TICKET_CREATE_NOT_ALLOWED" || code === "CHAT_NOT_FOUND") {
      return json({ error: "CHAT_TICKET_CREATE_NOT_ALLOWED" }, { status: 403 });
    }
    if (code === "CHAT_TICKET_INVALID_INPUT" || code.startsWith("SUPPORT_ATTACHMENT_")) {
      return json({ error: code }, { status: 400 });
    }
    if (code === "CHAT_TICKET_NOT_AVAILABLE") return json({ error: code }, { status: 409 });
    console.error("[support.chat.customer_ticket]", { sessionId, cause });
    return json({ error: "CHAT_TICKET_UNAVAILABLE" }, { status: 503 });
  }
};
