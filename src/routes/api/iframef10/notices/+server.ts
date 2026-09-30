import { json, type RequestHandler } from "@sveltejs/kit";
import { listActiveIframeF10Notices } from "$lib/server/iframeF10/noticeRepository";

export const GET: RequestHandler = async () => {
  return json(await listActiveIframeF10Notices(), {
    headers: {
      "Cache-Control": "public, no-store, max-age=0",
    },
  });
};
