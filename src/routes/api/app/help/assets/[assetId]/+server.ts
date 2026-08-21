import { json, type RequestHandler } from "@sveltejs/kit";
import { resolveUserPermissions } from "$lib/server/auth/permissions";
import { getSessionUser, SESSION_COOKIE_NAME } from "$lib/server/auth/session";
import { readManagedHelpAsset } from "$lib/server/help/helpAssetRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const GET: RequestHandler = async ({ params, cookies }) => {
  const assetId = params.assetId ?? "";
  if (!isUuid(assetId)) return json({ error: "NOT_FOUND" }, { status: 404 });

  const token = cookies.get(SESSION_COOKIE_NAME);
  const session = token ? await getSessionUser(token) : null;
  if (!session) return json({ error: "UNAUTHORIZED" }, { status: 401 });
  const permissions = await resolveUserPermissions(session.user.id);
  if (!permissions.has("help.view")) return json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    const { asset, response } = await readManagedHelpAsset(assetId);
    const bytes = await response.arrayBuffer();
    const disposition = asset.assetType === "image" || asset.assetType === "video" || asset.mimeType === "text/vtt" ? "inline" : "attachment";
    const safeName = (asset.originalName ?? "arquivo").replace(/[\r\n"\\]/g, "_");
    return new Response(bytes, {
      headers: {
        "Content-Type": asset.mimeType || response.headers.get("content-type") || "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `${disposition}; filename="${safeName}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }
};
