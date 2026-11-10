import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, open, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const SAFE_S3_HOST = /^(?:[a-z0-9.-]+\.)?s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i;
const MEDIA_EXTENSION = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp|mp4|m4v|mov|webm|pdf|docx?|xlsx?|pptx?|csv|txt|odt|ods|odp|zip)(?:$|[?#])/i;
const ALLOWED_EXTENSIONS = new Set([
  "avif", "bmp", "gif", "jpg", "jpeg", "png", "svg", "webp", "mp4", "m4v", "mov", "webm",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "odt", "ods", "odp", "zip",
]);
const MAX_REDIRECTS = 4;

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function attribute(tag, key) {
  const match = tag.match(new RegExp("\\b" + key + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? "").replace(/&amp;/gi, "&").trim();
}

function normalizedUrl(value, baseUrl) {
  if (typeof value !== "string" || !value.trim() || /^(?:data|blob|javascript|file):/i.test(value.trim())) return null;
  try {
    const url = new URL(value.trim().replace(/&amp;/gi, "&"), baseUrl);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

function isYoutube(url) {
  const host = new URL(url).hostname.toLowerCase();
  return host === "youtu.be" || host === "youtube.com" || host.endsWith(".youtube.com")
    || host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com");
}

function mediaKind(url, hint = "") {
  if (isYoutube(url)) return "youtube";
  if (hint === "image" || hint === "video" || hint === "file") return hint;
  const ext = new URL(url).pathname.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"].includes(ext)) return "image";
  if (["mp4", "m4v", "mov", "webm"].includes(ext)) return "video";
  return MEDIA_EXTENSION.test(url) ? "file" : null;
}

function addReference(registry, raw, baseUrl, article, hint = "") {
  const url = normalizedUrl(raw, baseUrl);
  if (!url) return;
  const kind = mediaKind(url, hint);
  if (!kind) return;
  const reference = registry.get(url) ?? { url, kind, articles: new Set() };
  reference.articles.add(article);
  registry.set(url, reference);
}

function scanHtml(registry, html, baseUrl, article) {
  if (typeof html !== "string") return;
  const tags = html.match(/<(?:img|video|source|iframe|embed|a)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const tagName = /^<\s*([a-z]+)/i.exec(tag)?.[1]?.toLowerCase();
    if (tagName === "img") {
      for (const key of ["src", "data-src", "data-original", "data-lazy-src", "data-srcset", "srcset"]) {
        const value = attribute(tag, key);
        if (key.includes("srcset")) {
          for (const candidate of value.split(",")) {
            addReference(registry, candidate.trim().split(/\s+/)[0], baseUrl, article, "image");
          }
        } else {
          addReference(registry, value, baseUrl, article, "image");
        }
      }
    } else {
      const hint = tagName === "video" || tagName === "source" ? "video" : "";
      addReference(registry, attribute(tag, "src") || attribute(tag, "data-src") || attribute(tag, "href"), baseUrl, article, hint);
      if (tagName === "video") addReference(registry, attribute(tag, "poster"), baseUrl, article, "image");
    }
  }
  const cssUrls = html.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gi);
  for (const match of cssUrls) addReference(registry, match[1], baseUrl, article);
}

function scanObject(registry, value, baseUrl, article, depth = 0) {
  if (depth > 16 || value == null) return;
  if (Array.isArray(value)) {
    for (const entry of value) scanObject(registry, entry, baseUrl, article, depth + 1);
    return;
  }
  if (typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      if (/^(?:contentHtml|sourceHtml|source_html|html|bodyHtml)$/i.test(key)) {
        scanHtml(registry, entry, baseUrl, article);
      } else if (/(?:url|src|href)$/i.test(key)) {
        addReference(registry, entry, baseUrl, article);
      }
    } else if (entry && typeof entry === "object") {
      scanObject(registry, entry, baseUrl, article, depth + 1);
    }
  }
}

function scanAttachments(registry, attachments, baseUrl, article, unresolved) {
  if (!Array.isArray(attachments)) return;
  for (const attachment of attachments) {
    if (!attachment || typeof attachment !== "object") continue;
    const explicit = attachment.downloadUrl || attachment.url || attachment.sourceUrl;
    if (explicit) {
      addReference(registry, explicit, baseUrl, article, "file");
    } else if (/^[0-9a-f]{32}$/i.test(String(attachment.hash ?? ""))) {
      addReference(registry, "https://f10.movidesk.com/Storage/Download?id=" + attachment.hash, baseUrl, article, "file");
    } else {
      unresolved.push({ article, name: String(attachment.name ?? ""), id: attachment.id ?? null, reason: "ATTACHMENT_SOURCE_UNAVAILABLE" });
    }
  }
}

export async function collectArticleMedia(data, folder) {
  const registry = new Map();
  const unresolved = [];
  for (const cached of data.cachedMovidesk) {
    const article = "movidesk:" + cached.source_id;
    scanHtml(registry, cached.source_html, cached.source_url, article);
    scanAttachments(registry, cached.attachments, cached.source_url, article, unresolved);
  }
  const liveDirectory = join(folder, "movidesk/live-articles");
  const liveFiles = await readdir(liveDirectory).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const name of liveFiles.filter((value) => /^\d+\.json$/.test(value))) {
    const raw = JSON.parse(await readFile(join(liveDirectory, name), "utf8"));
    const article = "movidesk:" + name.slice(0, -5);
    const baseUrl = "https://ajuda.f10.com.br/kb/pt-br/article/" + name.slice(0, -5);
    scanObject(registry, raw, baseUrl, article);
    scanAttachments(registry, raw.attachments, baseUrl, article, unresolved);
  }
  for (const asset of data.tables.help_assets) {
    if (asset.source_url && !asset.storage_key) {
      addReference(registry, asset.source_url, "https://f10.com.br/", "f10:" + (asset.content_id ?? "unlinked"), asset.asset_type);
    }
  }
  for (const block of data.tables.help_step_blocks) {
    addReference(registry, block.link_url, "https://f10.com.br/", "f10:block:" + block.id);
    scanObject(registry, block.metadata, "https://f10.com.br/", "f10:block:" + block.id);
  }
  for (const row of data.tables.help_publications) {
    if (row.entity_type === "content") scanObject(registry, row.snapshot, "https://f10.com.br/", "f10:" + row.entity_id);
  }
  for (const row of data.tables.help_content_releases) {
    scanObject(registry, row.public_snapshot, "https://f10.com.br/", "f10:" + row.content_id);
    scanObject(registry, row.editor_snapshot, "https://f10.com.br/", "f10:" + row.content_id);
  }
  return { registry, unresolved };
}

function approvedRemoteUrl(raw, expectedHash = null) {
  const url = new URL(raw);
  const host = url.hostname.toLowerCase();
  const extra = (process.env.HELP_BACKUP_MEDIA_ALLOWED_HOSTS || process.env.MOVIDESK_IMAGE_ALLOWED_HOSTS || "")
    .split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const allowedExtra = extra.includes(host) && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(host)
    && host.includes(".") && !/^(?:\d+\.){3}\d+$/.test(host)
    && !host.endsWith(".local") && !host.endsWith(".internal");
  const allowed = host === "f10.com.br" || host.endsWith(".f10.com.br")
    || host === "movidesk.com" || host.endsWith(".movidesk.com")
    || SAFE_S3_HOST.test(host)
    || /^objectstorage\.[a-z0-9-]+\.oraclecloud\.com$/.test(host)
    || allowedExtra;
  if (!allowed || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("BACKUP_MEDIA_HOST_NOT_ALLOWED");
  }
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:") throw new Error("BACKUP_MEDIA_PROTOCOL_NOT_ALLOWED");
  if (expectedHash && (host !== "s3.amazonaws.com"
    || url.pathname.toLowerCase() !== "/movidesk-files/" + expectedHash.toLowerCase())) {
    throw new Error("BACKUP_MEDIA_SIGNED_REDIRECT_INVALID");
  }
  return url;
}

async function requestExternalMedia(source) {
  let url = approvedRemoteUrl(source);
  const hash = url.hostname === "s3.amazonaws.com"
    ? /^\/movidesk-files\/([a-f0-9]{32})\/?$/i.exec(url.pathname)?.[1] ?? null : null;
  if (hash) {
    url = new URL("https://f10.movidesk.com/Storage/Download?id=" + hash);
  }
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(300_000),
      headers: { "User-Agent": "F10-Help-Backup/2.0" },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("BACKUP_MEDIA_REDIRECT_INVALID");
      url = approvedRemoteUrl(new URL(location, url).href, hash);
      continue;
    }
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new Error("BACKUP_MEDIA_HTTP_" + response.status);
    }
    return response;
  }
  throw new Error("BACKUP_MEDIA_REDIRECT_LIMIT");
}

function extensionFromResponse(reference, response) {
  const ext = new URL(reference.url).pathname.toLowerCase().match(/\.([a-z0-9]{1,8})$/)?.[1];
  if (ext && ALLOWED_EXTENSIONS.has(ext)) return "." + ext;
  const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const extensions = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif",
    "image/avif": ".avif", "image/svg+xml": ".svg", "video/mp4": ".mp4",
    "video/webm": ".webm", "application/pdf": ".pdf", "text/plain": ".txt",
  };
  return extensions[mime] || ".bin";
}

async function saveExternalResponse(response, path, limit) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > limit) {
    await response.body.cancel();
    throw new Error("BACKUP_MEDIA_SIZE_LIMIT");
  }
  const hash = createHash("sha256");
  let bytes = 0;
  const guard = new Transform({
    transform(chunk, encoding, callback) {
      bytes += chunk.length;
      if (bytes > limit) return callback(new Error("BACKUP_MEDIA_SIZE_LIMIT"));
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  try {
    await pipeline(Readable.fromWeb(response.body), guard, createWriteStream(path, { flags: "wx", mode: 0o600 }));
  } catch (error) {
    await rm(path, { force: true });
    throw error;
  }
  if (!bytes) {
    await rm(path, { force: true });
    throw new Error("BACKUP_MEDIA_EMPTY");
  }
  return { bytes, sha256: hash.digest("hex") };
}

async function validateExternalMedia(path, kind) {
  const file = await open(path, "r");
  const header = Buffer.alloc(512);
  let bytesRead = 0;
  try {
    ({ bytesRead } = await file.read(header, 0, header.length, 0));
  } finally {
    await file.close();
  }
  const bytes = header.subarray(0, bytesRead);
  const ascii = bytes.toString("ascii");
  const trimmed = bytes.toString("utf8").trimStart();
  if (/^(?:<!doctype html|<html|<script|<\?php)/i.test(trimmed)) {
    throw new Error("BACKUP_MEDIA_UNEXPECTED_HTML");
  }
  const isImage = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    || bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    || ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")
    || ascii.startsWith("BM") || (ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WEBP")
    || (ascii.slice(4, 8) === "ftyp" && ascii.slice(8, 20).includes("avif"))
    || /^(?:<\?xml[^>]*>\s*)?<svg\b/i.test(trimmed);
  const isVideo = (ascii.slice(4, 8) === "ftyp")
    || bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
  if (kind === "image" && !isImage) throw new Error("BACKUP_MEDIA_IMAGE_INVALID");
  if (kind === "video" && !isVideo) throw new Error("BACKUP_MEDIA_VIDEO_INVALID");
}

function resolveStoredMedia(assets, storedManifest) {
  const result = new Map();
  for (const item of storedManifest) {
    if (item.state !== "stored") continue;
    for (const id of item.assetIds || []) result.set(id, item.archivePath);
  }
  const sourceToPath = new Map();
  for (const asset of assets) {
    if (!asset.source_url || !result.has(asset.id)) continue;
    const url = normalizedUrl(asset.source_url, "https://f10.com.br/");
    if (url) sourceToPath.set(url, result.get(asset.id));
  }
  return { byId: result, byUrl: sourceToPath };
}

export async function downloadExternalMedia(collected, assets, storedManifest, folder, options) {
  const local = resolveStoredMedia(assets, storedManifest);
  const records = [];
  for (const reference of collected.registry.values()) {
    const record = {
      url: reference.url, kind: reference.kind, articles: [...reference.articles],
      state: "pending", archivePath: null,
    };
    if (reference.kind === "youtube") {
      record.state = "youtube_link";
    } else if (local.byUrl.has(reference.url)) {
      record.state = "stored";
      record.archivePath = local.byUrl.get(reference.url);
    } else if (!options.includeMedia) {
      record.state = "skipped_by_option";
    } else {
      const key = createHash("sha256").update(reference.url).digest("hex").slice(0, 32);
      const temporary = join(folder, "media/external/" + key + ".partial");
      try {
        const response = await requestExternalMedia(reference.url);
        const mime = (response.headers.get("content-type") || "").toLowerCase();
        if (/^(?:text\/html|application\/(?:json|javascript|xhtml\+xml))\b/.test(mime)) {
          await response.body.cancel();
          throw new Error("BACKUP_MEDIA_UNEXPECTED_CONTENT_TYPE");
        }
        const extension = extensionFromResponse(reference, response);
        const result = await saveExternalResponse(response, temporary, options.maxMediaBytes);
        await validateExternalMedia(temporary, reference.kind);
        const archivePath = "media/external/" + key + extension;
        await rename(temporary, join(folder, archivePath));
        Object.assign(record, { state: "downloaded", archivePath, bytes: result.bytes, sha256: result.sha256 });
      } catch (cause) {
        await rm(temporary, { force: true });
        record.state = "failed";
        record.code = cause instanceof Error ? cause.message : "BACKUP_MEDIA_DOWNLOAD_FAILED";
      }
    }
    records.push(record);
  }
  await writeFile(join(folder, "media/external-manifest.json"), JSON.stringify({ records, unresolvedAttachments: collected.unresolved }, null, 2) + "\n", { mode: 0o600 });
  return { records, local, byUrl: new Map(records.map((row) => [row.url, row])),
    failures: records.filter((row) => row.state === "failed" || row.state === "skipped_by_option").length + collected.unresolved.length };
}

function mediaUrl(raw, baseUrl, external, fallback = null) {
  const url = normalizedUrl(raw, baseUrl);
  const item = url ? external.byUrl.get(url) : null;
  const path = item?.archivePath ?? (url ? external.local.byUrl.get(url) : null) ?? fallback;
  return path ? "../../" + path : null;
}

function renderMovideskContent(html, baseUrl, external) {
  let content = String(html ?? "");
  content = content.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(?:form|object|embed)\b[^>]*>[\s\S]*?<\/(?:form|object|embed)\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  content = content.replace(/<iframe\b[^>]*>(?:[\s\S]*?<\/iframe\s*>)?/gi, (tag) => {
    const url = normalizedUrl(attribute(tag, "src"), baseUrl);
    return url ? "<p><a href=\"" + escapeHtml(url) + "\">Abrir vídeo ou mídia externa</a></p>" : "";
  });
  content = content.replace(/<img\b[^>]*>/gi, (tag) => {
    const source = ["src", "data-src", "data-original", "data-lazy-src", "srcset"]
      .map((name) => attribute(tag, name).split(/\s*,\s*/)[0].split(/\s+/)[0])
      .find((value) => normalizedUrl(value, baseUrl));
    const src = mediaUrl(source, baseUrl, external);
    const alt = escapeHtml(attribute(tag, "alt"));
    return src ? "<img loading=\"lazy\" src=\"" + escapeHtml(src) + "\" alt=\"" + alt + "\">"
      : "<span class=\"missing\">Imagem não recuperada</span>";
  });
  content = content.replace(/<(?:video|source)\b[^>]*>/gi, (tag) => {
    const name = tag.startsWith("<video") ? "video" : "source";
    const src = mediaUrl(attribute(tag, "src"), baseUrl, external);
    if (name === "source") return src ? "<source src=\"" + escapeHtml(src) + "\">" : "";
    const poster = mediaUrl(attribute(tag, "poster"), baseUrl, external);
    return "<video controls preload=\"metadata\"" + (src ? " src=\"" + escapeHtml(src) + "\"" : "")
      + (poster ? " poster=\"" + escapeHtml(poster) + "\"" : "") + ">";
  });
  content = content.replace(/<a\b[^>]*>/gi, (tag) => {
    const href = normalizedUrl(attribute(tag, "href"), baseUrl);
    const local = mediaUrl(href, baseUrl, external);
    return "<a href=\"" + escapeHtml(local || href || "#") + "\">";
  });
  content = content.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "");
  const allowedTags = new Set(["p", "div", "span", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "strong", "b", "em", "i", "br", "hr", "table", "thead", "tbody",
    "tr", "td", "th", "pre", "code", "blockquote", "figure", "figcaption", "img", "a", "video", "source"]);
  content = content.replace(/<(\/?)([a-z][a-z0-9]*)\b([^>]*)>/gi, (tag, closing, name) => {
    const type = name.toLowerCase();
    if (!allowedTags.has(type)) return "";
    if (closing) return "</" + type + ">";
    return ["a", "img", "video", "source"].includes(type) ? tag : "<" + type + ">";
  });
  return content;
}

function documentHtml(title, body) {
  return "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">"
    + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
    + "<title>" + escapeHtml(title) + "</title><style>"
    + "body{font:16px/1.65 system-ui,sans-serif;color:#142033;max-width:900px;margin:32px auto;padding:0 22px}"
    + "img,video{max-width:100%;height:auto;border-radius:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}"
    + "a{color:#075cc4}h1,h2{line-height:1.25}article{overflow-wrap:anywhere}.missing{color:#9b3f18}"
    + "section{border-top:1px solid #e1e6ed;margin-top:24px;padding-top:16px}</style></head><body>"
    + body + "</body></html>";
}

async function writeOffline(folder, path, html) {
  const target = join(folder, path);
  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  await writeFile(target, html, { mode: 0o600 });
}

export async function renderOfflineArticles(data, folder, external) {
  const all = new Map();
  for (const cached of data.cachedMovidesk) {
    all.set(String(cached.source_id), {
      id: String(cached.source_id), title: cached.title,
      contentHtml: cached.source_html, contentText: cached.source_text, baseUrl: cached.source_url,
    });
  }
  const liveDirectory = join(folder, "movidesk/live-articles");
  const liveFiles = await readdir(liveDirectory).catch((error) => error.code === "ENOENT" ? [] : Promise.reject(error));
  for (const name of liveFiles.filter((value) => /^\d+\.json$/.test(value))) {
    const raw = JSON.parse(await readFile(join(liveDirectory, name), "utf8"));
    const previous = all.get(name.slice(0, -5)) ?? {};
    all.set(name.slice(0, -5), {
      id: name.slice(0, -5), title: raw.title || previous.title,
      contentHtml: raw.contentHtml || previous.contentHtml,
      contentText: raw.contentText || previous.contentText,
      baseUrl: previous.baseUrl || "https://ajuda.f10.com.br/kb/pt-br/article/" + name.slice(0, -5),
    });
  }
  const references = [];
  for (const article of all.values()) {
    const content = article.contentHtml
      ? renderMovideskContent(article.contentHtml, article.baseUrl, external)
      : "<pre>" + escapeHtml(article.contentText) + "</pre>";
    await writeOffline(folder, "offline/movidesk/" + article.id + ".html", documentHtml(article.title,
      "<p><a href=\"../index.html\">Índice</a></p><h1>" + escapeHtml(article.title) + "</h1><article>" + content + "</article>"));
    references.push({ type: "Movidesk", title: article.title, href: "movidesk/" + article.id + ".html" });
  }
  const featured = new Map(data.tables.help_content_featured_videos.map((row) => [row.content_id, row.asset_id]));
  const steps = new Map();
  for (const step of data.tables.help_content_steps) {
    const list = steps.get(step.content_id) ?? [];
    list.push(step);
    steps.set(step.content_id, list);
  }
  const blocks = new Map();
  for (const block of data.tables.help_step_blocks) {
    const list = blocks.get(block.step_id) ?? [];
    list.push(block);
    blocks.set(block.step_id, list);
  }
  const assets = new Map(data.tables.help_assets.map((row) => [row.id, row]));
  for (const article of data.tables.help_contents) {
    const parts = ["<p><a href=\"../index.html\">Índice</a></p>", "<h1>" + escapeHtml(article.title) + "</h1>"];
    if (article.summary) parts.push("<p>" + escapeHtml(article.summary) + "</p>");
    const featuredAsset = assets.get(featured.get(article.id));
    if (featuredAsset) {
      const file = external.local.byId.get(featuredAsset.id)
        || external.byUrl.get(normalizedUrl(featuredAsset.source_url, "https://f10.com.br/"))?.archivePath;
      if (file) parts.push("<video controls preload=\"metadata\" src=\"" + escapeHtml("../../" + file) + "\"></video>");
      else if (featuredAsset.source_url) parts.push("<p><a href=\"" + escapeHtml(featuredAsset.source_url) + "\">Abrir vídeo externo</a></p>");
    }
    for (const step of (steps.get(article.id) ?? []).sort((left, right) => left.sort_order - right.sort_order)) {
      parts.push("<section><h2>" + escapeHtml(step.title) + "</h2>");
      if (step.description) parts.push("<p>" + escapeHtml(step.description) + "</p>");
      for (const block of (blocks.get(step.id) ?? []).sort((left, right) => left.sort_order - right.sort_order)) {
        const asset = assets.get(block.asset_id);
        const saved = asset ? external.local.byId.get(asset.id)
          || external.byUrl.get(normalizedUrl(asset.source_url, "https://f10.com.br/"))?.archivePath : null;
        const href = saved ? "../../" + saved : null;
        if (block.block_type === "image") {
          parts.push(href ? "<p><img src=\"" + escapeHtml(href) + "\" alt=\"" + escapeHtml(asset?.alt_text) + "\"></p>"
            : "<p class=\"missing\">Imagem não recuperada</p>");
        } else if (asset?.asset_type === "video") {
          parts.push(href ? "<video controls preload=\"metadata\" src=\"" + escapeHtml(href) + "\"></video>"
            : asset.source_url ? "<p><a href=\"" + escapeHtml(asset.source_url) + "\">Abrir vídeo externo</a></p>" : "");
        } else if (block.block_type === "file") {
          parts.push(href ? "<p><a href=\"" + escapeHtml(href) + "\">Abrir anexo</a></p>" : "<p class=\"missing\">Anexo não recuperado</p>");
        } else if (block.block_type === "link") {
          const link = mediaUrl(block.link_url, "https://f10.com.br/", external) || normalizedUrl(block.link_url, "https://f10.com.br/");
          if (link) parts.push("<p><a href=\"" + escapeHtml(link) + "\">" + escapeHtml(block.link_label || "Abrir link") + "</a></p>");
        } else if (block.text_content) {
          parts.push("<pre>" + escapeHtml(block.text_content) + "</pre>");
        }
      }
      parts.push("</section>");
    }
    await writeOffline(folder, "offline/f10/" + article.id + ".html", documentHtml(article.title, parts.join("\n")));
    references.push({ type: "F10", title: article.title, href: "f10/" + article.id + ".html" });
  }
  const index = "<h1>Backup da Central de Ajuda F10</h1><p>Artigos e mídias recuperadas para consulta local. Vídeos do YouTube permanecem como links.</p>"
    + references.sort((left, right) => left.title.localeCompare(right.title, "pt-BR"))
      .map((article) => "<p><strong>" + article.type + "</strong> · <a href=\"" + escapeHtml(article.href) + "\">" + escapeHtml(article.title) + "</a></p>").join("\n");
  await writeOffline(folder, "offline/index.html", documentHtml("Índice de artigos F10", index));
  return { movideskArticles: all.size, f10Articles: data.tables.help_contents.length };
}