import { PassThrough, type Readable } from "node:stream";
import archiver from "archiver";
import { asc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpPublications } from "$lib/server/db/helpPublications";
import { helpMovideskArticles } from "$lib/server/db/helpMovideskSchema";
import {
  helpAssets, helpContentCategories, helpContentFeaturedVideos, helpContentSteps,
  helpContents, helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import { listHelpCollections } from "$lib/server/help/helpCollectionRepository";

// Pacote de análise editorial: não é o ZIP de importação genérico do F10.
// IDs dos ativos são referencias a arquivos JÁ armazenados, não novas URLs para baixar.
export async function createMovideskEditorialExport(): Promise<{
  filename: string;
  stream: Readable;
  editableCount: number;
  referenceCount: number;
}> {
  const db = getDatabase();
  const [originals, publicationRows, categories, collections] = await Promise.all([
    db.select().from(helpMovideskArticles).orderBy(asc(helpMovideskArticles.sourceId)),
    db.select({
      entityId: helpPublications.entityId,
      snapshot: helpPublications.snapshot,
      publishedAt: helpPublications.publishedAt,
    }).from(helpPublications).where(eq(helpPublications.entityType, "content")),
    listHelpCategories(),
    listHelpCollections(),
  ]);

  const publishedIds = new Set(publicationRows.map((row) => row.entityId));
  const articleIds = Array.from(new Set([
    ...originals.flatMap((row) => row.contentId ? [row.contentId] : []),
    ...publicationRows.map((row) => row.entityId),
  ]));
  const contents = articleIds.length
    ? await db.select().from(helpContents).where(inArray(helpContents.id, articleIds))
    : [];
  const nativeIds = contents.map((row) => row.id);
  const [steps, contentCategories, featured] = nativeIds.length
    ? await Promise.all([
      db.select().from(helpContentSteps)
        .where(inArray(helpContentSteps.contentId, nativeIds))
        .orderBy(asc(helpContentSteps.sortOrder)),
      db.select().from(helpContentCategories)
        .where(inArray(helpContentCategories.contentId, nativeIds))
        .orderBy(asc(helpContentCategories.sortOrder)),
      db.select().from(helpContentFeaturedVideos)
        .where(inArray(helpContentFeaturedVideos.contentId, nativeIds)),
    ])
    : [[], [], []];

  const stepIds = steps.map((row) => row.id);
  const blocks = stepIds.length
    ? await db.select().from(helpStepBlocks)
      .where(inArray(helpStepBlocks.stepId, stepIds))
      .orderBy(asc(helpStepBlocks.sortOrder))
    : [];
  const assetIds = Array.from(new Set([
    ...blocks.flatMap((block) => block.assetId ? [block.assetId] : []),
    ...featured.map((row) => row.assetId),
  ]));
  const assets = assetIds.length
    ? await db.select().from(helpAssets).where(inArray(helpAssets.id, assetIds))
    : [];

  const categoryById = new Map(categories.map((row) => [row.id, row]));
  const assetById = new Map(assets.map((row) => [row.id, row]));
  const featuredByContent = new Map(featured.map((row) => [row.contentId, row.assetId]));
  const stepsByContent = new Map<string, typeof steps>();
  const blocksByStep = new Map<string, typeof blocks>();
  const catsByContent = new Map<string, typeof contentCategories>();
  for (const row of steps) {
    const list = stepsByContent.get(row.contentId) ?? [];
    list.push(row);
    stepsByContent.set(row.contentId, list);
  }
  for (const row of blocks) {
    const list = blocksByStep.get(row.stepId) ?? [];
    list.push(row);
    blocksByStep.set(row.stepId, list);
  }
  for (const row of contentCategories) {
    const list = catsByContent.get(row.contentId) ?? [];
    list.push(row);
    catsByContent.set(row.contentId, list);
  }
  const assetRef = (assetId: string | null) => {
    const asset = assetId ? assetById.get(assetId) : null;
    return asset ? {
      id: asset.id,
      type: asset.assetType,
      locallyStored: Boolean(asset.storageKey),
      sourceUrl: asset.sourceUrl,
      // Preservar ID, texto alternativo e metadados. Não substituir pelo endereço antigo.
      altText: asset.altText,
      assistantDescription: asset.assistantDescription,
      subtitles: asset.subtitles,
      assistantSummary: asset.assistantSummary,
      extractedText: asset.extractedText,
    } : null;
  };
  const nativeById = new Map(contents.map((row) => [row.id, row]));
  const nativeContent = (contentId: string) => {
    const row = nativeById.get(contentId);
    if (!row) return null;
    return {
      id: row.id, baseUpdatedAt: row.updatedAt.toISOString(),
      importSource: row.importSource, importExternalId: row.importExternalId,
      status: row.status, contentKind: row.contentKind,
      slug: row.slug, title: row.title, summary: row.summary,
      quickGuide: row.quickGuide, searchAliases: row.searchAliases,
      assistantKnowledge: row.assistantKnowledge,
      internalSupportNotes: row.internalSupportNotes,
      categories: (catsByContent.get(contentId) ?? []).map((item) => ({
        id: item.categoryId, slug: categoryById.get(item.categoryId)?.slug ?? "",
        name: categoryById.get(item.categoryId)?.name ?? "",
        destinationUrl: item.destinationUrl,
      })),
      featuredVideo: assetRef(featuredByContent.get(contentId) ?? null),
      steps: (stepsByContent.get(contentId) ?? []).map((step) => ({
        id: step.id, title: step.title, description: step.description,
        assistantKnowledge: step.assistantKnowledge,
        blocks: (blocksByStep.get(step.id) ?? []).map((block) => ({
          id: block.id, type: block.blockType, text: block.textContent,
          linkUrl: block.linkUrl, linkLabel: block.linkLabel,
          noticeVariant: block.noticeVariant, asset: assetRef(block.assetId),
          metadata: block.metadata,
        })),
      })),
    };
  };
  const editable = originals.map((original) => {
    const content = original.contentId ? nativeContent(original.contentId) : null;
    const canEdit = content?.status === "draft" && !publishedIds.has(original.contentId ?? "");
    return {
      sourceId: original.sourceId,
      contentId: original.contentId,
      eligibility: canEdit ? "editable-draft" : "reference-only",
      needsReview: original.needsReview,
      importIssue: original.issue,
      content,
    };
  });
  const sourceOriginals = originals.map((row) => ({
    sourceId: row.sourceId, title: row.title, slug: row.slug,
    sourceUrl: row.sourceUrl, sourceRevision: row.sourceRevision,
    sourceUpdatedAt: row.sourceUpdatedAt, sourceHtml: row.sourceHtml,
    sourceText: row.sourceText, categories: row.categories,
    attachments: row.attachments,
  }));
  const publishedReferences = publicationRows.map((row) => ({
    contentId: row.entityId,
    publishedAt: row.publishedAt,
    // Usa a versão efetivamente publicada, mesmo se houver edição de rascunho posterior.
    publication: (row.snapshot.public && typeof row.snapshot.public === "object")
      ? row.snapshot.public : row.snapshot,
    importSource: nativeById.get(row.entityId)?.importSource ?? null,
  }));
  const inventory = {
    format: "f10-help-editorial-bundle", version: 1,
    exportedAt: new Date().toISOString(),
    editableDraftCount: editable.filter((row) => row.eligibility === "editable-draft").length,
    originalCount: originals.length, publishedReferenceCount: publishedReferences.length,
    includesBinaryMedia: false,
  };
  const readme = `# Pacote editorial F10

Este ZIP foi gerado pelo servidor F10 para reorganização de artigos com ajuda de IA.
É um **pacote de análise**, não o importador genérico F10 Help Import.

Arquivos:
- inventario.json — quantidade e versão do formato.
- movidesk-originais.json — HTML, texto e categoria de cada artigo original.
- rascunhos-f10.json — conteúdo estruturado atual com IDs de mídias locais e versão-base.
- publicados-referencia.json — snapshots de TODOS os artigos publicados (inclusive gerados por IA), **somente consulta**.
- categorias-colecoes.json — organização atual, útil para propor agrupamentos e ordem.

Regras editoriais:
1. Comparar artigos Movidesk com publicados e identificar sobreposição antes de escrever.
2. Preservar identificadores de origem, IDs de conteúdo, URLs/IDs de ativos existentes e links internos.
3. Nunca alterar os publicados de referência; não publicar automaticamente.
4. Categorizar duplicidades como candidatas à revisão: não apagar nem fundir sem aprovação.
5. Preferir passos curtos, termos consistentes e coleções temáticas ordenadas.
6. Não inventar tutoriais ou transcrições de vídeos sem fonte.
7. Anotar imagens não armazenadas no F10 para correção antes de desligar o Movidesk.

Os arquivos binários de imagens/vídeos não estão incluídos: já estão sob gestão do F10 e
são referenciados por ID. O pacote pode conter conteúdo interno: mantenha-o privado.
A importação do pacote revisado exigirá um mecanismo de aplicação protegido, não o importador comum.
`;
  const output = new PassThrough();
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (cause) => output.destroy(cause));
  archive.pipe(output);
  const addJson = (name: string, data: unknown) =>
    archive.append(JSON.stringify(data, null, 2), { name });
  addJson("inventario.json", inventory);
  addJson("movidesk-originais.json", sourceOriginals);
  addJson("rascunhos-f10.json", editable);
  addJson("publicados-referencia.json", publishedReferences);
  addJson("categorias-colecoes.json", { categories, collections });
  archive.append(readme, { name: "LEIA-ME.md" });
  void archive.finalize().catch((cause: unknown) => {
    output.destroy(cause instanceof Error ? cause : new Error("HELP_EXPORT_ZIP_FAILED"));
  });

  return {
    filename: "f10-revisao-movidesk.zip",
    stream: output,
    editableCount: inventory.editableDraftCount,
    referenceCount: inventory.publishedReferenceCount,
  };
}
