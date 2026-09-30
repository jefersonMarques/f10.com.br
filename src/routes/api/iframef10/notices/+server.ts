import { json, type RequestHandler } from "@sveltejs/kit";
import { listActiveIframeF10Notices } from "$lib/server/iframeF10/noticeRepository";
import { getIframeF10VisibilitySettings } from "$lib/server/settings/operationsSettingsRepository";

export const GET: RequestHandler = async () => {
  const visibility = await getIframeF10VisibilitySettings();
  const notices = visibility.notices
    ? await listActiveIframeF10Notices()
    : [];

  return json(notices, {
    headers: {
      "Cache-Control": "public, no-store, max-age=0",
    },
  });
};
