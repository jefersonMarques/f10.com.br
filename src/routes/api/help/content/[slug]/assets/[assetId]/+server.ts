import { json, type RequestHandler } from "@sveltejs/kit";
import { createHelpAssetHttpResponse } from "$lib/server/help/helpAssetHttpResponse";
import { getHelpAsset } from "$lib/server/help/helpAssetRepository";
import { isAssetPublishedForSlug } from "$lib/server/help/publicStructuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, request }) => {
  const slug = params.slug ?? "";
  const assetId = params.assetId ?? "";
  if (!slug || !isUuid(assetId) || !(await isAssetPublishedForSlug(slug, assetId))) {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const asset = await getHelpAsset(assetId);
    if (!asset) return json({ error: "NOT_FOUND" }, { status: 404 });
    return await createHelpAssetHttpResponse({
      assetId,
      rangeHeader: request.headers.get("range"),
      disposition: asset.assetType === "image" || asset.assetType === "video" ? "inline" : "attachment",
      cacheControl: "public, max-age=3600, immutable",
    });
  } catch {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }
};