import { json, type RequestHandler } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { parseServiceRequestAttachmentForm } from "$lib/server/serviceRequests/serviceRequestForm";
import { replaceCustomerServiceRequestAttachment } from "$lib/server/serviceRequests/serviceRequestAttachmentOperations";

const MAX_REQUEST_BYTES = 55 * 1024 * 1024;

function response(error: string, status: number) {
  return json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function statusForError(code: string): number {
  if (code === "SERVICE_REQUEST_VERSION_CONFLICT") return 409;
  if (code === "SERVICE_REQUEST_TICKET_CLOSED") return 409;
  if (code === "SERVICE_REQUEST_NOT_FOUND") return 404;
  if (code === "SERVICE_REQUEST_DELAY_ACK_REQUIRED") return 400;
  if (code === "PAYLOAD_TOO_LARGE" || code.includes("TOO_LARGE")) return 413;
  if (
    code === "SERVICE_REQUEST_STORAGE_NOT_CONFIGURED" ||
    code === "SERVICE_REQUEST_STORAGE_BUCKET_NOT_PRIVATE" ||
    code === "ASSET_STORAGE_NOT_CONFIGURED" ||
    code.startsWith("ASSET_STORAGE_PUT_")
  ) return 503;
  return code.startsWith("SERVICE_REQUEST_") ? 400 : 500;
}

export const POST: RequestHandler = async ({ params, request, cookies, url }) => {
  const ticketId = params.ticketId ?? "";
  if (!isUuid(ticketId)) return response("SERVICE_REQUEST_NOT_FOUND", 404);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return response("INVALID_ORIGIN", 403);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return response("PAYLOAD_TOO_LARGE", 413);
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("multipart/form-data")) {
    return response("UNSUPPORTED_MEDIA_TYPE", 415);
  }

  const session = await getOptionalCustomerF10PortalSession(cookies);
  if (!session) return response("AUTH_REQUIRED", 401);

  try {
    const input = parseServiceRequestAttachmentForm(await request.formData());
    await replaceCustomerServiceRequestAttachment(session, ticketId, input);
    return json(
      { success: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "SERVICE_REQUEST_ATTACHMENT_UPDATE_FAILED";
    console.error("[customer.service-request.attachment.update]", {
      ticketId,
      errorCode: code,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return response(code, statusForError(code));
  }
};
