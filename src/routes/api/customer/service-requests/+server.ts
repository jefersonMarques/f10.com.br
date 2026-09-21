import { json, type RequestHandler } from "@sveltejs/kit";
import { getOptionalCustomerF10PortalSession } from "$lib/server/customerPortal/customerPortalSession";
import {
  isServiceRequestType,
  type ServiceRequestType,
} from "$lib/server/serviceRequests/serviceRequestDefinitions";
import { createCustomerServiceRequest } from "$lib/server/serviceRequests/serviceRequestService";
import type { ServiceRequestAttachmentInput } from "$lib/server/serviceRequests/serviceRequestStorage";

const MAX_REQUEST_BYTES = 55 * 1024 * 1024;

function response(error: string, status: number) {
  return json({ success: false, error }, { status, headers: { "Cache-Control": "no-store" } });
}

function readInteger(formData: FormData, key: string): number | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseFields(formData: FormData): Record<string, unknown> | null {
  const raw = formData.get("fields") ?? formData.get("payload");
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function collectAttachments(formData: FormData): ServiceRequestAttachmentInput[] {
  const attachments: ServiceRequestAttachmentInput[] = [];
  for (const [fieldKey, value] of formData.entries()) {
    if (value instanceof File && value.size > 0) attachments.push({ fieldKey, file: value });
  }
  return attachments;
}

function statusForError(errorCode: string): number {
  if (errorCode === "SERVICE_REQUEST_CONTEXT_NOT_AUTHORIZED") return 403;
  if (errorCode === "SERVICE_REQUEST_IDEMPOTENCY_CONFLICT") return 409;
  if (
    errorCode === "SERVICE_REQUEST_TEAM_NOT_CONFIGURED" ||
    errorCode === "SERVICE_REQUEST_GLOBAL_STAGE_NOT_CONFIGURED" ||
    errorCode === "SERVICE_REQUEST_AREA_STAGE_NOT_CONFIGURED" ||
    errorCode === "SERVICE_REQUEST_SECRET_KEY_NOT_CONFIGURED" ||
    errorCode === "SERVICE_REQUEST_STORAGE_NOT_CONFIGURED" ||
    errorCode === "SERVICE_REQUEST_STORAGE_BUCKET_NOT_PRIVATE" ||
    errorCode === "ASSET_STORAGE_NOT_CONFIGURED" ||
    errorCode.startsWith("ASSET_STORAGE_PUT_")
  ) {
    return 503;
  }
  if (errorCode.startsWith("SERVICE_REQUEST_")) return 400;
  return 500;
}

export const POST: RequestHandler = async ({ request, cookies, url }) => {
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return response("INVALID_MULTIPART", 400);
  }

  const requestTypeValue = formData.get("requestType");
  const requestType = typeof requestTypeValue === "string" && isServiceRequestType(requestTypeValue.trim())
    ? requestTypeValue.trim() as ServiceRequestType
    : null;
  const groupId = readInteger(formData, "groupId");
  const unitId = readInteger(formData, "unitId");
  const fields = parseFields(formData);
  const idempotencyFormValue = formData.get("idempotencyKey");
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ||
    (typeof idempotencyFormValue === "string" ? idempotencyFormValue.trim() : "");
  const attachments = collectAttachments(formData);

  if (!requestType || groupId === null || unitId === null || !fields || !idempotencyKey) {
    return response("INVALID_REQUEST", 400);
  }

  try {
    const result = await createCustomerServiceRequest(session, {
      requestType,
      groupId,
      unitId,
      idempotencyKey,
      fields,
      attachments,
    });
    return json(
      { success: true, ...result },
      {
        status: result.deduplicated ? 200 : 201,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (cause) {
    const errorCode = cause instanceof Error ? cause.message : "SERVICE_REQUEST_CREATE_FAILED";
    console.error("[customer.service-request.create]", {
      errorCode,
      requestType,
      groupId,
      unitId,
      attachmentCount: attachments.length,
      causeType: cause instanceof Error ? cause.name : typeof cause,
    });
    return response(errorCode, statusForError(errorCode));
  }
};
