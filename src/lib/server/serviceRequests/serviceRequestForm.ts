import type { ReplaceServiceRequestAttachmentInput } from "$lib/server/serviceRequests/serviceRequestAttachmentOperations";
import type { UpdateServiceRequestInput } from "$lib/server/serviceRequests/serviceRequestOperations";

function parseExpectedVersion(formData: FormData): number {
  const expectedVersionValue = formData.get("expectedVersion");
  const expectedVersion = typeof expectedVersionValue === "string"
    ? Number.parseInt(expectedVersionValue, 10)
    : Number.NaN;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new Error("SERVICE_REQUEST_VERSION_INVALID");
  }
  return expectedVersion;
}

export function parseServiceRequestUpdateForm(formData: FormData): UpdateServiceRequestInput {
  const expectedVersion = parseExpectedVersion(formData);
  const fields: Record<string, unknown> = {};
  for (const [name, value] of formData.entries()) {
    if (typeof value !== "string") continue;
    if (name.startsWith("field:")) {
      const fieldKey = name.slice("field:".length);
      if (fieldKey) fields[fieldKey] = value;
      continue;
    }
    if (name.startsWith("secret:")) {
      const fieldKey = name.slice("secret:".length);
      if (fieldKey && value.trim()) fields[fieldKey] = value;
    }
  }

  return {
    expectedVersion,
    fields,
    delayAcknowledged: formData.get("delayAcknowledged") === "true",
  };
}

export function parseServiceRequestAttachmentForm(
  formData: FormData,
): ReplaceServiceRequestAttachmentInput {
  const expectedVersion = parseExpectedVersion(formData);
  const fieldKeyValue = formData.get("fieldKey");
  const fieldKey = typeof fieldKeyValue === "string" ? fieldKeyValue.trim() : "";
  const files = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!fieldKey) throw new Error("SERVICE_REQUEST_ATTACHMENT_FIELD_INVALID");
  if (files.length === 0) throw new Error("SERVICE_REQUEST_ATTACHMENT_REQUIRED");

  return {
    expectedVersion,
    fieldKey,
    files,
    delayAcknowledged: formData.get("delayAcknowledged") === "true",
  };
}
