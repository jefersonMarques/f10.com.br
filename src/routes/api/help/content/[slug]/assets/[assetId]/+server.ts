import { json, type RequestHandler } from "@sveltejs/kit";
import { readManagedHelpAsset } from "$lib/server/help/helpAssetRepository";
import { isAssetPublishedForSlug } from "$lib/server/help/publicStructuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params }) => {
  const slug = params.slug ?? "";
  const assetId = params.assetId ?? "";
  if (!slug || !isUuid(assetId) || !(await isAssetPublishedForSlug(slug, assetId))) {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const { asset, response } = await readManagedHelpAsset(assetId);
    const bytes = await response.arrayBuffer();
    const disposition = asset.assetType === "image" || asset.assetType === "video" ? "inline" : "attachment";
    const safeName = (asset.originalName ?? "arquivo").replace(/[\r\n"\\]/g, "_");
    return new Response(bytes, {
      headers: {
        "Content-Type": asset.mimeType || response.headers.get("content-type") || "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
        "Cache-Control": "public, max-age=3600, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }
};
