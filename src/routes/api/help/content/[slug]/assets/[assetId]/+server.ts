import { json, type RequestHandler } from "@sveltejs/kit";
import { createHelpAssetHttpResponse } from "$lib/server/help/helpAssetHttpResponse";
import { getHelpAsset } from "$lib/server/help/helpAssetRepository";
import { isAssetInHelpContentRelease } from "$lib/server/help/helpContentReleaseRepository";
import {
  getPublishedStructuredHelpBySlug,
  isAssetPublishedForSlug,
} from "$lib/server/help/publicStructuredHelpRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, request, url }) => {
  const slug = params.slug ?? "";
  const assetId = params.assetId ?? "";
  const requestedVersion = Number(url.searchParams.get("versao"));
  let authorized = false;
  if (Number.isInteger(requestedVersion) && requestedVersion > 0) {
    const currentContent = await getPublishedStructuredHelpBySlug(slug);
    authorized = currentContent
      ? await isAssetInHelpContentRelease(currentContent.contentId, requestedVersion, assetId)
      : false;
  } else {
    authorized = await isAssetPublishedForSlug(slug, assetId);
  }
  if (!slug || !isUuid(assetId) || !authorized) {
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