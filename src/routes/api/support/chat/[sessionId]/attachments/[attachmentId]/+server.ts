import { error, type RequestHandler } from "@sveltejs/kit";
import { isAuthorizedF10Context } from "$lib/server/customerPortal/customerF10AuthRepository";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { authorizePublicChatSessionForRead } from "$lib/server/support/publicChatRepository";
import { getTicketCustomerContext } from "$lib/server/support/ticketCustomerContextRepository";
import {
  getSupportChatMessageAttachment,
  getSupportMessageAttachment,
  readSupportMessageAttachment,
} from "$lib/server/support/supportMessageAttachmentRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validToken(value: string): string {
  return /^[A-Za-z0-9_-]{40,120}$/.test(value) ? value : "";
}

function getSessionToken(request: Request, url: URL): string {
  const authorization = request.headers.get("authorization") ?? "";
  if (authorization.startsWith("Bearer ")) {
    const bearer = validToken(authorization.slice(7).trim());
    if (bearer) return bearer;
  }
  return validToken(url.searchParams.get("token")?.trim() ?? "");
}

function contentDisposition(name: string): string {
  return `inline; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export const GET: RequestHandler = async ({ params, request, url, cookies }) => {
  const sessionId = params.sessionId ?? "";
  const attachmentId = params.attachmentId ?? "";
  const token = getSessionToken(request, url);
  if (!isUuid(sessionId) || !isUuid(attachmentId) || !token) {
    throw error(401, "Anexo não autorizado.");
  }

  try {
    const session = await authorizePublicChatSessionForRead(sessionId, token);
    const customer = await getOptionalCustomerF10PortalSession(cookies, { touchActivity: false });
    if (!customer) throw error(401, "Anexo não autorizado.");

    let authorized = false;
    if (
      session.legacyUserId &&
      session.groupId !== null &&
      session.unitId !== null
    ) {
      authorized = session.legacyUserId === customer.legacyUserId &&
        isAuthorizedF10Context(customer, session.groupId, session.unitId);
    } else if (session.ticketId) {
      const context = await getTicketCustomerContext(session.ticketId);
      authorized = Boolean(
        context &&
        context.scope === "unit" &&
        context.legacyUserId === customer.legacyUserId &&
        context.groupId !== null &&
        context.unitId !== null &&
        isAuthorizedF10Context(customer, context.groupId, context.unitId),
      );
    }
    if (!authorized) throw error(401, "Anexo não autorizado.");

    const attachment = session.ticketId
      ? await getSupportMessageAttachment(attachmentId, session.ticketId)
      : await getSupportChatMessageAttachment(attachmentId, sessionId);
    if (!attachment) throw error(404, "Anexo não encontrado.");

    const object = await readSupportMessageAttachment(attachment.storageKey);
    return new Response(object.body, {
      status: 200,
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(attachment.sizeBytes),
        "Content-Disposition": contentDisposition(attachment.originalName),
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (cause) {
    if (cause && typeof cause === "object" && "status" in cause) throw cause;
    throw error(401, "Anexo não autorizado.");
  }
};
