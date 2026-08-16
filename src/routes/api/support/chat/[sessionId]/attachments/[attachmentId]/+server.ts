import { error, type RequestHandler } from "@sveltejs/kit";
import { authorizePublicChatSession } from "$lib/server/support/publicChatRepository";
import {
  getSupportMessageAttachment,
  readSupportMessageAttachment,
} from "$lib/server/support/supportMessageAttachmentRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return "";
  const token = authorization.slice(7).trim();
  return /^[A-Za-z0-9_-]{40,120}$/.test(token) ? token : "";
}

function contentDisposition(name: string): string {
  return `inline; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export const GET: RequestHandler = async ({ params, request }) => {
  const sessionId = params.sessionId ?? "";
  const attachmentId = params.attachmentId ?? "";
  const token = getBearerToken(request);
  if (!isUuid(sessionId) || !isUuid(attachmentId) || !token) {
    throw error(401, "Anexo não autorizado.");
  }

  try {
    const session = await authorizePublicChatSession(sessionId, token);
    const attachment = await getSupportMessageAttachment(attachmentId, session.ticketId);
    if (!attachment) throw error(404, "Anexo não encontrado.");

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
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    throw error(401, "Anexo não autorizado.");
  }
};
