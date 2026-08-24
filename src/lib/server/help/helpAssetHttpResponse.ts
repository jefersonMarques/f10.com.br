import { getHelpAsset } from "$lib/server/help/helpAssetRepository";
import { getAssetObject } from "$lib/server/storage/assetStorage";

const SINGLE_BYTE_RANGE = /^bytes=(?:\d+-\d*|-\d+)$/i;

function normalizedRange(value: string | null): string | undefined {
  const range = value?.trim() ?? "";
  return SINGLE_BYTE_RANGE.test(range) ? range : undefined;
}

function safeFileName(value: string | null): string {
  return (value ?? "arquivo").replace(/[\r\n"\\]/g, "_");
}

export async function createHelpAssetHttpResponse(input: {
  assetId: string;
  rangeHeader: string | null;
  disposition: "inline" | "attachment";
  cacheControl: string;
}): Promise<Response> {
  const asset = await getHelpAsset(input.assetId);
  if (!asset || !asset.storageKey) throw new Error("ASSET_NOT_FOUND");

  const requestedRange = normalizedRange(input.rangeHeader);
  if (input.rangeHeader && !requestedRange) {
    return new Response(null, {
      status: 416,
      headers: {
        "Accept-Ranges": "bytes",
        ...(asset.sizeBytes ? { "Content-Range": `bytes */${asset.sizeBytes}` } : {}),
      },
    });
  }

  const source = await getAssetObject(asset.storageKey, requestedRange);
  const headers = new Headers({
    "Content-Type": asset.mimeType || source.headers.get("content-type") || "application/octet-stream",
    "Content-Disposition": `${input.disposition}; filename="${safeFileName(asset.originalName)}"`,
    "Cache-Control": input.cacheControl,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  });

  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = source.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (source.status === 416) {
    if (!headers.has("Content-Range") && asset.sizeBytes) {
      headers.set("Content-Range", `bytes */${asset.sizeBytes}`);
    }
    return new Response(null, { status: 416, headers });
  }

  return new Response(source.body, {
    status: source.status,
    headers,
  });
}