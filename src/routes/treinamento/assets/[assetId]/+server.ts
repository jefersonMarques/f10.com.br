import { json, type RequestHandler } from "@sveltejs/kit";
import { readManagedHelpAsset } from "$lib/server/help/helpAssetRepository";
import { trainingSessionCanReadAsset } from "$lib/server/help/helpTrainingRepository";
import { getHelpTrainingSessionCookie } from "$lib/server/help/helpTrainingSession";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const assetId = params.assetId ?? "";
  if (!isUuid(assetId)) return json({ error: "NOT_FOUND" }, { status: 404 });
  const token = getHelpTrainingSessionCookie(cookies);
  if (!token) return json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!(await trainingSessionCanReadAsset(token, assetId))) {
    return json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const { asset, response } = await readManagedHelpAsset(assetId);
    if (asset.assetType !== "image") return json({ error: "NOT_FOUND" }, { status: 404 });
    const bytes = await response.arrayBuffer();
    const safeName = (asset.originalName ?? "imagem").replace(/[\r\n"\\]/g, "_");
    return new Response(bytes, {
      headers: {
        "Content-Type": asset.mimeType || response.headers.get("content-type") || "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }
};
