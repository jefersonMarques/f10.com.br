import { json, type RequestHandler } from "@sveltejs/kit";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { updateHelpQuickGuide } from "$lib/server/help/helpQuickGuideRepository";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const POST: RequestHandler = async ({ cookies, params, request }) => {
  if (!isUuid(params.contentId)) return json({ error: "CONTENT_NOT_FOUND" }, { status: 404 });
  const { session } = await requireAppPermission(
    cookies,
    "help.edit",
    `/app/help/content/${params.contentId}`,
  );

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const quickGuide =
    payload && typeof payload === "object" && "quickGuide" in payload && typeof payload.quickGuide === "string"
      ? payload.quickGuide
      : "";
  if (quickGuide.length > 12_000) return json({ error: "QUICK_GUIDE_TOO_LONG" }, { status: 400 });

  try {
    await updateHelpQuickGuide(session.user.id, params.contentId, quickGuide);
    return json({ success: true });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    if (message === "CONTENT_NOT_FOUND") return json({ error: message }, { status: 404 });
    if (message === "CONTENT_ARCHIVED") return json({ error: message }, { status: 409 });
    return json({ error: "QUICK_GUIDE_NOT_SAVED" }, { status: 409 });
  }
};
