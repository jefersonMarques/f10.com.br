import { randomUUID } from "node:crypto";
import { env } from "$env/dynamic/private";
import { and, asc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getDatabase } from "$lib/server/db";
import { helpMovideskImageRecoveryState } from "$lib/server/db/helpMovideskImageRecoverySchema";
import { helpMovideskArticles, helpMovideskImportState } from "$lib/server/db/helpMovideskSchema";
import { helpAssets, helpContents } from "$lib/server/db/structuredHelpSchema";
import { downloadMovideskImageSource } from "$lib/server/help/movideskHtmlConverter";
import { deleteAssetObject, getAssetObject, putAssetObject, getAssetStorageStatus } from "$lib/server/storage/assetStorage";

const LEASE_MS = 120_000;
const INTERVAL_MS = 8_000;
const IMPORT_WAIT_MS = 30_000;
const API_BACKOFF_MS = 60_000;

function enabled(): boolean {
  return env.F10_MOVIDESK_MIGRATION_ENABLED?.trim() === "true";
}
function errorCode(cause: unknown): string {
  const value = cause instanceof Error ? cause.message : "";
  return /^(MOVIDESK_IMAGE_[A-Z0-9_:.-]+|ASSET_STORAGE_[A-Z0-9_]+)$/.test(value)
    ? value.slice(0, 180) : "MOVIDESK_IMAGE_COPY_FAILED";
}

function movideskStorageHash(sourceUrl: string): string | null {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:" || url.hostname !== "s3.amazonaws.com") return null;
    return /^\\/movidesk-files\\/([a-f0-9]{32})\\/?$/i.exec(url.pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

function retryableIssue(issue: string): boolean {
  const status = /^MOVIDESK_IMAGE_(?:STORAGE_)?HTTP_(\\d{3})$/.exec(issue)?.[1];
  return Boolean(status && (Number(status) === 429 || Number(status) >= 500));
}

async function downloadRecoverableImage(sourceUrl: string) {
  try {
    return await downloadMovideskImageSource(sourceUrl);
  } catch (cause) {
    const issue = errorCode(cause);
    if (!["MOVIDESK_IMAGE_HTTP_401", "MOVIDESK_IMAGE_HTTP_403", "MOVIDESK_IMAGE_HTTP_404"].includes(issue)) {
      throw cause;
    }

    const hash = movideskStorageHash(sourceUrl);
    if (!hash) throw cause;

    const token = env.MOVIDESK_KB_API_TOKEN?.trim().replace(/^Bearer\\s+/i, "");
    if (!token) throw new Error("MOVIDESK_IMAGE_STORAGE_TOKEN_MISSING");

    // O hash identifica o arquivo original; URLs assinadas de outros hashes não são intercambiáveis.
    const url = new URL("https://api.movidesk.com/public/v1/storage/download");
    url.searchParams.set("token", token);
    url.searchParams.set("id", hash);

    try {
      return await downloadMovideskImageSource(url.href);
    } catch (storageCause) {
      const storageIssue = errorCode(storageCause);
      if (/^MOVIDESK_IMAGE_HTTP_\\d{3}$/.test(storageIssue)) {
        throw new Error(storageIssue.replace("MOVIDESK_IMAGE_HTTP_", "MOVIDESK_IMAGE_STORAGE_HTTP_"));
      }
      throw storageCause;
    }
  }
}

function pendingImage() {
  const migratedIds = getDatabase().select({ id: helpContents.id }).from(helpContents)
    .where(eq(helpContents.importSource, "movidesk"));
  return and(
    inArray(helpAssets.contentId, migratedIds),
    eq(helpAssets.assetType, "image"),
    isNull(helpAssets.storageKey),
    isNotNull(helpAssets.sourceUrl),
  );
}
function eligibleImage() {
  return and(pendingImage(),
    sql`coalesce(${helpAssets.metadata}->'movideskImageRecovery'->>'status','') <> 'failed'`);
}
function allMigratedImages() {
  const migratedIds = getDatabase().select({ id: helpContents.id }).from(helpContents)
    .where(eq(helpContents.importSource, "movidesk"));
  return and(inArray(helpAssets.contentId, migratedIds), eq(helpAssets.assetType, "image"));
}

export async function movideskImageRecoveryDashboard() {
  const db = getDatabase();
  const [state, rows, originals] = await Promise.all([
    db.select().from(helpMovideskImageRecoveryState).where(eq(helpMovideskImageRecoveryState.id, 1)).limit(1),
    db.select({
      contentId: helpAssets.contentId,
      storageKey: helpAssets.storageKey,
      sourceUrl: helpAssets.sourceUrl,
      metadata: helpAssets.metadata,
    }).from(helpAssets).where(allMigratedImages()),
    db.select({
      sourceId: helpMovideskArticles.sourceId,
      contentId: helpMovideskArticles.contentId,
      sourceHtml: helpMovideskArticles.sourceHtml,
    }).from(helpMovideskArticles),
  ]);
  let stored = 0;
  let pending = 0;
  let failed = 0;
  const blocked = new Map<string, number>();
  for (const row of rows) {
    if (row.storageKey) { stored++; continue; }
    if (!row.sourceUrl) { failed++; continue; }
    const result = row.metadata?.movideskImageRecovery as { status?: string } | undefined;
    if (result?.status === "failed") {
      failed++;
      try {
        const host = new URL(row.sourceUrl).hostname.toLowerCase();
        blocked.set(host, (blocked.get(host) ?? 0) + 1);
      } catch { /* invalid URL reported by failed state */ }
    } else pending++;
  }
  // Detecta imagens presentes no HTML que nem chegaram a virar um ativo F10.
  const byContentId = new Map<string, number>();
  for (const row of rows) {
    if (!row.contentId) continue;
    byContentId.set(row.contentId, (byContentId.get(row.contentId) ?? 0) + 1);
  }
  const unimported = originals.flatMap((row) => {
    if (!row.contentId || !row.sourceHtml) return [];
    const originalCount = (row.sourceHtml.match(/<img\b/gi) ?? []).length;
    const gap = Math.max(0, originalCount - (byContentId.get(row.contentId) ?? 0));
    return gap ? [{ sourceId: row.sourceId, missing: gap }] : [];
  });
  const storage = getAssetStorageStatus();
  return {
    enabled: state[0]?.enabled ?? false,
    total: rows.length,
    stored, pending, failed,
    bucketConfigured: storage.configured,
    lastError: state[0]?.lastError ?? null,
    unimported,
    failedHosts: [...blocked].sort((a,b) => b[1] - a[1])
      .slice(0, 8).map(([host, count]) => ({ host, count })),
  };
}

export async function setMovideskImageRecoveryRunning(running: boolean) {
  if (!enabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  if (running && !getAssetStorageStatus().configured) throw new Error("ASSET_STORAGE_NOT_CONFIGURED");
  const db = getDatabase();
  await db.insert(helpMovideskImageRecoveryState).values({
    id: 1, enabled: running, nextRequestAt: new Date(), updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: helpMovideskImageRecoveryState.id,
    set: { enabled: running, nextRequestAt: new Date(), lastError: null, updatedAt: new Date() },
  });
}

export async function retryFailedMovideskImages() {
  if (!enabled()) throw new Error("MOVIDESK_MIGRATION_DISABLED");
  if (!getAssetStorageStatus().configured) throw new Error("ASSET_STORAGE_NOT_CONFIGURED");
  const db = getDatabase();
  // Limpa apenas a anotação de falha, nunca arquivos nem metadados da IA.
  await db.update(helpAssets).set({
    metadata: sql`coalesce(${helpAssets.metadata}, '{}'::jsonb) - 'movideskImageRecovery'`,
    updatedAt: new Date(),
  }).where(and(pendingImage(),
    sql`coalesce(${helpAssets.metadata}->'movideskImageRecovery'->>'status','') = 'failed'`));
  await setMovideskImageRecoveryRunning(true);
}

async function markImageFailure(assetId: string, issue: string) {
  await getDatabase().update(helpAssets).set({
    metadata: sql`jsonb_set(coalesce(${helpAssets.metadata}, '{}'::jsonb), '{movideskImageRecovery}', ${JSON.stringify({
      status: "failed", issue, attemptedAt: new Date().toISOString(),
    })}::jsonb)`,
    updatedAt: new Date(),
  }).where(and(eq(helpAssets.id, assetId), isNull(helpAssets.storageKey)));
}

async function mirrorImage(asset: { id: string; contentId: string | null; sourceUrl: string | null }) {
  if (!asset.sourceUrl || !asset.contentId) throw new Error("MOVIDESK_IMAGE_URL_INVALID");
  const downloaded = await downloadRecoverableImage(asset.sourceUrl);
  const ext = downloaded.mimeType === "image/png" ? "png"
    : downloaded.mimeType === "image/webp" ? "webp" : "jpg";
  const key = `help/movidesk-recovered/${asset.contentId}/${asset.id}-${randomUUID()}.${ext}`;
  const stored = await putAssetObject(key, downloaded.bytes, downloaded.mimeType);
  try {
    // Confere que o objeto gravado pode ser recuperado pelo próprio F10.
    const check = await getAssetObject(stored.key, "bytes=0-15");
    const available = check.ok;
    await check.body?.cancel();
    if (!available) throw new Error("MOVIDESK_IMAGE_BUCKET_VERIFY_FAILED");
    const updated = await getDatabase().update(helpAssets).set({
      storageKey: stored.key,
      originalName: downloaded.fileName,
      mimeType: stored.contentType,
      sizeBytes: stored.size,
      checksumSha256: stored.checksumSha256,
      metadata: sql`coalesce(${helpAssets.metadata}, '{}'::jsonb) - 'movideskImageRecovery'`,
      updatedAt: new Date(),
    }).where(and(eq(helpAssets.id, asset.id), isNull(helpAssets.storageKey)))
      .returning({ id: helpAssets.id });
    if (!updated.length) {
      await deleteAssetObject(stored.key);
    }
  } catch (cause) {
    await deleteAssetObject(stored.key).catch(() => undefined);
    throw cause;
  }
}

export async function tickMovideskImageRecovery(): Promise<void> {
  if (!enabled()) return;
  const db = getDatabase();
  const claimed = await db.transaction(async (tx) => {
    const [state] = await tx.select().from(helpMovideskImageRecoveryState)
      .where(eq(helpMovideskImageRecoveryState.id, 1)).for("update").limit(1);
    if (!state?.enabled || state.nextRequestAt > new Date()) return null;
    const [importState] = await tx.select({ enabled: helpMovideskImportState.enabled })
      .from(helpMovideskImportState).where(eq(helpMovideskImportState.id, 1)).limit(1);
    if (importState?.enabled) {
      // As duas filas compartilham o limite de chamadas da API Movidesk.
      await tx.update(helpMovideskImageRecoveryState).set({
        nextRequestAt: new Date(Date.now() + IMPORT_WAIT_MS),
        updatedAt: new Date(),
      }).where(eq(helpMovideskImageRecoveryState.id, 1));
      return null;
    }
    const [next] = await tx.select({
      id: helpAssets.id, contentId: helpAssets.contentId, sourceUrl: helpAssets.sourceUrl,
    }).from(helpAssets).where(eligibleImage()).orderBy(asc(helpAssets.id)).limit(1);
    await tx.update(helpMovideskImageRecoveryState).set({
      enabled: Boolean(next),
      nextRequestAt: new Date(Date.now() + LEASE_MS),
      updatedAt: new Date(),
    }).where(eq(helpMovideskImageRecoveryState.id, 1));
    return next ?? null;
  });
  if (!claimed) return;
  let issue: string | null = null;
  try {
    await mirrorImage(claimed);
  } catch (cause) {
    issue = errorCode(cause);
    if (!retryableIssue(issue)) {
      await markImageFailure(claimed.id, issue);
    }
    console.warn("[help-movidesk-images] image skipped", { assetId: claimed.id, issue });
  }
  await db.update(helpMovideskImageRecoveryState).set({
    nextRequestAt: new Date(Date.now() + (issue && retryableIssue(issue) ? API_BACKOFF_MS : INTERVAL_MS)),
    lastError: issue, updatedAt: new Date(),
  }).where(eq(helpMovideskImageRecoveryState.id, 1));
}

let started = false;
let inProgress = false;
export function startMovideskImageRecoveryWorker(): void {
  if (started || !enabled()) return;
  if (env.NODE_ENV === "production" && env.F10_HELP_VIDEO_WORKER !== "1") return;
  started = true;
  const timer = setInterval(() => {
    if (inProgress) return;
    inProgress = true;
    void tickMovideskImageRecovery()
      .catch((cause) => console.error("[help-movidesk-images] worker", errorCode(cause)))
      .finally(() => { inProgress = false; });
  }, INTERVAL_MS);
  timer.unref();
}
