import { and, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpContents } from "$lib/server/db/structuredHelpSchema";
import { normalizeHelpSlug } from "$lib/server/help/helpArticleRepository";
import type { HelpImportFile } from "$lib/server/help/structuredHelpImport";

export async function stabilizeHelpImportIdentity(file: HelpImportFile): Promise<HelpImportFile> {
  const normalizedSlugs = Array.from(
    new Set(
      file.contents
        .map((content) => normalizeHelpSlug(content.slug || content.title))
        .filter(Boolean),
    ),
  );
  if (normalizedSlugs.length === 0) return file;

  const rows = await getDatabase()
    .select({
      slug: helpContents.slug,
      importExternalId: helpContents.importExternalId,
    })
    .from(helpContents)
    .where(
      and(
        eq(helpContents.importSource, file.source),
        inArray(helpContents.slug, normalizedSlugs),
      ),
    );

  const externalIdBySlug = new Map(
    rows.flatMap((row) => row.importExternalId ? [[row.slug, row.importExternalId] as const] : []),
  );
  if (externalIdBySlug.size === 0) return file;

  return {
    ...file,
    contents: file.contents.map((content) => {
      const slug = normalizeHelpSlug(content.slug || content.title);
      const existingExternalId = externalIdBySlug.get(slug);
      return existingExternalId && existingExternalId !== content.externalId
        ? { ...content, externalId: existingExternalId }
        : content;
    }),
  };
}