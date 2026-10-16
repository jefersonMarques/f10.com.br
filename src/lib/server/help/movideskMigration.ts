import { env } from "$env/dynamic/private";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpMovideskArticles, helpMovideskImportState } from "$lib/server/db/helpMovideskSchema";
import { helpAssets, helpCategories, helpContents, helpContentReleases, helpContentSteps, helpStepBlocks } from "$lib/server/db/structuredHelpSchema";
import { listPublishedStructuredHelpLinks } from "$lib/server/help/publicStructuredHelpRepository";
import { helpPublications } from "$lib/server/db/helpPublications";
import { normalizeHelpCategorySlug, createHelpCategory, listHelpCategories } from "$lib/server/help/helpCategoryRepository";
import { normalizeHelpSlug } from "$lib/server/help/helpArticleRepository";
import { importStructuredHelpFile, type HelpImportFile } from "$lib/server/help/structuredHelpImport";
import { convertMovideskHtml } from "$lib/server/help/movideskHtmlConverter";
import { downloadMovideskMp4 } from "$lib/server/help/movideskVideoMirror";
import { attachImportedMp4AsFeaturedVideo } from "$lib/server/help/helpImportedFeaturedVideo";
import { saveStructuredContentVersion, upsertStructuredHelpFeaturedVideo } from "$lib/server/help/structuredHelpRepository";
import { getPublishedStructuredHelpById } from "$lib/server/help/publicStructuredHelpRepository";

const BASE = "https://api.movidesk.com/public/v1";
const INTERVAL_MS = 8_000;
const REQUEST_LEASE_MS = 10 * 60_000;
const PAGE_SIZE = 40;

type SourceRecord = Record<string, unknown>;
type Category = { id: number | null; name: string };
type Attachment = { id: number | null; name: string; hash?: string };

export function isMovideskMigrationEnabled(): boolean {
  return env.F10_MOVIDESK_MIGRATION_ENABLED?.trim() === "true";
}

export function isMovideskTokenConfigured(): boolean {
  return Boolean(env.MOVIDESK_KB_API_TOKEN?.trim());
}

function record(value: unknown): SourceRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as SourceRecord : {};
}
function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
function numeric(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}
function date(value: unknown): Date | null {
  const d = new Date(text(value));
  return Number.isFinite(d.getTime()) ? d : null;
}
function categories(value: unknown): Category[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const v = typeof item === "string" ? { name: item } : record(item);
    const name = text(v.name).slice(0, 160);
    return name ? [{ id: numeric(v.id), name }] : [];
  }).slice(0, 30);
}
function attachments(value: unknown): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const v = record(item);
    const name = text(v.name).slice(0, 240);
    return name ? [{ id: numeric(v.id), name, hash: text(v.hash).slice(0, 80) }] : [];
  }).slice(0, 50);
}
function sourceUrl(id: number, slug: string): string {
  return `https://ajuda.f10.com.br/kb/pt-br/article/${id}/${normalizeHelpSlug(slug) || "artigo"}`;
}
function errorMessage(cause: unknown): string {
  if (!(cause instanceof Error)) return "Falha inesperada na migração.";
  if (cause.message.startsWith("MOVIDESK_")) return cause.message;
  return "Não foi possível concluir a operação. Confira os registros do servidor.";
}

async function callApi(path: string): Promise<SourceRecord> {
  const token = env.MOVIDESK_KB_API_TOKEN?.trim().replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("MOVIDESK_TOKEN_MISSING");

  const url = new URL(`${BASE}${path}`);
  url.searchParams.set("token", token);
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(25_000),
    redirect: "manual",
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(response.status === 401
      ? "MOVIDESK_API_AUTH_REJECTED"
      : `MOVIDESK_API_HTTP_${response.status}`);
  }
  const payload = await response.json() as unknown;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("MOVIDESK_INVALID_RESPONSE");
  }
  return record(payload);
}

async function getMovideskArticle(sourceId: number): Promise<SourceRecord> {
  try {
    return await callApi(`/article/${sourceId}`);
  } catch (cause) {
    // A documentação Movidesk apresenta também a variante /article/:id/kb.
    if (!(cause instanceof Error) || cause.message !== "MOVIDESK_API_HTTP_404") throw cause;
    // A API limita a 10 requisições/minuto, inclusive nas tentativas de fallback.
    await new Promise<void>((resolve) => setTimeout(resolve, INTERVAL_MS));
    return callApi(`/article/${sourceId}/kb`);
  }
}

async function ensureState() {
  await getDatabase().insert(helpMovideskImportState).values({ id: 1 }).onConflictDoNothing();
}

export async function startMovideskCatalogSync(actorUserId: string): Promise<void> {
  if (!isMovideskMigrationEnabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  if (!isMovideskTokenConfigured()) throw new Error("MOVIDESK_TOKEN_MISSING");
  await ensureState();
  await getDatabase().update(helpMovideskImportState).set({
    enabled: true, phase: "catalog", nextPage: 0, totalCount: null,
    startedBy: actorUserId, lastError: null,
    nextRequestAt: new Date(), updatedAt: new Date(),
  }).where(eq(helpMovideskImportState.id, 1));
}

export async function setMovideskMigrationRunning(running: boolean): Promise<void> {
  if (!isMovideskMigrationEnabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  if (running && !isMovideskTokenConfigured()) throw new Error("MOVIDESK_TOKEN_MISSING");
  await ensureState();
  await getDatabase().update(helpMovideskImportState).set({
    enabled: running, nextRequestAt: new Date(), lastError: null, updatedAt: new Date(),
  }).where(eq(helpMovideskImportState.id, 1));
}

export async function retryFailedMovideskArticles(actorUserId: string): Promise<void> {
  await ensureState();
  await getDatabase().update(helpMovideskArticles).set({
    state: "discovered", issue: null, updatedAt: new Date(),
  }).where(eq(helpMovideskArticles.state, "failed"));
  await getDatabase().update(helpMovideskImportState).set({
    phase: "details", enabled: true, lastError: null, startedBy: actorUserId,
    nextRequestAt: new Date(), updatedAt: new Date(),
  }).where(eq(helpMovideskImportState.id, 1));
}

async function safeToReplaceMovideskDraft(
  contentId: string,
  importedAt: Date | null,
  needsReview: boolean,
): Promise<boolean> {
  if (!importedAt || !needsReview) return false;
  const db = getDatabase();
  const [[content], [publication], [release]] = await Promise.all([
    db.select({
      id: helpContents.id, status: helpContents.status,
      updatedAt: helpContents.updatedAt, importSource: helpContents.importSource,
    }).from(helpContents).where(eq(helpContents.id, contentId)).limit(1),
    db.select({ id: helpPublications.entityId }).from(helpPublications).where(and(
      eq(helpPublications.entityType, "content"),
      eq(helpPublications.entityId, contentId),
    )).limit(1),
    db.select({ id: helpContentReleases.id }).from(helpContentReleases)
      .where(eq(helpContentReleases.contentId, contentId)).limit(1),
  ]);
  return Boolean(content?.importSource === "movidesk" && content.status === "draft"
    && content.updatedAt <= importedAt && !publication && !release);
}

export async function reprocessMovideskArticles(actorUserId: string) {
  if (!isMovideskMigrationEnabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  if (!isMovideskTokenConfigured()) throw new Error("MOVIDESK_TOKEN_MISSING");
  const db = getDatabase();
  const rows = await db.select({
    sourceId: helpMovideskArticles.sourceId,
    contentId: helpMovideskArticles.contentId,
    importedAt: helpMovideskArticles.importedAt,
    needsReview: helpMovideskArticles.needsReview,
  }).from(helpMovideskArticles);
  const contentIds = rows.flatMap(row => row.contentId ? [row.contentId] : []);
  const [nativeRows, publishedRows, releases] = contentIds.length ? await Promise.all([
    db.select({
      id: helpContents.id, updatedAt: helpContents.updatedAt,
      status: helpContents.status, importSource: helpContents.importSource,
    }).from(helpContents).where(inArray(helpContents.id, contentIds)),
    db.select({ id: helpPublications.entityId }).from(helpPublications).where(and(
      eq(helpPublications.entityType, "content"),
      inArray(helpPublications.entityId, contentIds),
    )),
    db.select({ id: helpContentReleases.contentId }).from(helpContentReleases)
      .where(inArray(helpContentReleases.contentId, contentIds)),
  ]) : [[], [], []];
  const natives = new Map(nativeRows.map(row => [row.id, row]));
  const published = new Set(publishedRows.map(row => row.id));
  const released = new Set(releases.map(row => row.id));
  const selected = rows.filter(row => {
    if (!row.contentId) return true;
    const native = natives.get(row.contentId);
    return Boolean(row.needsReview && row.importedAt && native
      && native.importSource === "movidesk" && native.status === "draft"
      && native.updatedAt <= row.importedAt
      && !published.has(row.contentId) && !released.has(row.contentId));
  }).map(row => row.sourceId);
  if (selected.length === 0) return { queued: 0, skipped: rows.length };

  await db.transaction(async (tx) => {
    const [state] = await tx.select().from(helpMovideskImportState)
      .where(eq(helpMovideskImportState.id, 1)).for("update").limit(1);
    if (!state || state.enabled || (state.phase !== "done" && state.phase !== "details")) {
      throw new Error("MOVIDESK_REPROCESS_BUSY");
    }
    await tx.update(helpMovideskArticles).set({
      state: "discovered", issue: null, needsReview: true, updatedAt: new Date(),
    }).where(inArray(helpMovideskArticles.sourceId, selected));
    await tx.update(helpMovideskImportState).set({
      phase: "details", enabled: true, startedBy: actorUserId,
      lastError: null, nextRequestAt: new Date(), updatedAt: new Date(),
    }).where(eq(helpMovideskImportState.id, 1));
  });
  return { queued: selected.length, skipped: rows.length - selected.length };
}

export async function getMovideskArticleByContentId(contentId: string) {
  const [article] = await getDatabase().select({
    sourceId: helpMovideskArticles.sourceId,
    sourceUrl: helpMovideskArticles.sourceUrl,
    needsReview: helpMovideskArticles.needsReview,
    issue: helpMovideskArticles.issue,
  }).from(helpMovideskArticles).where(eq(helpMovideskArticles.contentId, contentId)).limit(1);
  return article ?? null;
}

export async function approveMovideskArticle(sourceId: number): Promise<void> {
  const db = getDatabase();
  const [article] = await db.select({
    contentId: helpMovideskArticles.contentId,
    sourceHtml: helpMovideskArticles.sourceHtml,
    state: helpMovideskArticles.state,
  }).from(helpMovideskArticles)
    .where(eq(helpMovideskArticles.sourceId, sourceId)).limit(1);
  if (!article?.contentId || !["imported", "review"].includes(article.state)) {
    throw new Error("MOVIDESK_ARTICLE_NOT_IMPORTED");
  }

  const originalCount = (article.sourceHtml?.match(/<img\b/gi) ?? []).length;
  const images = await db.select({ storageKey: helpAssets.storageKey })
    .from(helpStepBlocks)
    .innerJoin(helpContentSteps, eq(helpContentSteps.id, helpStepBlocks.stepId))
    .leftJoin(helpAssets, eq(helpAssets.id, helpStepBlocks.assetId))
    .where(and(
      eq(helpContentSteps.contentId, article.contentId),
      eq(helpStepBlocks.blockType, "image"),
    ));
  const locallyStored = images.filter((image) => Boolean(image.storageKey)).length;

  // Nenhuma aprovação com imagem dependente de servidores externos do Movidesk/S3.
  // A contagem original também detecta imagens descartadas por limites do conversor.
  if (locallyStored < originalCount || images.some((image) => !image.storageKey)) {
    throw new Error(`MOVIDESK_IMAGES_PENDING:${locallyStored}:${originalCount}`);
  }

  await db.update(helpMovideskArticles).set({
    needsReview: false, issue: null, updatedAt: new Date(),
  }).where(and(
    eq(helpMovideskArticles.sourceId, sourceId),
    inArray(helpMovideskArticles.state, ["imported", "review"]),
  ));
}

export async function listMovideskMigrationDashboard() {
  await ensureState();
  const [state] = await getDatabase().select().from(helpMovideskImportState).where(eq(helpMovideskImportState.id, 1)).limit(1);
  const rows = await getDatabase().select({
    sourceId: helpMovideskArticles.sourceId,
    title: helpMovideskArticles.title,
    sourceUrl: helpMovideskArticles.sourceUrl,
    sourceRevision: helpMovideskArticles.sourceRevision,
    contentId: helpMovideskArticles.contentId,
    state: helpMovideskArticles.state,
    needsReview: helpMovideskArticles.needsReview,
    issue: helpMovideskArticles.issue,
    categories: helpMovideskArticles.categories,
  }).from(helpMovideskArticles)
    .orderBy(asc(helpMovideskArticles.sourceId))
    .limit(1000);
  const contentIds = rows.flatMap((row) => row.contentId ? [row.contentId] : []);
  const storedImages = contentIds.length ? await getDatabase().select({
    contentId: helpContentSteps.contentId,
    storageKey: helpAssets.storageKey,
  }).from(helpStepBlocks)
    .innerJoin(helpContentSteps, eq(helpContentSteps.id, helpStepBlocks.stepId))
    .leftJoin(helpAssets, eq(helpAssets.id, helpStepBlocks.assetId))
    .where(and(
      inArray(helpContentSteps.contentId, contentIds),
      eq(helpStepBlocks.blockType, "image"),
    )) : [];
  const imagesByContent = new Map<string, { total: number; stored: number }>();
  for (const asset of storedImages) {
    if (!asset.contentId) continue;
    const count = imagesByContent.get(asset.contentId) ?? { total: 0, stored: 0 };
    count.total++;
    if (asset.storageKey) count.stored++;
    imagesByContent.set(asset.contentId, count);
  }
  // help_publications.entity_id é TEXT e help_movidesk_articles.content_id é UUID.
  // Cruzar os IDs em memória evita uma comparação SQL inválida (text = uuid).
  const publishedById = new Map(
    (await listPublishedStructuredHelpLinks()).map((item) => [item.entityId, item.slug]),
  );
  const articles = rows.map((row) => ({
    ...row,
    published: Boolean(row.contentId && publishedById.has(row.contentId)),
    publishedSlug: row.contentId ? (publishedById.get(row.contentId) ?? null) : null,
    imageStats: row.contentId ? (imagesByContent.get(row.contentId) ?? { total: 0, stored: 0 }) : null,
  }));
  return {
    state,
    total: articles.length,
    imported: articles.filter(r => Boolean(r.contentId)).length,
    published: articles.filter(r => r.published).length,
    pending: articles.filter(r => r.state === "discovered").length,
    failed: articles.filter(r => r.state === "failed").length,
    review: articles.filter(r => r.needsReview && Boolean(r.contentId)).length,
    articles,
  };
}

async function ensureCategories(actorUserId: string, original: Category[]): Promise<string[]> {
  const names = original.length ? original : [{ id: null, name: "Movidesk - Sem categoria" }];
  const known = await listHelpCategories();
  const selected: string[] = [];
  for (const category of names.slice(0, 12)) {
    const plainSlug = normalizeHelpCategorySlug(category.name);
    if (!plainSlug) continue;
    const found = known.find(x => x.active && x.slug === plainSlug);
    if (found) { selected.push(found.slug); continue; }
    const slug = `movidesk-${category.id ?? "outros"}-${plainSlug}`.slice(0, 100);
    const existing = known.find(x => x.slug === slug);
    if (existing?.active) { selected.push(existing.slug); continue; }
    if (existing && !existing.active) throw new Error("MOVIDESK_CATEGORY_INACTIVE");
    await createHelpCategory(actorUserId, {
      name: category.name, slug, description: "Importada do Movidesk",
      icon: "folder", destinationUrl: "", sortOrder: 500,
    });
    known.push({ id: "", slug, name: category.name, active: true, description: "", icon: "folder", destinationUrl: "", sortOrder: 500 });
    selected.push(slug);
  }
  return selected.length ? selected : await ensureCategories(actorUserId, [{ id: null, name: "Movidesk - Sem categoria" }]);
}

async function catalogPage(page: number): Promise<{ totalCount: number; finished: boolean }> {
  const data = await callApi(`/kb/article?status=1&page=${page}&pageSize=${PAGE_SIZE}`);
  if (!Array.isArray(data.items)) throw new Error("MOVIDESK_CATALOG_INVALID");
  const items = data.items.map(record);
  const totalCount = Number(data.totalSize ?? 0);
  const db = getDatabase();
  for (const raw of items) {
    const id = numeric(raw.id);
    if (!id) continue;
    const title = text(raw.title).slice(0, 160) || `Artigo ${id}`;
    const slug = text(raw.slug) || normalizeHelpSlug(title);
    await db.insert(helpMovideskArticles).values({
      sourceId: id, title, slug,
      summary: text(raw.summary).slice(0, 320), sourceUrl: sourceUrl(id, slug),
      categories: categories(raw.categories),
      sourceUpdatedAt: date(raw.updatedAt ?? raw.updatedDate),
    }).onConflictDoUpdate({
      target: helpMovideskArticles.sourceId,
      set: { updatedAt: new Date() },
    });
  }
  return { totalCount: Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : 0,
    finished: items.length === 0 || (Number.isFinite(totalCount) && totalCount > 0
      ? (page + 1) * PAGE_SIZE >= totalCount
      : items.length < PAGE_SIZE) };
}

async function importArticle(sourceId: number, actorUserId: string): Promise<void> {
  const [staged] = await getDatabase().select().from(helpMovideskArticles).where(eq(helpMovideskArticles.sourceId, sourceId)).limit(1);
  if (!staged) return;
  if (staged.contentId && !await safeToReplaceMovideskDraft(
    staged.contentId, staged.importedAt, staged.needsReview,
  )) {
    await getDatabase().update(helpMovideskArticles).set({
      state: "review", issue: "Rascunho preservado: já foi editado, aprovado ou publicado.",
      updatedAt: new Date(),
    }).where(eq(helpMovideskArticles.sourceId, sourceId));
    return;
  }
  // Reprocessamentos usam o HTML original preservado e dispensam novas chamadas à API.
  const raw: SourceRecord = staged.sourceHtml || staged.sourceText
    ? {
        id: sourceId, title: staged.title, slug: staged.slug,
        summary: staged.summary, contentHtml: staged.sourceHtml,
        contentText: staged.sourceText, categories: staged.categories,
        attachments: staged.attachments, revisionId: staged.sourceRevision,
        updatedDate: staged.sourceUpdatedAt?.toISOString(),
      }
    : await getMovideskArticle(sourceId);
  if (numeric(raw.id) !== sourceId) throw new Error("MOVIDESK_ARTICLE_MISMATCH");
  const html = text(raw.contentHtml);
  const plain = text(raw.contentText);
  const cats = categories(raw.categories);
  const files = attachments(raw.attachments);
  const slug = text(raw.slug) || staged.slug;
  await getDatabase().update(helpMovideskArticles).set({
    title: text(raw.title).slice(0, 160) || staged.title,
    slug, summary: text(raw.summary).slice(0, 320),
    sourceHtml: html, sourceText: plain,
    sourceRevision: numeric(raw.revisionId), sourceUpdatedAt: date(raw.updatedDate ?? raw.updatedAt),
    categories: cats, attachments: files, sourceUrl: sourceUrl(sourceId, slug), updatedAt: new Date(),
  }).where(eq(helpMovideskArticles.sourceId, sourceId));

  const [existing] = await getDatabase().select({ id: helpContents.id }).from(helpContents).where(and(
    eq(helpContents.importSource, "movidesk"),
    eq(helpContents.importExternalId, String(sourceId)),
  )).limit(1);
  if (existing && existing.id !== staged.contentId) {
    await getDatabase().update(helpMovideskArticles).set({
      contentId: existing.id, state: "review", needsReview: true,
      issue: "Artigo já existia no F10. Edição preservada; confira antes de publicar.",
      importedAt: new Date(), updatedAt: new Date(),
    }).where(eq(helpMovideskArticles.sourceId, sourceId));
    return;
  }

  const categorySlugs = await ensureCategories(actorUserId, cats);
  const desiredSlug = normalizeHelpSlug(slug || text(raw.title) || staged.title);
  const [slugConflict] = await getDatabase().select({ id: helpContents.id }).from(helpContents)
    .where(eq(helpContents.slug, desiredSlug)).limit(1);
  const safeSlug = existing
    ? staged.slug && (await getDatabase().select({ slug: helpContents.slug }).from(helpContents)
        .where(eq(helpContents.id, existing.id)).limit(1))[0]?.slug || desiredSlug
    : slugConflict ? `${desiredSlug.slice(0, 92)}-${sourceId}` : desiredSlug;

  // Links Movidesk são resolvidos pelo ID de origem, não pelo título.
  const [catalog, natives] = await Promise.all([
    getDatabase().select({
      id: helpMovideskArticles.sourceId, title: helpMovideskArticles.title,
      slug: helpMovideskArticles.slug,
    }).from(helpMovideskArticles),
    getDatabase().select({
      externalId: helpContents.importExternalId, slug: helpContents.slug,
    }).from(helpContents).where(eq(helpContents.importSource, "movidesk")),
  ]);
  const nativeSlugs = new Map(natives.map(row => [Number(row.externalId), row.slug]));
  const links = new Map(catalog.map(row => [
    row.id, `https://f10.com.br/ajuda-f10/${encodeURIComponent(
      nativeSlugs.get(row.id) || normalizeHelpSlug(row.slug || row.title),
    )}`,
  ]));
  const converted = await convertMovideskHtml({
    sourceId, title: text(raw.title) || staged.title, slug: safeSlug,
    summary: text(raw.summary), sourceUrl: sourceUrl(sourceId, slug),
    html, text: plain, categorySlugs, attachments: files,
    resolveArticleUrl: id => links.get(id) ?? null,
  });
  const file: HelpImportFile = {
    format: "f10-help-import", version: 1, source: "movidesk",
    contents: [converted.content],
  };
  const result = await importStructuredHelpFile(actorUserId, file, converted.assets);
  const imported = result.imported[0];
  if (!imported) throw new Error("MOVIDESK_IMPORT_EMPTY");

  if (converted.primaryVideo) {
    const source = converted.primaryVideo;
    const videoMeta = {
      sourceUrl: source.url,
      altText: `Vídeo original: ${text(raw.title) || staged.title}`.slice(0, 500),
      subtitles: "", // A futura IA transcreverá. Nunca inventar legendas.
      assistantSummary: "",
    };
    if (source.kind === "mp4") {
      try {
        const bytes = await downloadMovideskMp4(source.url);
        await attachImportedMp4AsFeaturedVideo({
          actorUserId, contentId: imported.id, bytes,
          fileName: `movidesk-${sourceId}.mp4`,
          sourceUrl: source.url, subtitles: "",
          altText: videoMeta.altText, assistantSummary: "",
        });
        await saveStructuredContentVersion(imported.id, actorUserId);
      } catch (cause) {
        // Mantém o vídeo no campo nativo mesmo se o download exceder o limite.
        await upsertStructuredHelpFeaturedVideo(actorUserId, imported.id, videoMeta);
        const reason = cause instanceof Error && cause.message.startsWith("MOVIDESK_")
          ? cause.message : "MOVIDESK_VIDEO_COPY_FAILED";
        converted.issues.push(`Vídeo principal externo: ${reason}. Precisa de MP4 local para a IA.`);
      }
    } else {
      await upsertStructuredHelpFeaturedVideo(actorUserId, imported.id, videoMeta);
      converted.issues.push("Vídeo YouTube no campo principal; adicione MP4 local antes da análise com IA.");
    }
  }

  const requiresReview = converted.issues.length > 0;
  // Consolida dezenas de falhas repetidas em um único aviso de revisão.
  const imageIssues = converted.issues.filter(item => item.startsWith("Imagem "));
  const otherIssues = converted.issues.filter(item => !item.startsWith("Imagem "));
  const issueSummary = [
    ...otherIssues,
    ...(imageIssues.length ? [
      `${imageIssues.length} imagem(ns) sem cópia local: conferir os arquivos no F10.`,
    ] : []),
  ].join(" ").slice(0, 1000);
  await getDatabase().update(helpMovideskArticles).set({
    contentId: imported.id, state: requiresReview ? "review" : "imported",
    issue: issueSummary || null,
    // Todos entram em revisão editorial, inclusive os sem alertas automáticos.
    needsReview: true,
    importedAt: new Date(), updatedAt: new Date(),
  }).where(eq(helpMovideskArticles.sourceId, sourceId));
}

export async function tickMovideskMigration(): Promise<void> {
  if (!isMovideskMigrationEnabled() || !isMovideskTokenConfigured()) return;
  const db = getDatabase();
  const claimed = await db.transaction(async tx => {
    const [state] = await tx.select().from(helpMovideskImportState)
      .where(eq(helpMovideskImportState.id, 1)).for("update").limit(1);
    if (!state?.enabled || state.nextRequestAt > new Date()) return null;
    if (state.phase !== "catalog" && state.phase !== "details") return null;
    const [next] = state.phase === "details" ? await tx.select({
      sourceId: helpMovideskArticles.sourceId,
      sourceHtml: helpMovideskArticles.sourceHtml,
      sourceText: helpMovideskArticles.sourceText,
    }).from(helpMovideskArticles)
      .where(eq(helpMovideskArticles.state, "discovered"))
      .orderBy(asc(helpMovideskArticles.sourceId)).limit(1) : [];
    await tx.update(helpMovideskImportState).set({
      nextRequestAt: new Date(Date.now() + REQUEST_LEASE_MS),
    }).where(eq(helpMovideskImportState.id, 1));
    return {
      phase: state.phase, page: state.nextPage, articleId: next?.sourceId ?? null,
      hasOriginal: Boolean(next?.sourceHtml || next?.sourceText), actor: state.startedBy,
    };
  });
  if (!claimed) return;
  try {
    if (claimed.phase === "catalog") {
      const result = await catalogPage(claimed.page);
      await db.update(helpMovideskImportState).set({
        phase: result.finished ? "details" : "catalog",
        nextPage: claimed.page + 1, totalCount: result.totalCount,
        nextRequestAt: new Date(Date.now() + INTERVAL_MS), lastError: null, updatedAt: new Date(),
      }).where(eq(helpMovideskImportState.id, 1));
    } else if (!claimed.articleId) {
      await db.update(helpMovideskImportState).set({
        enabled: false, phase: "done", lastError: null, updatedAt: new Date(),
      }).where(eq(helpMovideskImportState.id, 1));
    } else if (!claimed.actor) {
      throw new Error("MOVIDESK_IMPORT_ACTOR_MISSING");
    } else {
      try {
        await importArticle(claimed.articleId, claimed.actor);
      } catch (cause) {
        // Falha de credencial é global; não marque todos os artigos como falhos.
        if (cause instanceof Error && (
          cause.message === "MOVIDESK_API_AUTH_REJECTED" ||
          cause.message === "MOVIDESK_TOKEN_MISSING"
        )) throw cause;
        const issue = errorMessage(cause);
        console.warn("[help-movidesk] article import failed", { articleId: claimed.articleId, issue });
        await db.update(helpMovideskArticles).set({
          state: "failed", issue, updatedAt: new Date(),
        }).where(eq(helpMovideskArticles.sourceId, claimed.articleId));
      }
      await db.update(helpMovideskImportState).set({
        nextRequestAt: new Date(Date.now() + (claimed.hasOriginal ? 0 : INTERVAL_MS)),
        updatedAt: new Date(),
      }).where(eq(helpMovideskImportState.id, 1));
    }
  } catch (cause) {
    const issue = errorMessage(cause);
    console.error("[help-movidesk] catalog sync paused", { issue });
    await db.update(helpMovideskImportState).set({
      enabled: false, lastError: issue, nextRequestAt: new Date(), updatedAt: new Date(),
    }).where(eq(helpMovideskImportState.id, 1));
  }
}

let started = false;
let tickInProgress = false;
export function startMovideskMigrationWorker(): void {
  if (started || !isMovideskMigrationEnabled()) return;
  if (env.NODE_ENV === "production" && env.F10_HELP_VIDEO_WORKER !== "1") return;
  started = true;
  const timer = setInterval(() => {
    if (tickInProgress) return;
    tickInProgress = true;
    void tickMovideskMigration()
      .catch(cause => console.error("[help-movidesk] worker", errorMessage(cause)))
      .finally(() => { tickInProgress = false; });
  }, 5_000);
  timer.unref();
}

export async function getMovideskLegacyRedirect(id: number): Promise<string | null> {
  const [row] = await getDatabase().select({
    contentId: helpMovideskArticles.contentId,
    needsReview: helpMovideskArticles.needsReview,
  }).from(helpMovideskArticles).where(eq(helpMovideskArticles.sourceId, id)).limit(1);
  if (!row?.contentId || row.needsReview) return null;
  const published = await getPublishedStructuredHelpById(row.contentId);
  return published?.slug ? `https://f10.com.br/ajuda-f10/${encodeURIComponent(published.slug)}` : null;
}
