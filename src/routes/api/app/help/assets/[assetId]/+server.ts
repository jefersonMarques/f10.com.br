import { json, type RequestHandler } from "@sveltejs/kit";
import { resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { getHelpAsset } from "$lib/server/help/helpAssetRepository";
import { createHelpAssetHttpResponse } from "$lib/server/help/helpAssetHttpResponse";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function supportsInlinePreview(assetType: string, mimeType: string | null): boolean {
  if (assetType === "image" || assetType === "video") return true;
  return ["application/pdf", "text/plain", "text/csv", "text/vtt"].includes(mimeType ?? "");
}

export const GET: RequestHandler = async ({ params, cookies, url, request }) => {
  const assetId = params.assetId ?? "";
  if (!isUuid(assetId)) return json({ error: "NOT_FOUND" }, { status: 404 });

  const token = cookies.get(SESSION_COOKIE_NAME);
  const session = token ? await getSessionUser(token) : null;
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });
  const permissions = await resolveUserPermissions(session.user.id);
  if (!permissions.has("help.view")) return json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const asset = await getHelpAsset(assetId);
    if (!asset) return json({ error: "NOT_FOUND" }, { status: 404 });
    const previewRequested = url.searchParams.get("preview") === "1";
    const disposition = previewRequested && supportsInlinePreview(asset.assetType, asset.mimeType)
      ? "inline"
      : asset.assetType === "image" || asset.assetType === "video" || asset.mimeType === "text/vtt"
        ? "inline"
        : "attachment";

    return await createHelpAssetHttpResponse({
      assetId,
      rangeHeader: request.headers.get("range"),
      disposition,
      cacheControl: "private, max-age=300",
    });
  } catch {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }
};