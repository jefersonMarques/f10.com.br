import { error, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getPermissionScope } from "$lib/server/auth/permissions";
import { requireTicketAccess } from "$lib/server/support/supportAccess";
import {
  getSupportMessageAttachment,
  readSupportMessageAttachment,
} from "$lib/server/support/supportMessageAttachmentRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function contentDisposition(name: string): string {
  return `inline; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const ticketId = params.ticketId ?? "";
  const attachmentId = params.attachmentId ?? "";
  if (!isUuid(ticketId) || !isUuid(attachmentId)) {
    throw error(404, "Anexo não encontrado.");
  }

  const { session, permissions } = await requireAppPermission(
    cookies,
    "tickets.view",
    `/app/tickets/${ticketId}`,
  );
  const scope = getPermissionScope(permissions, "tickets.view");
  if (!scope) throw error(403, "Acesso não autorizado.");
  await requireTicketAccess(session.user.id, scope, ticketId);

  const attachment = await getSupportMessageAttachment(attachmentId, ticketId);
  if (!attachment) throw error(404, "Anexo não encontrado.");

  try {
    const object = await readSupportMessageAttachment(attachment.storageKey);
    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.sizeBytes),
        "Content-Disposition": contentDisposition(attachment.originalName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    throw error(404, "Anexo indisponível.");
  }
};
