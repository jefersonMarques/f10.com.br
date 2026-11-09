import { createHash, createHmac } from "node:crypto";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function hmac(key, message) {
  return createHmac("sha256", key).update(message).digest();
}

function encodedPath(value) {
  return value.split("/").map(encodeURIComponent).join("/");
}

function getConfiguration() {
  const config = {
    endpoint: process.env.S3_ENDPOINT?.trim(),
    bucket: process.env.S3_BUCKET?.trim(),
    region: process.env.S3_REGION?.trim() || "us-east-1",
    accessKey: process.env.S3_ACCESS_KEY?.trim(),
    secretKey: process.env.S3_SECRET_KEY?.trim(),
  };
  if (process.env.ASSET_STORAGE !== "s3" ||
      !config.endpoint || !config.bucket || !config.accessKey || !config.secretKey) {
    throw new Error("ASSET_STORAGE_NOT_CONFIGURED");
  }
  const endpoint = new URL(config.endpoint);
  const hostname = endpoint.hostname.toLowerCase();
  const ipv4 = hostname.match(/^([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})[.]([0-9]{1,3})$/);
  const octets = ipv4?.slice(1).map(Number);
  const privateIpv4 = octets?.every((value) => value <= 255) &&
    (octets[0] === 10 ||
      octets[0] === 127 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168));
  const localHostname = hostname === "localhost" || hostname === "[::1]" ||
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(hostname);
  const localHttp = endpoint.protocol === "http:" && (privateIpv4 || localHostname);

  if ((endpoint.protocol !== "https:" && !localHttp) ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error("INVALID_STORAGE_ENDPOINT");
  }
  return { ...config, endpoint };
}

export async function putStoredObject(key, bytes, contentType) {
  const config = getConfiguration();
  const url = new URL(config.endpoint);
  const basePath = url.pathname.replace(/\/$/, "");
  url.pathname = (basePath + "/" + encodedPath(config.bucket) + "/" + encodedPath(key))
    .replace(/\/+/g, "/");
  url.search = "";
  url.hash = "";

  const isoDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = isoDate.slice(0, 8);
  const bodyHash = sha256(bytes);
  const headers = [
    ["content-type", contentType],
    ["host", url.host],
    ["x-amz-content-sha256", bodyHash],
    ["x-amz-date", isoDate],
  ].sort(([left], [right]) => left.localeCompare(right));
  const canonicalHeaders = headers.map(([keyName, value]) => keyName + ":" + value + "\n").join("");
  const signedHeaders = headers.map(([keyName]) => keyName).join(";");
  const scope = date + "/" + config.region + "/s3/aws4_request";
  const canonicalRequest = [
    "PUT", url.pathname, "", canonicalHeaders, signedHeaders, bodyHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256", isoDate, scope, sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmac("AWS4" + config.secretKey, date);
  const regionKey = hmac(dateKey, config.region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const signed = new Headers();
  signed.set("Content-Type", contentType);
  signed.set("x-amz-content-sha256", bodyHash);
  signed.set("x-amz-date", isoDate);
  signed.set(
    "Authorization",
    "AWS4-HMAC-SHA256 Credential=" + config.accessKey + "/" + scope +
      ", SignedHeaders=" + signedHeaders + ", Signature=" + signature,
  );

  const response = await fetch(url, {
    method: "PUT",
    headers: signed,
    body: bytes,
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error("ASSET_STORAGE_PUT_" + response.status);
  return { key, size: bytes.byteLength, checksumSha256: bodyHash };
}
