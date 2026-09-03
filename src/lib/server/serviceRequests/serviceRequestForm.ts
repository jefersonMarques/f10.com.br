import type { UpdateServiceRequestInput } from "$lib/server/serviceRequests/serviceRequestOperations";

export function parseServiceRequestUpdateForm(formData: FormData): UpdateServiceRequestInput {
  const expectedVersionValue = formData.get("expectedVersion");
  const expectedVersion = typeof expectedVersionValue === "string"
    ? Number.parseInt(expectedVersionValue, 10)
    : Number.NaN;
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw new Error("SERVICE_REQUEST_VERSION_INVALID");
  }

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
