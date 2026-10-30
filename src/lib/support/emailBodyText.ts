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
    .replace(/<!doctype\b[^>]*>/gi, "")
    .replace(/<(head|script|style|noscript|template|svg|iframe|object)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<\s*(?:meta|link|base)\b[^>]*>/gi, "")
    .replace(/<\s*br\b[^>]*>/gi, "\n")
    .replace(/<\s*li\b[^>]*>/gi, "\n- ")
    .replace(/<\/\s*(?:p|div|tr|td|th|table|ul|ol|li|blockquote|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*(?:b|strong)\b[^>]*>/gi, "**")
    .replace(/<\/\s*(?:b|strong)\s*>/gi, "**")
    .replace(/<\s*(?:i|em)\b[^>]*>/gi, "*")
    .replace(/<\/\s*(?:i|em)\s*>/gi, "*")
    .replace(/<\/?(?:html|body|div|p|span|font|b|strong|i|em|u|table|thead|tbody|tfoot|tr|td|th|ul|ol|li|a|blockquote|h[1-6]|section|article|header|footer|main|pre|code|center|hr|img)\b[^>]*>/gi, "");
  return decodeEntities(cleaned)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_BODY_CHARS);
}


const MARKUP_PATTERN = /<(?:!doctype|\/?(?:html|head|body|meta|div|p|br|table|tr|td|li|blockquote|strong|em|span|a|h[1-6]))\b/i;
const EMAIL_THREAD_MARKER = /(?:^|\n)\s*(?:#{1,4}\s*)?-\s*não escreva abaixo dessa linha\s*-\s*#{0,4}\s*(?=\n|$)/i;
const EMAIL_QUOTED_TABLE = /\n\s*\|\s*\|\s*\|\s*\n\s*\|\s*-{2,}/;

export function normalizeEmailBodyText(value: string): string {
  if (!value.trim()) return "";

  let current = value;
  for (let iteration = 0; iteration < 2; iteration++) {
    if (!/&(?:amp;|lt;|gt;|quot;|#(?:\d+|x[0-9a-f]+);)/i.test(current)) break;
    const decoded = decodeEntities(current);
    if (decoded === current) break;
    current = decoded;
  }

  if (MARKUP_PATTERN.test(current)) {
    return visibleEmailHtml(current);
  }

  return current
    .replace(/\r\n?/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim()
    .slice(0, MAX_BODY_CHARS);
}

export function splitEmailConversation(value: string): {
  main: string;
  quoted: string;
} {
  const text = normalizeEmailBodyText(value);
  const marker = EMAIL_THREAD_MARKER.exec(text) ?? EMAIL_QUOTED_TABLE.exec(text);
  if (!marker || marker.index === undefined) {
    return { main: text, quoted: "" };
  }

  const main = text.slice(0, marker.index).trim();
  const quoted = text.slice(marker.index + marker[0].length).trim();
  return quoted && main
    ? { main, quoted }
    : { main: text, quoted: "" };
}

export function normalizeEmailMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]\n]{1,240})\]\([^)\s]+\)/g, "$1")
    .replace(/\\+([\\`*_{}\[\]()#+\-.!>~])/g, "$1");
}

