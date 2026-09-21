import { error, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getInternalChat } from "$lib/server/support/internalChatRepository";
import {
  getSupportChatMessageAttachment,
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
  const sessionId = params.sessionId ?? "";
  const attachmentId = params.attachmentId ?? "";
  if (!isUuid(sessionId) || !isUuid(attachmentId)) {
    throw error(404, "Anexo não encontrado.");
  }

  const { session, permissions } = await requireAppPermission(
    cookies,
    "chat.view",
    `/app/chat/${sessionId}`,
  );
  const chat = await getInternalChat(session.user.id, permissions, sessionId);
  const attachment = chat.ticketId
    ? await getSupportMessageAttachment(attachmentId, chat.ticketId)
    : await getSupportChatMessageAttachment(attachmentId, sessionId);
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
