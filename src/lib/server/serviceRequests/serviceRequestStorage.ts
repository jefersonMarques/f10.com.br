import { createHash, randomUUID } from "node:crypto";
import { env } from "$env/dynamic/private";
import {
  deleteAssetObjectFromBucket,
  getAssetObjectFromBucket,
  putAssetObjectInBucket,
} from "$lib/server/storage/assetStorage";
import {
  SERVICE_REQUEST_ATTACHMENT_DEFINITIONS,
  type ServiceRequestAttachmentDefinition,
  type ServiceRequestType,
} from "$lib/server/serviceRequests/serviceRequestDefinitions";

const MAX_TOTAL_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export type ServiceRequestAttachmentInput = {
  fieldKey: string;
  file: File;
};

export type StoredServiceRequestAttachment = {
  fieldKey: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
};

type DetectedFile = {
  kind: "image" | "pdf" | "xml" | "certificate";
  contentType: string;
  extension: string;
};

function privateBucket(): string {
  const bucket = env.SERVICE_REQUEST_S3_BUCKET?.trim() ?? "";
  if (!bucket) throw new Error("SERVICE_REQUEST_STORAGE_NOT_CONFIGURED");
  const publicBucket = env.S3_BUCKET?.trim() ?? "";
  if (publicBucket && bucket === publicBucket) {
    throw new Error("SERVICE_REQUEST_STORAGE_BUCKET_NOT_PRIVATE");
  }
  return bucket;
}

function safeFileName(value: string): string {
  const base = value.split(/[/\\]/).pop()?.trim() || "arquivo";
  return base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._()+\- ]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160) || "arquivo";
}

function fileExtension(name: string): string {
  const safe = safeFileName(name);
  const index = safe.lastIndexOf(".");
  return index > 0 ? safe.slice(index + 1).toLowerCase() : "";
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
}

function isXml(bytes: Uint8Array): boolean {
  const sample = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 1024));
  return /^\uFEFF?\s*<(?:(?:\?xml\b)|[A-Za-z_:])/i.test(sample);
}

function isCertificate(bytes: Uint8Array, extension: string): boolean {
  if (!["cert", "cer", "pem", "pfx", "p12", "p7b", "p7c", "p7s"].includes(extension)) {
    return false;
  }
  if (bytes[0] === 0x30) return true;
  const sample = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 256)).trimStart();
  return sample.startsWith("-----BEGIN ");
}

function detectFile(file: File, bytes: Uint8Array): DetectedFile | null {
  const extension = fileExtension(file.name);
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: "image", contentType: "image/png", extension: "png" };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { kind: "image", contentType: "image/jpeg", extension: extension === "jpeg" ? "jpeg" : "jpg" };
  }
  if (isWebp(bytes)) {
    return { kind: "image", contentType: "image/webp", extension: "webp" };
  }
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { kind: "pdf", contentType: "application/pdf", extension: "pdf" };
  }
  if (extension === "xml" && isXml(bytes)) {
    return { kind: "xml", contentType: "application/xml", extension: "xml" };
  }
  if (isCertificate(bytes, extension)) {
    return {
      kind: "certificate",
      contentType: file.type?.trim() || "application/octet-stream",
      extension,
    };
  }
  return null;
}

function validateAttachmentSet(
  requestType: ServiceRequestType,
  attachments: ServiceRequestAttachmentInput[],
): Map<string, ServiceRequestAttachmentDefinition> {
  const definitions = SERVICE_REQUEST_ATTACHMENT_DEFINITIONS[requestType];
  const byKey = new Map(definitions.map((definition) => [definition.fieldKey, definition]));
  const counts = new Map<string, number>();
  let totalBytes = 0;

  for (const attachment of attachments) {
    const definition = byKey.get(attachment.fieldKey);
    if (!definition) throw new Error("SERVICE_REQUEST_ATTACHMENT_FIELD_INVALID");
    if (!(attachment.file instanceof File) || attachment.file.size <= 0) {
      throw new Error("SERVICE_REQUEST_ATTACHMENT_INVALID");
    }
    if (attachment.file.size > definition.maxBytes) {
      throw new Error(`SERVICE_REQUEST_ATTACHMENT_TOO_LARGE:${attachment.fieldKey}`);
    }
    const count = (counts.get(attachment.fieldKey) ?? 0) + 1;
    if (count > definition.maxFiles) {
      throw new Error(`SERVICE_REQUEST_ATTACHMENT_TOO_MANY:${attachment.fieldKey}`);
    }
    counts.set(attachment.fieldKey, count);
    totalBytes += attachment.file.size;
  }

  if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    throw new Error("SERVICE_REQUEST_ATTACHMENTS_TOO_LARGE");
  }

  for (const definition of definitions) {
    if (definition.required && (counts.get(definition.fieldKey) ?? 0) === 0) {
      throw new Error(`SERVICE_REQUEST_ATTACHMENT_REQUIRED:${definition.fieldKey}`);
    }
  }

  return byKey;
}

export async function uploadServiceRequestAttachments(
  serviceRequestId: string,
  requestType: ServiceRequestType,
  attachments: ServiceRequestAttachmentInput[],
): Promise<StoredServiceRequestAttachment[]> {
  const definitions = validateAttachmentSet(requestType, attachments);
  const bucket = privateBucket();
  const stored: StoredServiceRequestAttachment[] = [];

  try {
    for (const attachment of attachments) {
      const definition = definitions.get(attachment.fieldKey);
      if (!definition) throw new Error("SERVICE_REQUEST_ATTACHMENT_FIELD_INVALID");
      const bytes = new Uint8Array(await attachment.file.arrayBuffer());
      const detected = detectFile(attachment.file, bytes);
      if (!detected || !definition.kinds.includes(detected.kind)) {
        throw new Error(`SERVICE_REQUEST_ATTACHMENT_TYPE_INVALID:${attachment.fieldKey}`);
      }

      const storageKey = [
        "service-requests",
        serviceRequestId,
        attachment.fieldKey,
        `${randomUUID()}.${detected.extension}`,
      ].join("/");
      const asset = await putAssetObjectInBucket(bucket, storageKey, bytes, detected.contentType);
      stored.push({
        fieldKey: attachment.fieldKey,
        storageKey,
        originalName: safeFileName(attachment.file.name),
        mimeType: detected.contentType,
        sizeBytes: asset.size,
        checksumSha256: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    return stored;
  } catch (cause) {
    await deleteStoredServiceRequestAttachments(stored);
    throw cause;
  }
}

export async function getServiceRequestObject(storageKey: string, range?: string): Promise<Response> {
  if (!storageKey.startsWith("service-requests/")) throw new Error("SERVICE_REQUEST_STORAGE_KEY_INVALID");
  return getAssetObjectFromBucket(privateBucket(), storageKey, range);
}

export async function deleteStoredServiceRequestAttachments(
  attachments: Array<Pick<StoredServiceRequestAttachment, "storageKey">>,
): Promise<void> {
  if (attachments.length === 0) return;
  const bucket = privateBucket();
  await Promise.allSettled(
    attachments.map((attachment) => deleteAssetObjectFromBucket(bucket, attachment.storageKey)),
  );
}
