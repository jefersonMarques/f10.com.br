import { eq } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpMovideskArticles } from "$lib/server/db/helpMovideskSchema";
import { getPublicHelpCollectionBySlug } from "$lib/server/help/helpCollectionRepository";
import { getPublishedStructuredHelpById } from "$lib/server/help/publicStructuredHelpRepository";

// Artigos consolidados: não é preciso republicar os duplicados do Movidesk.
const MERGED_ARTICLES = new Map<number, number>([
  [119872, 119846], // Caixas e Bancos — conta para recebimento
]);

const COLLECTION_FALLBACKS = new Map<number, string>([
  [119872, "contas-bancos-conciliacao"],
]);

type LegacyArticleDestination = {
  status: 301 | 302;
  location: string;
};

/**
 * Usado pelo domínio antigo e pelos slugs legados na Central de Ajuda.
 * Resolve sempre pela publicação efetiva, nunca pelo estado de revisão do importador.
 */
export async function resolveMovideskLegacyArticleId(
  sourceId: number,
): Promise<LegacyArticleDestination | null> {
  if (!Number.isSafeInteger(sourceId) || sourceId < 1) return null;

  const db = getDatabase();
  const [source] = await db.select({ sourceId: helpMovideskArticles.sourceId })
    .from(helpMovideskArticles)
    .where(eq(helpMovideskArticles.sourceId, sourceId))
    .limit(1);
  if (!source) return null;

  const canonicalSourceId = MERGED_ARTICLES.get(sourceId) ?? sourceId;
  const [target] = await db.select({ contentId: helpMovideskArticles.contentId })
    .from(helpMovideskArticles)
    .where(eq(helpMovideskArticles.sourceId, canonicalSourceId))
    .limit(1);

  if (target?.contentId) {
    const published = await getPublishedStructuredHelpById(target.contentId);
    if (published) return {
      status: 301,
      location: "/ajuda-f10/" + encodeURIComponent(published.slug),
    };
  }

  // Evita 301 apontando para artigo em rascunho. Apenas equivalências
  // editoriais explícitas podem receber um destino temporário.
  const fallbackSlug = COLLECTION_FALLBACKS.get(sourceId);
  if (!fallbackSlug) return null;
  const collection = await getPublicHelpCollectionBySlug(fallbackSlug);
  return {
    status: 302,
    location: collection
      ? "/ajuda-f10/colecoes/" + encodeURIComponent(collection.slug)
      : "/ajuda-f10",
  };
}

/** Compatibilidade para slugs antigos no próprio f10.com.br. */
export async function resolveMovideskLegacyHelpLink(
  requestedSlug: string,
): Promise<{ status: 302 | 308; location: string } | null> {
  const match = /^[a-z0-9-]+-(\d{5,8})$/.exec(requestedSlug);
  if (!match) return null;
  const destination = await resolveMovideskLegacyArticleId(Number(match[1]));
  return destination ? {
    status: destination.status === 301 ? 308 : 302,
    location: destination.location,
  } : null;
}
