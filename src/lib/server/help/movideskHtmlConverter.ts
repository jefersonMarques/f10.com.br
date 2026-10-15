import { normalizeHelpSlug } from "$lib/server/help/helpArticleRepository";
import type { HelpImportContent, HelpImportBlock } from "$lib/server/help/structuredHelpImport";
import type { HelpImportPackageAsset } from "$lib/server/help/helpImportPackage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_COUNT = 60;
const SAFE_IMAGE_HOST = /(^|\.)(movidesk\.com)$/i;
const ENTITY_NAMES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  bull: "•", ndash: "–", mdash: "—", hellip: "…",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  agrave: "à", atilde: "ã", otilde: "õ", ccedil: "ç",
};

function decode(value: string): string {
  return value.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (raw, name: string) => {
    if (name.startsWith("#")) {
      const hex = name[1]?.toLowerCase() === "x";
      const code = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code >= 32 && code <= 0x10ffff
        ? String.fromCodePoint(code) : raw;
    }
    return ENTITY_NAMES[name.toLowerCase()] ?? raw;
  });
}

function attribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decode(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function safeHttpUrl(raw: string, baseUrl: string): string | null {
  if (!raw || /^(?:javascript|data|file|vbscript):/i.test(raw.trim())) return null;
  try {
    const value = new URL(raw, baseUrl);
    return value.protocol === "https:" || value.protocol === "http:" ? value.href : null;
  } catch {
    return null;
  }
}

function mediaUrl(raw: string, baseUrl: string): URL {
  const value = safeHttpUrl(raw, baseUrl);
  if (!value) throw new Error("MOVIDESK_IMAGE_URL_INVALID");
  const url = new URL(value);
  if (url.protocol !== "https:" || !(SAFE_IMAGE_HOST.test(url.hostname) || url.hostname === "ajuda.f10.com.br")) {
    throw new Error("MOVIDESK_IMAGE_HOST_NOT_ALLOWED");
  }
  return url;
}

async function downloadImage(src: string, baseUrl: string, index: number): Promise<{
  asset: HelpImportPackageAsset; path: string;
}> {
  const url = mediaUrl(src, baseUrl);
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(25_000),
    headers: { "User-Agent": "F10-Help-Migration/1.0" },
  });
  if (!response.ok) throw new Error(`MOVIDESK_IMAGE_HTTP_${response.status}`);
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error("MOVIDESK_IMAGE_TOO_LARGE");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error("MOVIDESK_IMAGE_TOO_LARGE");
  const isPng = bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
  const isJpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const isWebp = new TextDecoder().decode(bytes.subarray(0,4)) === "RIFF"
    && new TextDecoder().decode(bytes.subarray(8,12)) === "WEBP";
  if (!isPng && !isJpg && !isWebp) throw new Error("MOVIDESK_IMAGE_FORMAT_UNSUPPORTED");
  const extension = isPng ? "png" : isJpg ? "jpg" : "webp";
  const path = `screenshots/movidesk-${index}.${extension}`;
  return {
    path,
    asset: {
      path,
      fileName: `movidesk-${index}.${extension}`,
      mimeType: isPng ? "image/png" : isJpg ? "image/jpeg" : "image/webp",
      bytes,
    },
  };
}

export async function convertMovideskHtml(input: {
  sourceId: number;
  title: string;
  slug: string;
  summary: string;
  sourceUrl: string;
  html: string;
  text: string;
  categorySlugs: string[];
  attachments: Array<{ name: string }>;
}): Promise<{
  content: HelpImportContent;
  assets: Map<string, HelpImportPackageAsset>;
  issues: string[];
}> {
  const issues: string[] = [];
  const html = input.html.slice(0, 2_000_000);
  if (html.length < input.html.length) issues.push("HTML original maior que o limite de conversão.");
  if (/<(?:table|iframe|object|embed|video|audio|svg|math|form|script|style)\b/i.test(html)) {
    issues.push("HTML complexo: confira a formatação no artigo importado.");
  }
  if (input.attachments.length) issues.push(`${input.attachments.length} anexo(s) precisam ser conferidos e copiados manualmente.`);

  const steps: HelpImportContent["steps"] = [];
  const assets = new Map<string, HelpImportPackageAsset>();
  let currentTitle = "Conteúdo original";
  let blocks: HelpImportBlock[] = [];
  let paragraph = "";
  let imageIndex = 0;
  let pendingLink: { href: string; label: string } | null = null;

  function flushParagraph(): void {
    const text = paragraph.replace(/[ \t]+/g, " ").replace(/\n[ \t]+/g, "\n").trim();
    paragraph = "";
    if (text) blocks.push({ type: "text", text: text.slice(0, 50_000) });
    if (text.length > 50_000) issues.push("Trecho longo dividido para revisão.");
  }
  function flushStep(): void {
    flushParagraph();
    if (blocks.length) steps.push({ title: currentTitle.slice(0, 160), blocks });
    blocks = [];
  }
  function appendText(raw: string): void {
    if (pendingLink) pendingLink.label += decode(raw);
    else paragraph += decode(raw);
  }

  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|svg|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const tokens = cleaned.match(/<[^>]*>|[^<]+/g) ?? [];
  const images: Array<{ src: string; alt: string; block: HelpImportBlock }> = [];

  for (const token of tokens) {
    if (!token.startsWith("<")) { appendText(token); continue; }
    const tag = token.match(/^<\s*(\/?)\s*([a-z][\w:-]*)/i);
    if (!tag) continue;
    const closing = Boolean(tag[1]);
    const name = tag[2]!.toLowerCase();
    if (name === "img" && !closing) {
      flushParagraph();
      if (++imageIndex > MAX_IMAGE_COUNT) throw new Error("MOVIDESK_IMAGE_COUNT_LIMIT");
      // Um screenshot por etapa é uma regra de publicação do F10.
      flushStep();
      currentTitle = `Imagem ${imageIndex}`;
      const block: HelpImportBlock = { type: "image", url: "", altText: attribute(token, "alt") || `Imagem do artigo ${input.title}` };
      blocks.push(block);
      images.push({ src: attribute(token, "src"), alt: attribute(token, "alt"), block });
      continue;
    }
    if (name === "a") {
      if (!closing) {
        flushParagraph();
        pendingLink = { href: attribute(token, "href"), label: "" };
      } else if (pendingLink) {
        const href = safeHttpUrl(pendingLink.href, input.sourceUrl);
        if (href) blocks.push({ type: "link", url: href, label: pendingLink.label.trim() || href });
        else paragraph += pendingLink.label;
        pendingLink = null;
      }
      continue;
    }
    if ((name === "h1" || name === "h2" || name === "h3" || name === "h4") && !closing) {
      flushStep();
      currentTitle = "Seção";
      continue;
    }
    if ((name === "h1" || name === "h2" || name === "h3" || name === "h4") && closing) {
      currentTitle = paragraph.trim().slice(0, 160) || currentTitle;
      paragraph = "";
      continue;
    }
    if (name === "li" && !closing) paragraph += "\n- ";
    if (name === "br" || name === "p" || name === "div" || name === "li" || name === "tr") {
      if (name === "br" || closing) paragraph += "\n";
    }
    if ((name === "b" || name === "strong") && !pendingLink) paragraph += "**";
    if ((name === "i" || name === "em") && !pendingLink) paragraph += "*";
    if (name === "td" || name === "th") if (closing) paragraph += " | ";
  }
  flushStep();
  if (!steps.length && input.text.trim()) {
    steps.push({ title: "Conteúdo original", blocks: [{ type: "text", text: input.text.slice(0, 50_000) }] });
  }
  if (!steps.length) throw new Error("MOVIDESK_ARTICLE_EMPTY");

  // Não substitui imagens por links externos: falha explicitamente se não puder copiá-las.
  for (let i = 0; i < images.length; i++) {
    const image = images[i]!;
    const saved = await downloadImage(image.src, input.sourceUrl, i + 1);
    assets.set(saved.path, saved.asset);
    if (image.block.type === "image") image.block.url = `package:${saved.path}`;
  }

  if (steps.length > 80) throw new Error("MOVIDESK_STEP_LIMIT");
  if (steps.some(step => step.blocks.length > 80)) throw new Error("MOVIDESK_BLOCK_LIMIT");
  return {
    content: {
      externalId: String(input.sourceId),
      title: input.title.slice(0, 160),
      slug: normalizeHelpSlug(input.slug || input.title) || `movidesk-${input.sourceId}`,
      summary: input.summary.slice(0, 320),
      categories: input.categorySlugs.slice(0, 12).map(slug => ({ slug })),
      searchAliases: [],
      assistantKnowledge: "",
      internalSupportNotes: "",
      steps,
    },
    assets,
    issues,
  };
}
