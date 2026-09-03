import { json, type Cookies } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { createCustomerServiceRequest } from "$lib/server/serviceRequests/serviceRequestService";
import type { ServiceRequestType } from "$lib/server/serviceRequests/serviceRequestDefinitions";
import type { ServiceRequestAttachmentInput } from "$lib/server/serviceRequests/serviceRequestStorage";

const MAX_REQUEST_BYTES = 55 * 1024 * 1024;

function response(error: string, status: number) {
  return json({ success: false, error, message: messageForError(error) }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function messageForError(code: string): string {
  if (code === "AUTH_REQUIRED") return "Sua sessão expirou. Entre novamente na Área do Cliente.";
  if (code === "UNIT_REQUIRED") return "Selecione a unidade F10 antes de enviar esta solicitação.";
  if (code === "IDEMPOTENCY_KEY_REQUIRED") return "Atualize a página e tente enviar novamente.";
  if (code.includes("ATTACHMENT_TOO_LARGE") || code === "PAYLOAD_TOO_LARGE") {
    return "Um ou mais documentos excedem o limite permitido.";
  }
  if (code.includes("ATTACHMENT_TYPE_INVALID")) return "Revise o formato dos documentos enviados.";
  if (code.includes("ATTACHMENT_REQUIRED")) return "Envie todos os documentos obrigatórios.";
  if (code === "SERVICE_REQUEST_TEAM_NOT_CONFIGURED") {
    return "A equipe responsável por esta solicitação ainda não foi configurada.";
  }
  if (code === "SERVICE_REQUEST_SECRET_KEY_NOT_CONFIGURED") {
    return "O armazenamento seguro de credenciais está temporariamente indisponível.";
  }
  if (code.includes("STORAGE") || code.startsWith("ASSET_STORAGE_")) {
    return "O armazenamento de documentos está temporariamente indisponível.";
  }
  return "Não foi possível enviar a solicitação. Revise os dados e tente novamente.";
}

function statusForError(code: string): number {
  if (code === "AUTH_REQUIRED") return 401;
  if (code === "UNIT_REQUIRED") return 409;
  if (code === "SERVICE_REQUEST_CONTEXT_NOT_AUTHORIZED") return 403;
  if (code === "SERVICE_REQUEST_IDEMPOTENCY_CONFLICT") return 409;
  if (
    code === "SERVICE_REQUEST_TEAM_NOT_CONFIGURED" ||
    code === "SERVICE_REQUEST_GLOBAL_STAGE_NOT_CONFIGURED" ||
    code === "SERVICE_REQUEST_AREA_STAGE_NOT_CONFIGURED" ||
    code === "SERVICE_REQUEST_SECRET_KEY_NOT_CONFIGURED" ||
    code === "SERVICE_REQUEST_STORAGE_NOT_CONFIGURED" ||
    code === "SERVICE_REQUEST_STORAGE_BUCKET_NOT_PRIVATE" ||
    code === "ASSET_STORAGE_NOT_CONFIGURED" ||
    code.startsWith("ASSET_STORAGE_PUT_")
  ) return 503;
  if (code === "PAYLOAD_TOO_LARGE") return 413;
  return code.startsWith("SERVICE_REQUEST_") || code === "IDEMPOTENCY_KEY_REQUIRED" ? 400 : 500;
}

function parsePayload(formData: FormData, requestType: ServiceRequestType): Record<string, unknown> {
  const raw = formData.get("payload") ?? formData.get("fields");
  if (typeof raw !== "string" || !raw.trim()) throw new Error("SERVICE_REQUEST_PAYLOAD_INVALID");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("SERVICE_REQUEST_PAYLOAD_INVALID");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("SERVICE_REQUEST_PAYLOAD_INVALID");
  }

  const fields = { ...(parsed as Record<string, unknown>) };
  if (requestType === "nfse") {
    delete fields.emailFields;
  }
  return fields;
}

function collectAttachments(formData: FormData): ServiceRequestAttachmentInput[] {
  const attachments: ServiceRequestAttachmentInput[] = [];
  for (const [fieldKey, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) attachments.push({ fieldKey, file: value });
  }
  return attachments;
}

export async function handleLegacyServiceRequestSubmission(input: {
  request: Request;
  cookies: Cookies;
  url: URL;
  requestType: ServiceRequestType;
}): Promise<Response> {
  const origin = input.request.headers.get("origin");
  if (origin && origin !== input.url.origin) return response("INVALID_ORIGIN", 403);

  const contentLength = Number(input.request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return response("PAYLOAD_TOO_LARGE", 413);
  }
  if (!(input.request.headers.get("content-type") ?? "").toLowerCase().includes("multipart/form-data")) {
    return response("UNSUPPORTED_MEDIA_TYPE", 415);
  }

  const session = await getOptionalCustomerF10PortalSession(input.cookies);
  if (!session) return response("AUTH_REQUIRED", 401);
  if (session.selectedGroupId === null || session.selectedUnitId === null) {
    return response("UNIT_REQUIRED", 409);
  }

  const idempotencyKey = input.request.headers.get("idempotency-key")?.trim() ?? "";
  if (!idempotencyKey) return response("IDEMPOTENCY_KEY_REQUIRED", 400);

  let formData: FormData;
  try {
    formData = await input.request.formData();
  } catch {
    return response("SERVICE_REQUEST_PAYLOAD_INVALID", 400);
  }

  try {
    const fields = parsePayload(formData, input.requestType);
    const attachments = collectAttachments(formData);
    const result = await createCustomerServiceRequest(session, {
      requestType: input.requestType,
      groupId: session.selectedGroupId,
      unitId: session.selectedUnitId,
      idempotencyKey,
      fields,
      attachments,
    });
    return json(
      {
        success: true,
        ...result,
        ticketHref: `/cliente/chamados/${result.ticketId}`,
      },
      {
        status: result.deduplicated ? 200 : 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "SERVICE_REQUEST_CREATE_FAILED";
    console.error("[legacy.service-request.submit]", {
      requestType: input.requestType,
      groupId: session.selectedGroupId,
      unitId: session.selectedUnitId,
      errorCode: code,
      attachmentCount: collectAttachments(formData).length,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return response(code, statusForError(code));
  }
}
