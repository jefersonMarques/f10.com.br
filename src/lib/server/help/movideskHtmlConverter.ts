import { env } from "$env/dynamic/private";
import { normalizeHelpSlug } from "$lib/server/help/helpArticleRepository";
import type { HelpImportContent, HelpImportBlock } from "$lib/server/help/structuredHelpImport";
import type { HelpImportPackageAsset } from "$lib/server/help/helpImportPackage";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_COUNT = 60;
const SAFE_IMAGE_HOST = /(^|\.)(movidesk\.com)$/i;
const SAFE_S3_HOST = /^(?:[a-z0-9.-]+\.)?s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i;
const ENTITY_NAMES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  bull: "•", ndash: "–", mdash: "—", hellip: "…",
  aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú",
  agrave: "à", atilde: "ã", otilde: "õ", ccedil: "ç",
  ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’", laquo: "«", raquo: "»",
  euro: "€", reg: "®", copy: "©", trade: "™",
  ecirc: "ê", acirc: "â", ocirc: "ô", ucirc: "û", icirc: "î",
  egrave: "è", euml: "ë", uuml: "ü", ouml: "ö", auml: "ä",
  Aacute: "Á", Eacute: "É", Iacute: "Í", Oacute: "Ó", Uacute: "Ú",
};

function decode(value: string): string {
  let output = value;
  // Movidesk costuma devolver entidades HTML duplamente escapadas.
  for (let pass = 0; pass < 3; pass++) {
    const next = output.replace(/&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi, (raw, name: string) => {
      if (name.startsWith("#")) {
        const hex = name[1]?.toLowerCase() === "x";
        const code = Number.parseInt(name.slice(hex ? 2 : 1), hex ? 16 : 10);
        return Number.isFinite(code) && code >= 32 && code <= 0x10ffff
          && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : raw;
      }
      return ENTITY_NAMES[name] ?? ENTITY_NAMES[name.toLowerCase()] ?? raw;
    });
    if (next === output) break;
    output = next;
  }
  return output;
}

function attribute(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decode(match?.[1] ?? match?.[2] ?? match?.[3] ?? "").trim();
}

function imageSource(tag: string): string {
  const direct = attribute(tag, "src");
  const alternatives = [
    direct, attribute(tag, "data-src"), attribute(tag, "data-original"),
    attribute(tag, "data-lazy-src"), attribute(tag, "srcset").split(",")[0]?.trim().split(/\s+/)[0] ?? "",
  ];
  return alternatives.find((url) => url && !/^(?:data|blob):/i.test(url)) ?? direct;
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

function youtubeWatchUrl(raw: string, baseUrl: string): string | null {
  const href = safeHttpUrl(raw, baseUrl);
  if (!href) return null;
  const url = new URL(href);
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  let id = "";
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? "";
  else if (["youtube.com", "www.youtube.com", "m.youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"].includes(host)) {
    if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
    else if (/^\/(?:embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split("/")[2] ?? "";
  }
  return /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
}

function mp4Url(raw: string, baseUrl: string): string | null {
  const href = safeHttpUrl(raw, baseUrl);
  if (!href) return null;
  const url = new URL(href);
  // Somente mídia HTTPS explícita, sem executáveis ou embeds de terceiros.
  return url.protocol === "https:" && /\.mp4$/i.test(url.pathname) ? url.href : null;
}

function mediaUrl(raw: string, baseUrl: string): URL {
  const value = safeHttpUrl(raw, baseUrl);
  if (!value) throw new Error("MOVIDESK_IMAGE_URL_INVALID");
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const additionalHosts = (env.MOVIDESK_IMAGE_ALLOWED_HOSTS ?? "")
    .split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  // Apenas hosts HTTPS explicitamente permitidos, nunca IPs, localhost ou wildcards.
  const allowed = SAFE_IMAGE_HOST.test(host) || ["f10.com.br", "www.f10.com.br", "ajuda.f10.com.br"].includes(host)
    || SAFE_S3_HOST.test(host)
    || (additionalHosts.includes(host)
      && /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(host)
      && host.includes(".") && !/^(?:\d+\.){3}\d+$/.test(host)
      && !host.endsWith(".local") && !host.endsWith(".internal"));
  // Imagens antigas da base podem referenciar HTTP em origens já confiáveis.
  // Força TLS antes do download, sem permitir servidores arbitrários.
  if (allowed && url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:" || !allowed) {
    throw new Error(`MOVIDESK_IMAGE_HOST_NOT_ALLOWED:${host.slice(0, 150)}`);
  }
  return url;
}

function movideskStorageHash(url: URL): string | null {
  if (url.protocol !== "https:" || url.hostname !== "s3.amazonaws.com") return null;
  return /^\/movidesk-files\/([a-f0-9]{32})\/?$/i.exec(url.pathname)?.[1] ?? null;
}

function validateMovideskSignedImage(url: URL, expectedHash: string): void {
  if (url.hostname !== "s3.amazonaws.com"
    || url.pathname.toLowerCase() !== `/movidesk-files/${expectedHash.toLowerCase()}`) {
    throw new Error("MOVIDESK_IMAGE_STORAGE_REDIRECT_INVALID");
  }

  const expiry = Number(url.searchParams.get("Expires"));
  if (!Number.isSafeInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)
    || !url.searchParams.get("AWSAccessKeyId") || !url.searchParams.get("Signature")) {
    throw new Error("MOVIDESK_IMAGE_STORAGE_SIGNATURE_INVALID");
  }
}

async function downloadImage(src: string, baseUrl: string, index: number, expectedHash?: string): Promise<{
  asset: HelpImportPackageAsset; path: string;
}> {
  let url = mediaUrl(src, baseUrl);
  const hash = movideskStorageHash(url);
  if (hash) {
    // O HTML da API contém S3 sem assinatura; a rota de download gera uma URL temporária válida.
    if (expectedHash && expectedHash.toLowerCase() !== hash.toLowerCase()) {
      throw new Error("MOVIDESK_IMAGE_STORAGE_REDIRECT_INVALID");
    }
    expectedHash = hash;
    url = new URL("https://f10.movidesk.com/Storage/Download");
    url.searchParams.set("id", hash);
  }
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(25_000),
      headers: { "User-Agent": "F10-Help-Migration/1.0" },
    });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) throw new Error("MOVIDESK_IMAGE_REDIRECT_INVALID");
    const next = mediaUrl(location, url.href);
    if (expectedHash) validateMovideskSignedImage(next, expectedHash);
    url = next;
    response = null;
  }
  if (!response) throw new Error("MOVIDESK_IMAGE_REDIRECT_LIMIT");
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`MOVIDESK_IMAGE_HTTP_${response.status}`);
  }
  if (expectedHash) {
    try {
      validateMovideskSignedImage(url, expectedHash);
    } catch (cause) {
      await response.body?.cancel();
      throw cause;
    }
  }
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_IMAGE_BYTES) {
    await response.body?.cancel();
    throw new Error("MOVIDESK_IMAGE_TOO_LARGE");
  }
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

// Reutiliza a validação de URL, redirects, tamanho e assinatura da importação original.
// Não altera nenhum bloco ou passo durante o espelhamento posterior.
export async function downloadMovideskImageSource(sourceUrl: string, expectedHash?: string): Promise<HelpImportPackageAsset> {
  const result = await downloadImage(sourceUrl, sourceUrl, 1, expectedHash);
  return result.asset;
}

function stripLegacyNavigation(html: string): string {
  return html.replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, (original) => {
    const label = decode(original.replace(/<[^>]*>/g, ""))
      .replace(/\s+/g, " ").trim();
    return /^(?:pr[oó]ximo|anterior)\s*:/i.test(label)
      && /\/kb\/(?:[a-z]{2}-[a-z]{2}\/)?article\/\d+/i.test(original)
      ? "" : original;
  });
}

function organizeSteps(steps: HelpImportContent["steps"]): HelpImportContent["steps"] {
  const organized: HelpImportContent["steps"] = [];
  for (const section of steps) {
    const synthetic = /^(?:Conteúdo original|Seção|Imagem \d+)$/i.test(section.title);
    let group: HelpImportBlock[] = [];
    let chars = 0;
    let texts = 0;
    let images = 0;
    let part = 0;
    function commit(): void {
      if (!group.length) return;
      part++;
      const first = group[0]!;
      const media = group.filter(block => block.type === "link"
        && (block.label === "Vídeo do YouTube" || block.label === "Vídeo MP4"));
      const lead = group.find((block): block is Extract<HelpImportBlock, { type: "text" }> =>
        block.type === "text" && block.text.trim().length > 0);
      const plainLead = lead?.text.replace(/[*_#]/g, "")
        .replace(/\s+/g, " ").trim() ?? "";
      const sentence = plainLead.match(/^.{1,90}?(?:[.!?:;](?=\s|$)|$)/)?.[0] ?? plainLead;
      const excerpt = sentence.length > 78
        ? sentence.slice(0, 75).replace(/\s+\S*$/, "") + "…"
        : sentence;
      const title = !synthetic
        ? (part === 1 ? section.title : section.title + " · continuação")
        : first.type === "image" ? "Imagem e orientações"
        : media.length && first.type === "link" ? (media.length > 1 ? "Vídeos e orientações" : "Vídeo e orientações")
        : excerpt || "Orientações do artigo";
      organized.push({ title: title.slice(0, 160), blocks: group });
      group = [];
      chars = 0;
      texts = 0;
      images = 0;
    }
    for (const block of section.blocks) {
      if (block.type === "text") {
        block.text = block.text.replace(/\u00a0/g, " ")
          .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
        if (!block.text) continue;
      }
      const len = block.type === "text" ? block.text.length : 0;
      if (group.length && ((block.type === "image" && images > 0)
        || (block.type === "text" && (texts >= 3 || chars + len > 1500))
        || group.length >= 14)) commit();
      group.push(block);
      chars += len;
      if (block.type === "text") texts++;
      if (block.type === "image") images++;
    }
    commit();
  }
  return organized;
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
  resolveArticleUrl?: (sourceId: number) => string | null;
}): Promise<{
  content: HelpImportContent;
  assets: Map<string, HelpImportPackageAsset>;
  issues: string[];
  primaryVideo: { url: string; kind: "youtube" | "mp4" } | null;
}> {
  const issues: string[] = [];
  const originalSlice = input.html.slice(0, 2_000_000);
  const html = stripLegacyNavigation(originalSlice);
  if (originalSlice.length < input.html.length) issues.push("HTML original maior que o limite de conversão.");
  const iframes = html.match(/<iframe\b[^>]*>/gi) ?? [];
  const unknownIframes = iframes.some(tag => {
    const src = attribute(tag, "src");
    return !youtubeWatchUrl(src, input.sourceUrl) && !mp4Url(src, input.sourceUrl);
  });
  if (/<(?:table|object|audio|math|form|script|style)\b/i.test(html) || unknownIframes) {
    issues.push("Elementos especiais do HTML exigem conferência.");
  }
  if (input.attachments.length) issues.push(`${input.attachments.length} anexo(s) precisam ser conferidos e copiados manualmente.`);

  const steps: HelpImportContent["steps"] = [];
  const assets = new Map<string, HelpImportPackageAsset>();
  let currentTitle = "Conteúdo original";
  let blocks: HelpImportBlock[] = [];
  let paragraph = "";
  let imageIndex = 0;
  let pendingLink: { href: string; label: string; skip: boolean } | null = null;
  let videoSourceHandled = false;

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
    .replace(/<(script|style|object|svg|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  const tokens = cleaned.match(/<[^>]*>|[^<]+/g) ?? [];
  const images: Array<{ src: string; alt: string; block: HelpImportBlock }> = [];

  for (const token of tokens) {
    if (!token.startsWith("<")) { appendText(token); continue; }
    const tag = token.match(/^<\s*(\/?)\s*([a-z][\w:-]*)/i);
    if (!tag) continue;
    const closing = Boolean(tag[1]);
    const name = tag[2]!.toLowerCase();
    if (name === "iframe" || name === "video" || name === "source" || name === "embed") {
      if (name === "video" && closing) {
        videoSourceHandled = false;
        continue;
      }
      if (name === "video" && !closing) videoSourceHandled = false;
      if (name === "source" && videoSourceHandled) continue;
      if (!closing) {
        const rawSrc = attribute(token, "src") || attribute(token, "data-src");
        const youtube = youtubeWatchUrl(rawSrc, input.sourceUrl);
        const mp4 = mp4Url(rawSrc, input.sourceUrl);
        const href = youtube || mp4 || safeHttpUrl(rawSrc, input.sourceUrl);
        if (href) {
          flushParagraph();
          blocks.push({ type: "link", url: href, label: youtube ? "Vídeo do YouTube" : mp4 ? "Vídeo MP4" : "Abrir mídia original" });
          if (name === "source" || name === "video") videoSourceHandled = true;
          if (!youtube && !mp4) issues.push("Mídia externa não reconhecida: conferir o arquivo.");
        }
      }
      continue;
    }
    if (name === "img" && !closing) {
      flushParagraph();
      imageIndex++;
      if (imageIndex > MAX_IMAGE_COUNT) {
        issues.push("Muitos screenshots: imagens adicionais disponíveis no artigo original.");
        const href = safeHttpUrl(imageSource(token), input.sourceUrl);
        if (href) blocks.push({ type: "link", url: href, label: "Ver imagem original" });
        continue;
      }
      // Um screenshot por etapa é uma regra de publicação do F10.
      flushStep();
      currentTitle = `Imagem ${imageIndex}`;
      const block: HelpImportBlock = { type: "image", url: "", altText: attribute(token, "alt") || `Imagem do artigo ${input.title}` };
      blocks.push(block);
      images.push({ src: imageSource(token), alt: attribute(token, "alt"), block });
      continue;
    }
    if (name === "a") {
      if (!closing) {
        const nextLabel = /(?:^|\n)\s*(?:pr[oó]ximo|anterior)\s*:\s*$/i;
        const last = blocks.at(-1);
        const skip = nextLabel.test(paragraph)
          || (last?.type === "text" && nextLabel.test(last.text));
        if (skip) {
          paragraph = paragraph.replace(nextLabel, "");
          if (last?.type === "text" && nextLabel.test(last.text)) {
            const remaining = last.text.replace(nextLabel, "").trim();
            if (remaining) last.text = remaining;
            else blocks.pop();
          }
        }
        flushParagraph();
        pendingLink = { href: attribute(token, "href"), label: "", skip };
      } else if (pendingLink) {
        if (!pendingLink.skip) {
          let href = safeHttpUrl(pendingLink.href, input.sourceUrl);
          if (href) {
            const url = new URL(href);
            const match = /^\/kb\/(?:[a-z]{2}-[a-z]{2}\/)?article\/(\d+)(?:\/|$)/i.exec(url.pathname);
            if ((url.hostname === "f10.movidesk.com" || url.hostname === "ajuda.f10.com.br") && match) {
              const sourceId = Number(match[1]);
              const native = input.resolveArticleUrl?.(sourceId);
              const fallback = normalizeHelpSlug(url.pathname.split("/").at(-1) || "")
                || `movidesk-${sourceId}`;
              href = native || `https://f10.com.br/ajuda-f10/${encodeURIComponent(fallback)}`;
              if (!native) issues.push(`Link do artigo #${sourceId} precisa de conferência no F10.`);
            }
            blocks.push({ type: "link", url: href, label: pendingLink.label.trim() || href });
          } else {
            paragraph += pendingLink.label;
          }
        }
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
    if (name === "p" && closing) {
      flushParagraph();
      continue;
    }
    if (name === "br" || name === "p" || name === "div" || name === "li" || name === "tr") {
      if (name === "br" || closing) paragraph += "\n";
    }
    if ((name === "b" || name === "strong") && !pendingLink) paragraph += "**";
    if ((name === "i" || name === "em") && !pendingLink) paragraph += "*";
    if (name === "td" || name === "th") if (closing) paragraph += " | ";
  }
  flushStep();
  if (!steps.length && input.text.trim()) {
    steps.push({ title: "Conteúdo original", blocks: [{ type: "text", text: decode(input.text).slice(0, 50_000) }] });
  }
  if (!steps.length) throw new Error("MOVIDESK_ARTICLE_EMPTY");

  // Imagem individual com problema não bloqueia a importação do artigo inteiro.
  for (let i = 0; i < images.length; i++) {
    const image = images[i]!;
    try {
      const saved = await downloadImage(image.src, input.sourceUrl, i + 1);
      assets.set(saved.path, saved.asset);
      if (image.block.type === "image") image.block.url = `package:${saved.path}`;
    } catch (cause) {
      const issue = cause instanceof Error && cause.message.startsWith("MOVIDESK_")
        ? cause.message : "MOVIDESK_IMAGE_IMPORT_FAILED";
      issues.push(`Imagem ${i + 1}: ${issue}. Conferir no original.`);
      const fallback = safeHttpUrl(image.src, input.sourceUrl);
      if (image.block.type === "image" && fallback) {
        // Mantém um bloco de imagem real mesmo sem espelhar o arquivo,
        // para revisão ou importação posterior, em vez de perder a estrutura.
        image.block.url = fallback;
      } else if (image.block.type === "image") {
        Object.assign(image.block, { type: "notice", text: "Imagem indisponível. Consulte o artigo original.", variant: "warning" });
      }
    }
  }

  // Primeiro vídeo do artigo vira o vídeo principal nativo do F10.
  // Vídeos adicionais permanecem na posição original como blocos auxiliares.
  let primaryVideo: { url: string; kind: "youtube" | "mp4" } | null = null;
  for (const step of steps) {
    const videoIndex = step.blocks.findIndex(block => block.type === "link"
      && (block.label === "Vídeo do YouTube" || block.label === "Vídeo MP4"));
    if (videoIndex < 0) continue;
    const block = step.blocks[videoIndex]!;
    if (block.type !== "link") continue;
    primaryVideo = {
      url: block.url,
      kind: block.label === "Vídeo MP4" ? "mp4" : "youtube",
    };
    // Evita duplicar o vídeo no topo e dentro do texto.
    if (steps.some(item => item.blocks.some(other => other !== block))) {
      step.blocks.splice(videoIndex, 1);
    }
    break;
  }

  const organized = organizeSteps(steps);
  if (organized.length > 80) throw new Error("MOVIDESK_STEP_LIMIT");
  if (organized.some(step => step.blocks.length > 80)) throw new Error("MOVIDESK_BLOCK_LIMIT");
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
      steps: organized,
    },
    assets,
    issues,
    primaryVideo,
  };
}
