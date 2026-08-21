import { json, type RequestHandler } from "@sveltejs/kit";
import { readManagedHelpAsset } from "$lib/server/help/helpAssetRepository";
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

export const GET: RequestHandler = async ({ params, cookies }) => {
  const assetId = params.assetId ?? "";
  if (!isUuid(assetId)) return json({ error: "NOT_FOUND" }, { status: 404 });

  const inviteToken = getHelpTrainingSessionCookie(cookies);
  const publicToken = getHelpTrainingPublicSessionCookie(cookies);
  const allowed = (inviteToken && await trainingSessionCanReadTrainingAsset(inviteToken, assetId))
    || (publicToken && await publicSessionCanReadTrainingAsset(publicToken, assetId));
  if (!allowed) return json({ error: inviteToken || publicToken ? "FORBIDDEN" : "UNAUTHORIZED" }, { status: inviteToken || publicToken ? 403 : 401 });

  try {
    const { asset, response } = await readManagedHelpAsset(assetId);
    if (asset.assetType !== "image" && asset.assetType !== "video") {
      return json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const bytes = await response.arrayBuffer();
    const safeName = (asset.originalName ?? (asset.assetType === "video" ? "demonstracao.mp4" : "imagem")).replace(/[\r\n"\\]/g, "_");
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
