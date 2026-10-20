import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpMovideskArticles } from "$lib/server/db/helpMovideskSchema";
import { getPublicHelpCollectionBySlug } from "$lib/server/help/helpCollectionRepository";
import { getPublishedStructuredHelpById } from "$lib/server/help/publicStructuredHelpRepository";

// Artigos consolidados: o legado continua navegável sem publicar o duplicado.
const MERGED_ARTICLES = new Map<number, number>([
  [119872, 119846], // Caixas e Bancos — conta para recebimento
]);

const COLLECTION_FALLBACKS = new Map<number, string>([
  [119872, "contas-bancos-conciliacao"],
]);

/**
 * Resolve URLs antigas /ajuda-f10/titulo-119872 sem alterar os slugs novos.
 * Redirecionamento permanente só quando o artigo de destino está publicado.
 */
export async function resolveMovideskLegacyHelpLink(
  requestedSlug: string,
): Promise<{ status: 302 | 308; location: string } | null> {
  const match = /^[a-z0-9-]+-(\d{5,8})$/.exec(requestedSlug);
  if (!match) return null;
  const sourceId = Number(match[1]);
  if (!Number.isSafeInteger(sourceId)) return null;

  const db = getDatabase();
  const [source] = await db.select({ id: helpMovideskArticles.sourceId })
    .from(helpMovideskArticles)
    .where(eq(helpMovideskArticles.sourceId, sourceId))
    .limit(1);
  if (!source) return null;

  const targetSourceId = MERGED_ARTICLES.get(sourceId) ?? sourceId;
  const [target] = await db.select({ contentId: helpMovideskArticles.contentId })
    .from(helpMovideskArticles)
    .where(eq(helpMovideskArticles.sourceId, targetSourceId))
    .limit(1);

  if (target?.contentId) {
    const published = await getPublishedStructuredHelpById(target.contentId);
    if (published) return {
      status: 308,
      location: `/ajuda-f10/${encodeURIComponent(published.slug)}`,
    };
  }

  // Um duplicado retirado do catálogo não deve ficar apontando para um 404
  // enquanto seu conteúdo consolidado ainda está em revisão.
  const fallback = COLLECTION_FALLBACKS.get(sourceId);
  if (!fallback) return null;
  const collection = await getPublicHelpCollectionBySlug(fallback);
  return {
    status: 302,
    location: collection
      ? `/ajuda-f10/colecoes/${encodeURIComponent(collection.slug)}`
      : "/ajuda-f10",
  };
}
