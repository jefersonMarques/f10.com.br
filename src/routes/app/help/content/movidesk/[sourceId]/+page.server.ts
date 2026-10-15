import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { eq } from "drizzle-orm";
import { requireAppPermission } from "$lib/server/auth/authorization";
import { getDatabase } from "$lib/server/db";
import { helpMovideskArticles } from "$lib/server/db/helpMovideskSchema";
import { isMovideskMigrationEnabled } from "$lib/server/help/movideskMigration";

export const load: PageServerLoad = async ({ cookies, params }) => {
  if (!isMovideskMigrationEnabled()) throw error(404, "Ferramenta de migração desativada.");
  await requireAppPermission(cookies, "system.settings.manage", "/app/help/content/movidesk");
  const id = Number(params.sourceId);
  if (!Number.isSafeInteger(id) || id <= 0) throw error(404, "Artigo não encontrado.");
  const [article] = await getDatabase().select().from(helpMovideskArticles)
    .where(eq(helpMovideskArticles.sourceId, id)).limit(1);
  if (!article) throw error(404, "Artigo não encontrado.");
  return {
    article: {
      sourceId: article.sourceId,
      title: article.title,
      sourceUrl: article.sourceUrl,
      sourceText: article.sourceText,
      sourceHtml: article.sourceHtml,
      attachments: article.attachments,
      categories: article.categories,
      contentId: article.contentId,
      issue: article.issue,
      importedAt: article.importedAt,
    },
  };
};
