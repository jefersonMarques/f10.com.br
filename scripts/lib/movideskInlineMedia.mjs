const S3_LINK_PATTERN = /https:\/\/s3\.amazonaws\.com\/movidesk-files\/([a-f0-9]{32})(?:\?[^\s<>"'()[\]{}*]*)?/gi;
const HTML_IMAGE_PATTERN = /<img\b[^>]*>/gi;
const HTML_LINK_PATTERN = /<a\b[^>]*>/gi;

function sourceHash(url) {
  const match = String(url).match(/^https:\/\/s3\.amazonaws\.com\/movidesk-files\/([a-f0-9]{32})(?:[?#].*)?$/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function originalNameBefore(body, index) {
  const prefix = body.slice(Math.max(0, body.lastIndexOf("\n", index) + 1), index);
  const match = prefix.match(/([^\n\r]{1,180}?)\s*\((?:\d+(?:[.,]\d+)?\s*(?:B|KB|MB|GB))\)\s*-\s*$/i);
  return match?.[1]?.trim() ?? null;
}

export function inlineSourceLinks(body) {
  if (typeof body !== "string") return [];
  const sources = [];
  for (const match of body.matchAll(S3_LINK_PATTERN)) {
    const hash = match[1]?.toUpperCase();
    if (!hash) continue;
    sources.push({
      hash,
      sourceUrl: match[0],
      name: originalNameBefore(body, match.index ?? 0),
    });
  }
  return sources;
}

export function htmlContentImages(html) {
  if (typeof html !== "string") return [];
  const images = [];
  const seen = new Set();

  for (const [tag] of html.matchAll(HTML_IMAGE_PATTERN)) {
    const className = tag.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    if (/\b(picture|avatar|profile-photo)\b/i.test(className)) continue;

    const src = tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i)?.[1];
    const hash = src ? sourceHash(src.replaceAll("&amp;", "&")) : null;
    if (!hash || seen.has(hash)) continue;

    seen.add(hash);
    const alt = tag.match(/\balt\s*=\s*["']([^"']*)["']/i)?.[1] ?? "";
    images.push({ hash, name: alt.slice(0, 180) || null });
  }
  return images;
}

export function htmlContentLinks(html) {
  if (typeof html !== "string") return [];
  const links = [];
  const seen = new Set();

  for (const [tag] of html.matchAll(HTML_LINK_PATTERN)) {
    const href = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1];
    const hash = href ? sourceHash(href.replaceAll("&amp;", "&")) : null;
    if (!hash || seen.has(hash)) continue;
    seen.add(hash);
    const name = tag.match(/\btitle\s*=\s*["']([^"']*)["']/i)?.[1];
    links.push({ hash, name: name?.slice(0, 180) || null });
  }
  return links;
}

export function rewriteStoredLinks(body, attachmentsByHash, ticketId) {
  let replaced = 0;
  const updated = body.replace(S3_LINK_PATTERN, (url, rawHash) => {
    const attachment = attachmentsByHash.get(rawHash.toUpperCase());
    if (!attachment) return url;

    replaced += 1;
    const href = "/api/app/tickets/" + ticketId + "/attachments/" + attachment.id;
    return "[Abrir arquivo](" + href + ")";
  });
  return { body: updated, replaced };
}

export function isImageAttachment(attachment) {
  return typeof attachment?.mimeType === "string" &&
    attachment.mimeType.toLowerCase().startsWith("image/");
}
