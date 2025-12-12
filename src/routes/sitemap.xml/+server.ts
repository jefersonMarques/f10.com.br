// src/routes/sitemap.xml/+server.ts
import type { RequestHandler } from "./$types";

const BASE_URL = "https://f10.com.br"; // troca se estiver usando outro domínio

// se quiser que o sitemap seja gerado no build (adapter-static):
export const prerender = true;

export const GET: RequestHandler = async () => {
  // Pega todos os +page.svelte (menos /api, porque não tem page lá mesmo)
  const modules = import.meta.glob("../**/+page.svelte", { eager: true });

  const now = new Date().toISOString();

  const routes = Object.keys(modules)
    .map((path) => {
      // "../+page.svelte"           -> "/"
      // "../contato/+page.svelte"   -> "/contato"
      // "../solucoes/+page.svelte"  -> "/solucoes"
      let route = path
        .replace("../", "/") // "../contato/+page.svelte" -> "/contato/+page.svelte"
        .replace("/+page.svelte", "") // "/contato/+page.svelte" -> "/contato"
        .replace("/index", ""); // se algum dia tiver /index/+page.svelte

      if (route === "") route = "/";

      return route;
    })
    // garante que não vai nada estranho
    .filter((route) => !route.startsWith("/api"))
    // remove duplicados só por garantia
    .filter((route, index, self) => self.indexOf(route) === index)
    .sort();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map((route) => {
    const priority = route === "/" ? "1.0" : "0.8";
    return `  <url>
    <loc>${BASE_URL}${route}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n")}
</urlset>`.trim();

  return new Response(sitemap, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
};
