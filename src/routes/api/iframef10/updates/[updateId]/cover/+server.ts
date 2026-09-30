import { json, type RequestHandler } from "@sveltejs/kit";
import { readIframeF10UpdateCover } from "$lib/server/iframeF10/updateRepository";

export const GET: RequestHandler = async ({ params }) => {
  const updateId = params.updateId ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updateId)) {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }

  try {
    const response = await readIframeF10UpdateCover(updateId);
    return response ?? json({ error: "NOT_FOUND" }, { status: 404 });
  } catch {
    return json({ error: "NOT_FOUND" }, { status: 404 });
  }
};
