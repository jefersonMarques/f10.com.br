import { error, type RequestHandler } from "@sveltejs/kit";
import { getCustomerF10Ticket } from "$lib/server/customerPortal/customerF10TicketRepository";
import { requireCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import {
  getSupportMessageAttachment,
  readSupportMessageAttachment,
} from "$lib/server/support/supportMessageAttachmentRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, cookies, url }) => {
  const ticketId = params.ticketId ?? "";
  const attachmentId = params.attachmentId ?? "";
  if (!isUuid(ticketId) || !isUuid(attachmentId)) throw error(404, "Anexo não encontrado.");

  const session = await requireCustomerF10PortalSession(cookies, url.pathname, false);
  const ticket = await getCustomerF10Ticket(session, ticketId);
  if (!ticket) throw error(404, "Anexo não encontrado.");

  const attachment = await getSupportMessageAttachment(attachmentId, ticketId);
  if (!attachment) throw error(404, "Anexo não encontrado.");

  const stored = await readSupportMessageAttachment(attachment.storageKey);
  if (!stored.ok) throw error(404, "Anexo não encontrado.");

  const headers = new Headers(stored.headers);
  headers.set("Content-Type", attachment.mimeType);
  headers.set(
    "Content-Disposition",
    `inline; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
  );
  headers.set("Cache-Control", "private, max-age=300");
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(stored.body, {
    status: stored.status,
    headers,
  });
};
