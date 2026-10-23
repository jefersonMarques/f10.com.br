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

import { normalizeEmailBodyText, visibleEmailHtml } from "../../support/emailBodyText.ts";

export { visibleEmailHtml };

const MAX_BODY_CHARS = 150_000;

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
  const markdown = typeof input.markdown === "string"
    ? normalizeEmailBodyText(input.markdown.slice(0, MAX_BODY_CHARS))
    : "";
  const plain = typeof input.plain === "string"
    ? normalizeEmailBodyText(input.plain.slice(0, MAX_BODY_CHARS))
    : "";
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
      /(?:\*\*[^*]+\*\*|\*[^*\n]+\*)/.test(html)) {
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
