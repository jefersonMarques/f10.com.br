import { error, type RequestHandler } from "@sveltejs/kit";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { getCustomerServiceRequestAttachment } from "$lib/server/serviceRequests/serviceRequestOperations";
import { getServiceRequestObject } from "$lib/server/serviceRequests/serviceRequestStorage";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, cookies, url, request }) => {
  const ticketId = params.ticketId ?? "";
  const attachmentId = params.attachmentId ?? "";
  if (!isUuid(ticketId) || !isUuid(attachmentId)) throw error(404, "Anexo não encontrado.");

  const session = await requireCustomerF10PortalSession(cookies, url.pathname, false);
  const attachment = await getCustomerServiceRequestAttachment(session, ticketId, attachmentId);
  if (!attachment) throw error(404, "Anexo não encontrado.");

  try {
    const range = request.headers.get("range") ?? undefined;
    const stored = await getServiceRequestObject(attachment.storageKey, range);
    const headers = new Headers(stored.headers);
    const inline = attachment.mimeType.startsWith("image/") || attachment.mimeType === "application/pdf";
    headers.set("Content-Type", attachment.mimeType);
    headers.set(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
    );
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(stored.body, { status: stored.status, headers });
  } catch {
    throw error(404, "Anexo não encontrado.");
  }
};
