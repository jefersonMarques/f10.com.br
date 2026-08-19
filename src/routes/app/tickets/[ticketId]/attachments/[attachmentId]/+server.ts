import { error, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getAssetObject } from "$lib/server/storage/assetStorage";
import { getTicketAttachmentForDownload } from "$lib/server/support/ticketCardRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ cookies, params, url }) => {
  if (!isUuid(params.ticketId) || !isUuid(params.attachmentId)) {
    throw error(404, "Anexo não encontrado.");
  }

  const { session, permissions } = await requireAppPermission(
    cookies,
    "tickets.view",
    url.pathname,
  );

  try {
    const attachment = await getTicketAttachmentForDownload(
      session.user.id,
      permissions,
      params.ticketId,
      params.attachmentId,
    );
    const stored = await getAssetObject(attachment.storageKey);
    const inline = attachment.contentType.startsWith("image/") || attachment.contentType === "application/pdf";
    const headers = new Headers();
    headers.set("Content-Type", attachment.contentType);
    headers.set("Content-Length", String(attachment.sizeBytes));
    headers.set(
      "Content-Disposition",
      `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(attachment.originalName)}`,
    );
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(stored.body, { status: 200, headers });
  } catch {
    throw error(404, "Anexo não encontrado ou fora do seu escopo de acesso.");
  }
};
