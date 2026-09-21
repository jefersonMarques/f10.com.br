import { json, type RequestHandler } from "@sveltejs/kit";
import { getAssetObjectFromBucket } from "$lib/server/storage/assetStorage";

const RECORDING_BUCKET = "f10-extras";

const RECORDING_KEYS: Record<string, string> = {
  "crm-sdrs": "Gravação CRM - SDR's 2808.mp4",
  "crm-gestao": "Gravação CRM - Gestão 2808.mp4",
  "whatsapp-f10": "WhatsApp no F10.mp4",
};

function copyHeader(source: Headers, target: Headers, name: string): void {
  const value = source.get(name);
  if (value) target.set(name, value);
}

export const GET: RequestHandler = async ({ params, request }) => {
  const objectKey = RECORDING_KEYS[params.video ?? ""];
  if (!objectKey) return json({ error: "NOT_FOUND" }, { status: 404 });

  try {
    const source = await getAssetObjectFromBucket(
      RECORDING_BUCKET,
      objectKey,
      request.headers.get("range") ?? undefined,
    );

    const headers = new Headers({
      "Content-Type": source.headers.get("content-type") || "video/mp4",
      "Accept-Ranges": source.headers.get("accept-ranges") || "bytes",
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    });
    copyHeader(source.headers, headers, "content-length");
    copyHeader(source.headers, headers, "content-range");
    copyHeader(source.headers, headers, "etag");
    copyHeader(source.headers, headers, "last-modified");

    return new Response(source.body, {
      status: source.status,
      headers,
    });
  } catch {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }
};
