import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { chmod, mkdir, mkdtemp, rename, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import archiver from "archiver";
import postgres from "postgres";
import { getStoredObject } from "./lib/s3-object-storage.mjs";
import { collectArticleMedia, downloadExternalMedia, renderOfflineArticles } from "./lib/help-backup-external-media.mjs";

const API_BASE = "https://api.movidesk.com/public/v1";
const REQUEST_INTERVAL_MS = 8000;
const PAGE_SIZE = 40;
const SOURCE_MAX_PAGES = 1000;
const DEFAULT_MEDIA_LIMIT_MB = 1024;
const HELP_TABLES = [
  "help_contents",
  "help_categories",
  "help_collections",
  "help_collection_items",
  "help_content_categories",
  "help_content_steps",
  "help_step_blocks",
  "help_content_featured_videos",
  "help_assets",
  "help_content_releases",
  "help_content_release_assets",
  "help_publications",
];

function optionsFromArgs(args) {
  const options = {
    output: "/opt/f10-backups/f10-help-complete-" + new Date().toISOString().replace(/[:.]/g, "-") + ".zip",
    cachedOnly: false,
    includeMedia: true,
    maxMediaBytes: DEFAULT_MEDIA_LIMIT_MB * 1024 * 1024,
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--cached-only") options.cachedOnly = true;
    else if (argument === "--no-media") options.includeMedia = false;
    else if (argument === "--output") options.output = args[++index];
    else if (argument === "--max-media-mb") {
      options.maxMediaBytes = Number(args[++index]) * 1024 * 1024;
    } else {
      throw new Error("UNKNOWN_ARGUMENT_" + argument);
    }
  }
  if (!options.output || !options.output.endsWith(".zip") ||
    !Number.isSafeInteger(options.maxMediaBytes) ||
    options.maxMediaBytes < 1024 * 1024 || options.maxMediaBytes > 8192 * 1024 * 1024) {
    throw new Error("INVALID_BACKUP_OPTIONS");
  }
  return options;
}

function jsonBytes(data) {
  return JSON.stringify(data, null, 2) + "\n";
}

async function saveJson(root, relativePath, content) {
  const target = join(root, relativePath);
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await writeFile(target, jsonBytes(content), { mode: 0o600 });
}

function numericId(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

class MovideskReader {
  constructor(token) {
    this.token = token;
    this.nextRequestAt = 0;
    this.requests = 0;
  }

  async request(path) {
    const delay = Math.max(0, this.nextRequestAt - Date.now());
    if (delay > 0) await new Promise((done) => setTimeout(done, delay));
    this.nextRequestAt = Date.now() + REQUEST_INTERVAL_MS;
    const url = new URL(API_BASE + path);
    url.searchParams.set("token", this.token);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(45000),
    });
    this.requests += 1;
    if (response.status === 404) {
      await response.body?.cancel();
      return null;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("MOVIDESK_HTTP_" + response.status);
    }
    return response.json();
  }

  async getArticle(id) {
    const primary = await this.request("/article/" + id);
    if (primary) return primary;
    return this.request("/article/" + id + "/kb");
  }

  async catalog() {
    const articles = new Map();
    let totalSize = null;
    for (let page = 0; page < SOURCE_MAX_PAGES; page += 1) {
      const payload = await this.request(
        "/kb/article?status=1&page=" + page + "&pageSize=" + PAGE_SIZE,
      );
      if (!payload || !Array.isArray(payload.items)) throw new Error("MOVIDESK_CATALOG_INVALID");
      const currentTotal = Number(payload.totalSize);
      if (Number.isSafeInteger(currentTotal) && currentTotal >= 0) {
        totalSize = currentTotal;
      }
      for (const article of payload.items) {
        const id = numericId(article?.id);
        if (id) articles.set(id, article);
      }
      if (payload.items.length === 0 ||
          (totalSize !== null && (page + 1) * PAGE_SIZE >= totalSize) ||
          (totalSize === null && payload.items.length < PAGE_SIZE)) {
        return { articles: [...articles.values()], totalSize, pages: page + 1 };
      }
    }
    throw new Error("MOVIDESK_CATALOG_PAGE_LIMIT");
  }
}

async function exportF10(db, folder) {
  const result = await db.begin(async (tx) => {
    await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const tables = {};
    for (const table of HELP_TABLES) {
      const rows = await tx.unsafe(
        "SELECT to_jsonb(t) AS record FROM " + table + " t",
      );
      tables[table] = rows.map((row) => row.record);
    }
    const legacy = await tx.unsafe(
      "SELECT to_jsonb(t) AS record FROM help_movidesk_articles t ORDER BY source_id",
    );
    return {
      tables,
      cachedMovidesk: legacy.map((row) => row.record),
    };
  });

  for (const [table, rows] of Object.entries(result.tables)) {
    await saveJson(folder, "f10/database/" + table + ".json", rows);
  }
  await saveJson(folder, "movidesk/cached-articles.json", result.cachedMovidesk);
  return result;
}

async function exportMovidesk(reader, folder, cached) {
  const catalog = await reader.catalog();
  await saveJson(folder, "movidesk/live-catalog.json", catalog);
  const ids = new Set(catalog.articles.map((row) => numericId(row?.id)).filter(Boolean));
  const cachedMissingFromLive = cached
    .filter((row) => !ids.has(Number(row.source_id)))
    .map((row) => ({ sourceId: row.source_id, title: row.title }));
  const failures = [];
  let detailed = 0;

  for (const [index, article] of catalog.articles.entries()) {
    const id = numericId(article.id);
    try {
      const fullArticle = await reader.getArticle(id);
      if (!fullArticle || numericId(fullArticle.id) !== id) {
        throw new Error("MOVIDESK_ARTICLE_INVALID_" + id);
      }
      await saveJson(folder, "movidesk/live-articles/" + id + ".json", fullArticle);
      detailed += 1;
    } catch (error) {
      failures.push({
        sourceId: id,
        code: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      });
    }
    if ((index + 1) % 20 === 0) {
      console.log("Movidesk articles processed: " + (index + 1) + "/" + catalog.articles.length);
    }
  }

  return {
    catalogCount: catalog.articles.length,
    reportedTotal: catalog.totalSize,
    catalogPages: catalog.pages,
    detailed,
    failures,
    cachedMissingFromLive,
    requests: reader.requests,
  };
}

function safeExtension(asset) {
  const name = String(asset.original_name ?? "").toLowerCase();
  const extension = name.match(/[.]([a-z0-9]{1,8})$/)?.[1];
  if (extension) return "." + extension;
  const mime = String(asset.mime_type ?? "");
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "video/mp4") return ".mp4";
  if (mime === "application/pdf") return ".pdf";
  return ".bin";
}

async function saveMedia(response, target, limit) {
  if (!response.body) throw new Error("STORAGE_EMPTY_RESPONSE");
  const size = Number(response.headers.get("content-length"));
  if (Number.isFinite(size) && size > limit) {
    await response.body.cancel();
    throw new Error("STORAGE_MEDIA_SIZE_LIMIT");
  }

  let bytes = 0;
  const hash = createHash("sha256");
  const guard = new Transform({
    transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (bytes > limit) {
        callback(new Error("STORAGE_MEDIA_SIZE_LIMIT"));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  try {
    await pipeline(Readable.fromWeb(response.body), guard, createWriteStream(target, {
      flags: "wx",
      mode: 0o600,
    }));
  } catch (error) {
    await rm(target, { force: true });
    throw error;
  }
  return { bytes, sha256: hash.digest("hex") };
}

async function exportMedia(assets, folder, options) {
  const manifest = [];
  const unique = new Map();
  for (const asset of assets) {
    if (!asset.storage_key) {
      manifest.push({
        assetId: asset.id,
        state: "not_stored",
        sourceUrl: asset.source_url ?? null,
      });
      continue;
    }
    if (!unique.has(asset.storage_key)) unique.set(asset.storage_key, []);
    unique.get(asset.storage_key).push(asset);
  }

  for (const [storageKey, related] of unique) {
    const asset = related[0];
    const archivePath = "media/" + asset.id + safeExtension(asset);
    if (!options.includeMedia) {
      manifest.push({ assetIds: related.map((row) => row.id), state: "skipped_by_option", storageKey });
      continue;
    }
    try {
      if (asset.size_bytes != null && Number(asset.size_bytes) > options.maxMediaBytes) {
        throw new Error("STORAGE_MEDIA_SIZE_LIMIT");
      }
      const response = await getStoredObject(storageKey);
      const media = await saveMedia(response, join(folder, archivePath), options.maxMediaBytes);
      const checksumMatches = !asset.checksum_sha256 ||
        asset.checksum_sha256.toLowerCase() === media.sha256;
      manifest.push({
        assetIds: related.map((row) => row.id),
        state: checksumMatches ? "stored" : "checksum_mismatch",
        archivePath,
        storageKey,
        bytes: media.bytes,
        sha256: media.sha256,
      });
    } catch (error) {
      manifest.push({
        assetIds: related.map((row) => row.id),
        state: "failed",
        storageKey,
        code: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      });
    }
  }
  await saveJson(folder, "media/manifest.json", manifest);
  return manifest;
}

async function createZip(folder, output) {
  const target = resolve(output);
  const temporary = target + ".partial";
  const existing = await stat(target).catch((error) => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (existing) throw new Error("BACKUP_OUTPUT_ALREADY_EXISTS");
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await rm(temporary, { force: true });
  const stream = createWriteStream(temporary, { mode: 0o600, flags: "wx" });
  const archive = archiver("zip", { zlib: { level: 6 } });
  const finished = new Promise((resolveDone, reject) => {
    stream.once("close", resolveDone);
    stream.once("error", reject);
    archive.once("error", reject);
  });
  archive.pipe(stream);
  archive.directory(folder, false);
  await archive.finalize();
  await finished;
  await rename(temporary, target);
  await chmod(target, 0o600);
  return { path: target, bytes: (await stat(target)).size };
}

async function main() {
  const options = optionsFromArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const token = (process.env.MOVIDESK_KB_API_TOKEN ||
    process.env.MOVIDESK_API_TOKEN || "").trim().replace(/^Bearer\s+/i, "");
  if (!databaseUrl || (!token && !options.cachedOnly)) {
    throw new Error("DATABASE_URL_OR_MOVIDESK_TOKEN_MISSING");
  }

  const folder = await mkdtemp(join(tmpdir(), "f10-help-backup-"));
  const db = postgres(databaseUrl, { max: 1, prepare: false, connect_timeout: 10 });
  try {
    const data = await exportF10(db, folder);
    let source = {
      state: "cached_only",
      catalogCount: null,
      reportedTotal: null,
      detailed: 0,
      failures: [],
    };
    if (!options.cachedOnly) {
      try {
        source = await exportMovidesk(new MovideskReader(token), folder, data.cachedMovidesk);
      } catch (error) {
        source = {
          state: "live_export_failed",
          catalogCount: null,
          reportedTotal: null,
          detailed: 0,
          failures: [{
            code: error instanceof Error ? error.message : "UNKNOWN_ERROR",
          }],
        };
      }
    }
    const media = await exportMedia(data.tables.help_assets, folder, options);
    const collected = await collectArticleMedia(data, folder);
    const external = await downloadExternalMedia(collected, data.tables.help_assets, media, folder, options);
    const offline = await renderOfflineArticles(data, folder, external);
    const storedIds = new Set(media.filter((item) => item.state === "stored")
      .flatMap((item) => item.assetIds || []));
    const unavailableAssets = data.tables.help_assets.filter((asset) => {
      if (storedIds.has(asset.id)) return false;
      let reference = null;
      if (asset.source_url) {
        try {
          reference = external.byUrl.get(new URL(asset.source_url, "https://f10.com.br/").href);
        } catch { /* invalid source URL */ }
      }
      return !reference?.archivePath &&
        !(asset.asset_type === "video" && reference?.state === "youtube_link");
    });
    const storageFailures = media.filter((row) =>
      row.state === "failed" || row.state === "checksum_mismatch").length;
    const failures = source.failures.length + storageFailures +
      external.failures + unavailableAssets.length;
    const inventory = {
      format: "f10-help-complete-backup",
      version: 2,
      createdAt: new Date().toISOString(),
      readOnly: true,
      source,
      f10: {
        articles: data.tables.help_contents.length,
        publishedSnapshots: data.tables.help_publications
          .filter((row) => row.entity_type === "content").length,
        movideskCached: data.cachedMovidesk.length,
        tables: Object.fromEntries(Object.entries(data.tables)
          .map(([table, rows]) => [table, rows.length])),
      },
      media: {
        objectsStored: media.filter((row) => row.state === "stored").length,
        notStored: media.filter((row) => row.state === "not_stored").length,
        failures: storageFailures,
        unavailableAssets: unavailableAssets.map((asset) => ({
          id: asset.id, type: asset.asset_type, sourceUrl: asset.source_url,
        })),
        externalDownloaded: external.records.filter((row) => row.state === "downloaded").length,
        externalFailed: external.records.filter((row) => row.state === "failed").length,
        youtubeLinks: external.records.filter((row) => row.state === "youtube_link").length,
        unresolvedAttachments: collected.unresolved.length,
      },
      offline,
      warnings: [
        "The live Movidesk catalog query uses status=1 (published articles); the cached F10 inventory retains other previously captured records.",
        "External images, attachments and direct video files are downloaded when the source allows access; missing files are listed in media/external-manifest.json.",
        "YouTube videos remain links and require Internet access.",
        "Open offline/index.html to browse locally available article content and media.",
        "Sensitive internal support notes and unpublished articles are included; keep the ZIP private.",
        "This is a recovery/archive export, not an automatic import format.",
      ],
      complete: !options.cachedOnly && source.catalogCount !== null && failures === 0 &&
        source.catalogCount === source.detailed &&
        (source.reportedTotal === null || source.reportedTotal === source.catalogCount),
    };
    await saveJson(folder, "inventory.json", inventory);
    await writeFile(join(folder, "README.txt"),
      "F10 Help Backup\n\n" +
      "movidesk/cached-articles.json: original Movidesk articles previously captured by F10\n" +
      "movidesk/live-catalog.json and live-articles/: live published Movidesk data\n" +
      "f10/database/: F10 current articles, steps, blocks, categories and publication versions\n" +
      "media/: stored assets, recovered external media and manifests\n" +
      "offline/index.html: article viewer with local media and YouTube links\n" +
      "inventory.json: counts, limitations and completeness status\n\n" +
      "Contains private information. Do not publish online.\n",
      { mode: 0o600 });
    const zip = await createZip(folder, options.output);
    console.log(JSON.stringify({
      state: "backup_created",
      zip,
      complete: inventory.complete,
      f10Articles: inventory.f10.articles,
      cachedMovideskArticles: inventory.f10.movideskCached,
      liveMovideskArticles: source.detailed,
      mediaStored: inventory.media.objectsStored,
      mediaFailed: inventory.media.failures,
      externalMediaDownloaded: inventory.media.externalDownloaded,
      externalMediaFailed: inventory.media.externalFailed,
      youtubeLinks: inventory.media.youtubeLinks,
      missingAssets: inventory.media.unavailableAssets.length,
      missingAttachments: inventory.media.unresolvedAttachments,
      offline,
      sourceFailed: source.failures.length,
      readOnly: true,
    }, null, 2));
    if (!inventory.complete) process.exitCode = 2;
  } finally {
    await db.end();
    await rm(folder, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : "UNKNOWN_ERROR");
  process.exitCode = 1;
});
