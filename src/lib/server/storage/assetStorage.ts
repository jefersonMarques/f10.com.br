import { createHash, createHmac } from "node:crypto";
import { env } from "$env/dynamic/private";

export type StoredAsset = {
  key: string;
  contentType: string;
  size: number;
  checksumSha256: string;
};

export type AssetStorageStatus = {
  provider: "s3" | "disabled";
  configured: boolean;
  endpoint: string;
  bucket: string;
  region: string;
};

const SERVICE = "s3";

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function encodePath(value: string): string {
  return value
    .split("/")
    .map((segment) => encodeURIComponent(segment).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`))
    .join("/");
}

function readConfiguration() {
  const endpointValue = env.S3_ENDPOINT?.trim() ?? "";
  const bucket = env.S3_BUCKET?.trim() ?? "";
  const accessKey = env.S3_ACCESS_KEY?.trim() ?? "";
  const secretKey = env.S3_SECRET_KEY?.trim() ?? "";
  const region = env.S3_REGION?.trim() || "us-east-1";
  const provider = env.ASSET_STORAGE?.trim() === "s3" ? "s3" : "disabled";
  let endpoint: URL | null = null;

  try {
    endpoint = endpointValue ? new URL(endpointValue) : null;
  } catch {
    endpoint = null;
  }

  return {
    provider,
    endpoint,
    endpointValue,
    bucket,
    accessKey,
    secretKey,
    region,
    configured:
      provider === "s3" &&
      Boolean(endpoint) &&
      Boolean(bucket) &&
      Boolean(accessKey) &&
      Boolean(secretKey),
  } as const;
}

function requireConfiguration() {
  const config = readConfiguration();
  if (!config.configured || !config.endpoint) {
    throw new Error("ASSET_STORAGE_NOT_CONFIGURED");
  }
  return { ...config, endpoint: config.endpoint };
}

function buildObjectUrl(endpoint: URL, bucket: string, key: string): URL {
  const basePath = endpoint.pathname.replace(/\/$/, "");
  const pathname = `${basePath}/${encodePath(bucket)}/${encodePath(key)}`.replace(/\/+/g, "/");
  const url = new URL(endpoint.toString());
  url.pathname = pathname;
  url.search = "";
  url.hash = "";
  return url;
}

function amzDate(date: Date): { full: string; short: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { full: iso, short: iso.slice(0, 8) };
}

function signHeaders(input: {
  method: string;
  url: URL;
  bodyHash: string;
  accessKey: string;
  secretKey: string;
  region: string;
  contentType?: string;
}) {
  const date = new Date();
  const { full, short } = amzDate(date);
  const host = input.url.host;
  const headerEntries: Array<[string, string]> = [
    ["host", host],
    ["x-amz-content-sha256", input.bodyHash],
    ["x-amz-date", full],
  ];
  if (input.contentType) headerEntries.push(["content-type", input.contentType]);
  headerEntries.sort(([a], [b]) => a.localeCompare(b));

  const canonicalHeaders = headerEntries
    .map(([name, value]) => `${name}:${value.trim().replace(/\s+/g, " ")}\n`)
    .join("");
  const signedHeaders = headerEntries.map(([name]) => name).join(";");
  const canonicalRequest = [
    input.method.toUpperCase(),
    input.url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    input.bodyHash,
  ].join("\n");
  const scope = `${short}/${input.region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    full,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${input.secretKey}`, short);
  const regionKey = hmac(dateKey, input.region);
  const serviceKey = hmac(regionKey, SERVICE);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const headers = new Headers({
    "x-amz-content-sha256": input.bodyHash,
    "x-amz-date": full,
    Authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  });
  if (input.contentType) headers.set("Content-Type", input.contentType);
  return headers;
}

async function signedFetch(
  method: "GET" | "HEAD" | "PUT" | "DELETE",
  key: string,
  body?: Uint8Array,
  contentType?: string,
): Promise<Response> {
  const config = requireConfiguration();
  const url = buildObjectUrl(config.endpoint, config.bucket, key);
  const bodyHash = sha256(body ?? new Uint8Array());
  const headers = signHeaders({
    method,
    url,
    bodyHash,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    region: config.region,
    contentType,
  });

  return fetch(url, {
    method,
    headers,
    body: body && method === "PUT" ? body : undefined,
    redirect: "manual",
  });
}

export function getAssetStorageStatus(): AssetStorageStatus {
  const config = readConfiguration();
  return {
    provider: config.provider,
    configured: config.configured,
    endpoint: config.endpointValue,
    bucket: config.bucket,
    region: config.region,
  };
}

export async function putAssetObject(
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<StoredAsset> {
  const response = await signedFetch("PUT", key, bytes, contentType);
  if (!response.ok) throw new Error(`ASSET_STORAGE_PUT_${response.status}`);
  return {
    key,
    contentType,
    size: bytes.byteLength,
    checksumSha256: sha256(bytes),
  };
}

export async function getAssetObject(key: string): Promise<Response> {
  const response = await signedFetch("GET", key);
  if (!response.ok) throw new Error(`ASSET_STORAGE_GET_${response.status}`);
  return response;
}

export async function deleteAssetObject(key: string): Promise<void> {
  const response = await signedFetch("DELETE", key);
  if (!response.ok && response.status !== 404) {
    throw new Error(`ASSET_STORAGE_DELETE_${response.status}`);
  }
}

export async function testAssetStorageConnection(): Promise<boolean> {
  const config = readConfiguration();
  if (!config.configured) return false;
  const key = `.health/${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  const bytes = new TextEncoder().encode("f10-storage-health");
  try {
    await putAssetObject(key, bytes, "text/plain; charset=utf-8");
    await deleteAssetObject(key);
    return true;
  } catch {
    return false;
  }
}
