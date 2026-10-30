export type ChatMarkdownToken = {
  kind: "text" | "strong" | "emphasis" | "code" | "link" | "strikethrough";
  text: string;
  href?: string;
};

export type ChatMarkdownBlock = {
  kind: "paragraph" | "heading" | "bullet" | "ordered" | "quote" | "code" | "space";
  tokens?: ChatMarkdownToken[];
  marker?: string;
  level?: number;
  code?: string;
};

const INLINE_PATTERN =
  /(\[([^\]\n]+)\]\(([^)\s]+)\))|(https?:\/\/[^\s<>"']+|\/(?:ajuda-f10|cliente)(?:\/[^\s<>"']*)?)|(\x60([^\x60\n]+)\x60)|(\*\*([^*\n]+)\*\*|__([^_\n]+)__)|(\*([^*\n]+)\*|_([^_\n]+)_)|(~~([^~\n]+)~~)/g;

function addText(tokens: ChatMarkdownToken[], text: string): void {
  if (!text) return;

  const previous = tokens[tokens.length - 1];
  if (previous?.kind === "text") {
    previous.text += text;
    return;
  }

  tokens.push({ kind: "text", text });
}

export function safeChatHref(value: string): string | null {
  const href = value.trim();
  if (!href || href.length > 2048) return null;

  if (href.startsWith("/") && !href.startsWith("//") && !href.includes("\\")) {
    return href;
  }

  try {
    const url = new URL(href);
    return (url.protocol === "https:" || url.protocol === "http:")
      && !url.username
      && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function splitTrailingPunctuation(value: string): { url: string; suffix: string } {
  let end = value.length;

  while (end > 0) {
    const character = value[end - 1] ?? "";
    if (/[.,;:!?]/.test(character)) {
      end--;
      continue;
    }

    if (character !== ")") break;

    const current = value.slice(0, end);
    const opening = (current.match(/\(/g) ?? []).length;
    const closing = (current.match(/\)/g) ?? []).length;
    if (closing <= opening) break;
    end--;
  }

  return {
    url: value.slice(0, end),
    suffix: value.slice(end),
  };
}

export function tokenizeChatMarkdown(value: string): ChatMarkdownToken[] {
  const tokens: ChatMarkdownToken[] = [];
  let cursor = 0;

  for (const match of value.matchAll(INLINE_PATTERN)) {
    const start = match.index ?? cursor;
    addText(tokens, value.slice(cursor, start));

    if (match[2] !== undefined && match[3] !== undefined) {
      const href = safeChatHref(match[3]);

      if (href) {
        tokens.push({ kind: "link", text: match[2], href });
      } else {
        addText(tokens, match[0]);
      }
    } else if (match[4] !== undefined) {
      const { url, suffix } = splitTrailingPunctuation(match[4]);
      const href = safeChatHref(url);

      if (href) {
        tokens.push({ kind: "link", text: url, href });
        addText(tokens, suffix);
      } else {
        addText(tokens, match[0]);
      }
    } else if (match[6] !== undefined) {
      tokens.push({ kind: "code", text: match[6] });
    } else if (match[8] !== undefined || match[9] !== undefined) {
      tokens.push({ kind: "strong", text: match[8] ?? match[9] ?? "" });
    } else if (match[11] !== undefined || match[12] !== undefined) {
      tokens.push({ kind: "emphasis", text: match[11] ?? match[12] ?? "" });
    } else if (match[14] !== undefined) {
      tokens.push({ kind: "strikethrough", text: match[14] });
    } else {
      addText(tokens, match[0]);
    }

    cursor = start + match[0].length;
  }

  addText(tokens, value.slice(cursor));
  return tokens;
}

export function parseChatMarkdown(value: string): ChatMarkdownBlock[] {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ChatMarkdownBlock[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    const fence = trimmed.match(/^(\x60{3,}|~{3,})(.*)$/);
    if (fence) {
      const delimiter = fence[1] ?? "";
      const codeLines: string[] = [];

      while (index + 1 < lines.length) {
        const next = lines[index + 1] ?? "";
        index++;

        if (next.trim().startsWith(delimiter.charAt(0).repeat(delimiter.length))) {
          break;
        }

        codeLines.push(next);
      }

      blocks.push({ kind: "code", code: codeLines.join("\n") });
      continue;
    }

    if (!trimmed) {
      if (blocks.length > 0 && blocks[blocks.length - 1]?.kind !== "space") {
        blocks.push({ kind: "space" });
      }
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        tokens: tokenizeChatMarkdown(heading[2] ?? ""),
      });
      continue;
    }

    const bullet = trimmed.match(/^[-*+]\s+(.+)$/);
    if (bullet) {
      blocks.push({ kind: "bullet", marker: "•", tokens: tokenizeChatMarkdown(bullet[1] ?? "") });
      continue;
    }

    const ordered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
    if (ordered) {
      blocks.push({
        kind: "ordered",
        marker: (ordered[1] ?? "1") + ".",
        tokens: tokenizeChatMarkdown(ordered[2] ?? ""),
      });
      continue;
    }

    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      blocks.push({ kind: "quote", tokens: tokenizeChatMarkdown(quote[1] ?? "") });
      continue;
    }

    blocks.push({ kind: "paragraph", tokens: tokenizeChatMarkdown(line) });
  }

  if (blocks[blocks.length - 1]?.kind === "space") {
    blocks.pop();
  }

  return blocks;
}
