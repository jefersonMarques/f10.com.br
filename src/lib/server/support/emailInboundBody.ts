/**
 * Select the most complete inbound email body, never accepting nonempty
 * Brevo ExtractedMarkdownMessage as proof that it contains the whole message.
 * HTML is converted to inert text, never injected as executable HTML.
 */
export type InboundBodySource = "markdown" | "plain" | "html" | "fallback";

export type SelectedInboundBody = {
  text: string;
  source: InboundBodySource;
  markdownWords: number;
  plainWords: number;
  htmlWords: number;
};

const MAX_BODY_CHARS = 150_000;
const entities: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", hellip: "…", bull: "•",
  copy: "©", reg: "®", trade: "™", euro: "€", rsquo: "’", lsquo: "‘",
  rdquo: "”", ldquo: "“", laquo: "«", raquo: "»",
  aacute: "á", agrave: "à", acirc: "â", atilde: "ã",
  eacute: "é", ecirc: "ê", iacute: "í", oacute: "ó",
  ocirc: "ô", otilde: "õ", uacute: "ú", uuml: "ü",
  ccedil: "ç", ntilde: "ñ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#(?:[xX][0-9a-fA-F]+|\d+)|[a-zA-Z][a-zA-Z\d]+);/g, (whole, raw: string) => {
    if (raw.startsWith("#")) {
      const hex = raw[1]?.toLowerCase() === "x";
      const numeric = Number.parseInt(raw.slice(hex ? 2 : 1), hex ? 16 : 10);
      return numeric > 0 && numeric <= 0x10ffff &&
        !(numeric >= 0xd800 && numeric <= 0xdfff)
        ? String.fromCodePoint(numeric) : whole;
    }
    const replacement = entities[raw.toLowerCase()];
    if (!replacement) return whole;
    return /^[A-Z]/.test(raw) && replacement.length === 1
      ? replacement.toUpperCase() : replacement;
  });
}

export function visibleEmailHtml(html: string): string {
  if (!html.trim()) return "";
  const cleaned = html.slice(0, MAX_BODY_CHARS * 4)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(head|script|style|noscript|template|svg|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\s*br\b[^>]*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "\n- ")
    .replace(/<\/\s*(?:p|div|tr|td|th|table|ul|ol|li|blockquote|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*(?:b|strong)\b[^>]*>/gi, "**")
    .replace(/<\/\s*(?:b|strong)\s*>/gi, "**")
    .replace(/<\s*(?:i|em)\b[^>]*>/gi, "*")
    .replace(/<\/\s*(?:i|em)\s*>/gi, "*")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(cleaned)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_BODY_CHARS);
}

function meaningfulWords(text: string): string[] {
  const withoutSyntax = text
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/\\([\\\x60*_{}\[\]()#+\-.!>~])/g, "$1")
    .normalize("NFKD").replace(/\p{M}/gu, "")
    .toLowerCase();
  return withoutSyntax.match(/[\p{L}\p{N}]{2,}/gu) ?? [];
}

function missingWordCount(reference: string[], candidate: string[]): number {
  const available = new Map<string, number>();
  for (const word of reference) available.set(word, (available.get(word) ?? 0) + 1);
  let missing = 0;
  for (const word of candidate) {
    const count = available.get(word) ?? 0;
    if (count > 0) available.set(word, count - 1);
    else missing++;
  }
  return missing;
}

export function selectInboundEmailBody(input: {
  markdown?: unknown;
  plain?: unknown;
  html?: unknown;
}): SelectedInboundBody {
  const markdown = typeof input.markdown === "string" ? input.markdown.trim().slice(0, MAX_BODY_CHARS) : "";
  const plain = typeof input.plain === "string" ? input.plain.trim().slice(0, MAX_BODY_CHARS) : "";
  const html = visibleEmailHtml(typeof input.html === "string" ? input.html : "");
  const options: Array<{ source: InboundBodySource; text: string; words: string[] }> = [
    { source: "markdown", text: markdown, words: meaningfulWords(markdown) },
    { source: "plain", text: plain, words: meaningfulWords(plain) },
    { source: "html", text: html, words: meaningfulWords(html) },
  ];
  let chosen = options.find((option) => option.text.length > 0);

  for (const option of options.slice(1)) {
    if (!option.text || !chosen) {
      if (option.text && !chosen) chosen = option;
      continue;
    }
    if (option.words.length > chosen.words.length &&
        missingWordCount(chosen.words, option.words) > 0) {
      chosen = option;
    }
  }

  // Prefer safe rich-text conversion when it contains every word from the
  // selected source, even if HTML also preserves additional signature text.
  if (chosen && chosen.source !== "html" && html &&
      /(?:\\*\\*[^*]+\\*\\*|\\*[^*\\n]+\\*)/.test(html)) {
    const htmlWords = options[2].words;
    if (missingWordCount(htmlWords, chosen.words) === 0) {
      chosen = options[2];
    }
  }
  return {
    text: chosen?.text || "Mensagem recebida por e-mail.",
    source: chosen?.source ?? "fallback",
    markdownWords: options[0].words.length,
    plainWords: options[1].words.length,
    htmlWords: options[2].words.length,
  };
}
