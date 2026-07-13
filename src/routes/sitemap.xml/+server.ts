import type { RequestHandler } from "./$types";

const BASE_URL = "https://f10.com.br";

export const prerender = true;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeRoute(path: string): string {
  const route = path
    .replace("../", "/")
    .replace("/+page.svelte", "")
    .replace("/index", "");

  return route || "/";
}

export const GET: RequestHandler = async () => {
  const modules = import.meta.glob("../**/+page.svelte", { eager: true });

  const routes = Object.keys(modules)
    .map(normalizeRoute)
    .filter((route) => !route.startsWith("/api"))
    .filter((route) => !route.includes("["))
    .filter((route, index, allRoutes) => allRoutes.indexOf(route) === index)
    .sort();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((route) => {
    const url = route === "/" ? `${BASE_URL}/` : `${BASE_URL}${route}`;
    return `  <url>
    <loc>${escapeXml(url)}</loc>
  </url>`;
  })
  .join("\n")}
</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
