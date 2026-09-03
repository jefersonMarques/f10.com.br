import { json, type RequestHandler } from "@sveltejs/kit";
import { getHelpPresentation } from "$lib/server/help/helpPresentation";

export const GET: RequestHandler = async ({ params }) => {
  const slug = (params.slug ?? "").trim().slice(0, 160);
  if (!slug) return json({ error: "INVALID_SLUG" }, { status: 400 });

  const presentation = await getHelpPresentation(slug);
  if (!presentation) return json({ error: "ARTICLE_NOT_FOUND" }, { status: 404 });

  return json(presentation, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
};
