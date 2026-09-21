import { json, type RequestHandler } from "@sveltejs/kit";
import { getHelpAsset } from "$lib/server/help/helpAssetRepository";
import { createHelpAssetHttpResponse } from "$lib/server/help/helpAssetHttpResponse";
import {
  publicSessionCanReadTrainingAsset,
  trainingSessionCanReadTrainingAsset,
} from "$lib/server/help/helpTrainingAssetAccess";
import {
  getHelpTrainingPublicSessionCookie,
  getHelpTrainingSessionCookie,
} from "$lib/server/help/helpTrainingSession";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, cookies, request }) => {
  const assetId = params.assetId ?? "";
  if (!isUuid(assetId)) return json({ error: "NOT_FOUND" }, { status: 404 });

  const inviteToken = getHelpTrainingSessionCookie(cookies);
  const publicToken = getHelpTrainingPublicSessionCookie(cookies);
  const allowed = (inviteToken && await trainingSessionCanReadTrainingAsset(inviteToken, assetId))
    || (publicToken && await publicSessionCanReadTrainingAsset(publicToken, assetId));
  if (!allowed) return json({ error: inviteToken || publicToken ? "FORBIDDEN" : "UNAUTHORIZED" }, { status: inviteToken || publicToken ? 403 : 401 });

  try {
    const asset = await getHelpAsset(assetId);
    if (!asset?.storageKey) return json({ error: "NOT_FOUND" }, { status: 404 });

    const isCaption = asset.assetType === "file" && asset.mimeType === "text/vtt";
    if (asset.assetType !== "image" && asset.assetType !== "video" && !isCaption) {
      return json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return await createHelpAssetHttpResponse({
      assetId,
      rangeHeader: request.headers.get("range"),
      disposition: "inline",
      cacheControl: "private, max-age=300",
    });
  } catch {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }
};
