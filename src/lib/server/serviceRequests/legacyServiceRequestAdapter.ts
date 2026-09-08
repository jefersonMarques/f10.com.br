import { json, type Cookies } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import { createPublicServiceRequest } from "$lib/server/serviceRequests/publicServiceRequestService";
import { createCustomerServiceRequest } from "$lib/server/serviceRequests/serviceRequestService";
import {
  consumeSupportPublicRateLimit,
  releaseSupportPublicRateLimit,
} from "$lib/server/support/supportPublicRateLimit";
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
  if (code === "RATE_LIMITED") return "Muitas solicitações foram enviadas deste acesso. Aguarde antes de tentar novamente.";
  if (code === "SERVICE_REQUEST_RATE_LIMIT_UNAVAILABLE") return "O formulário público está temporariamente indisponível.";
  if (code === "UNIT_REQUIRED" || code === "SERVICE_REQUEST_CONTEXT_REQUIRED") {
    return "Selecione o grupo e a unidade desta implementação antes de enviar.";
  }
  if (code === "IDEMPOTENCY_KEY_REQUIRED") return "Atualize a página e tente enviar novamente.";
  if (code === "PAYLOAD_TOO_LARGE" || code.includes("TOO_LARGE")) {
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
  if (code === "RATE_LIMITED") return 429;
  if (code === "SERVICE_REQUEST_RATE_LIMIT_UNAVAILABLE") return 503;
  if (code === "UNIT_REQUIRED") return 409;
  if (code === "SERVICE_REQUEST_CONTEXT_REQUIRED") return 400;
  if (code === "SERVICE_REQUEST_CONTEXT_NOT_AUTHORIZED") return 403;
  if (code === "SERVICE_REQUEST_IDEMPOTENCY_CONFLICT") return 409;
  if (code === "PAYLOAD_TOO_LARGE" || code.includes("TOO_LARGE")) return 413;
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

function readPositiveInteger(formData: FormData, name: string): number | null {
  const value = formData.get(name);
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
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
  clientAddress?: string;
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

  const idempotencyKey = input.request.headers.get("idempotency-key")?.trim() ?? "";
  if (!idempotencyKey) return response("IDEMPOTENCY_KEY_REQUIRED", 400);

  let formData: FormData;
  try {
    formData = await input.request.formData();
  } catch {
    return response("SERVICE_REQUEST_PAYLOAD_INVALID", 400);
  }

  const session = await getOptionalCustomerF10PortalSession(input.cookies);
  const groupId = readPositiveInteger(formData, "serviceRequestGroupId");
  const unitId = readPositiveInteger(formData, "serviceRequestUnitId");
  const authenticatedPortalSubmission = Boolean(session && groupId !== null && unitId !== null);
  const attachments = collectAttachments(formData);

  const publicRateLimitScope = `service-request:${input.requestType}`;
  const publicRateLimitAddress = input.clientAddress?.trim() || "unknown";
  let publicRateLimitConsumed = false;

  if (!authenticatedPortalSubmission) {
    try {
      const allowed = await consumeSupportPublicRateLimit(
        publicRateLimitScope,
        publicRateLimitAddress,
        {
          maxRequests: 8,
          windowMs: 60 * 60 * 1000,
          blockMs: 2 * 60 * 60 * 1000,
        },
      );
      if (!allowed) return response("RATE_LIMITED", 429);
      publicRateLimitConsumed = true;
    } catch (cause) {
      console.error("[legacy.service-request.rate-limit]", {
        requestType: input.requestType,
        causeType: cause instanceof Error ? cause.name : typeof cause,
      });
      return response("SERVICE_REQUEST_RATE_LIMIT_UNAVAILABLE", 503);
    }
  }

  try {
    const fields = parsePayload(formData, input.requestType);
    const result = authenticatedPortalSubmission && session && groupId !== null && unitId !== null
      ? await createCustomerServiceRequest(session, {
          requestType: input.requestType,
          groupId,
          unitId,
          idempotencyKey,
          fields,
          attachments,
        })
      : await createPublicServiceRequest({
          requestType: input.requestType,
          idempotencyKey,
          fields,
          attachments,
        });

    return json(
      {
        success: true,
        ...result,
        ...(authenticatedPortalSubmission
          ? { ticketHref: `/cliente/chamados/${result.ticketId}` }
          : {}),
      },
      {
        status: result.deduplicated ? 200 : 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (cause) {
    const code = cause instanceof Error ? cause.message : "SERVICE_REQUEST_CREATE_FAILED";
    const status = statusForError(code);
    if (publicRateLimitConsumed && status >= 500) {
      await releaseSupportPublicRateLimit(
        publicRateLimitScope,
        publicRateLimitAddress,
      ).catch(() => undefined);
    }
    console.error("[legacy.service-request.submit]", {
      requestType: input.requestType,
      authenticatedPortalSubmission,
      groupId,
      unitId,
      errorCode: code,
      attachmentCount: attachments.length,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return response(code, status);
  }
}
