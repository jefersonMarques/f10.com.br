function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderBold(value: string): string {
  return value.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
}

function renderItalic(value: string): string {
  return value.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
}

function renderInline(value: string): string {
  const parts = value.split(/(`[^`\n]+`)/g);
  return parts
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      return renderItalic(renderBold(escapeHtml(part)));
    })
    .join("");
}

export function trainingMarkupToHtml(value: string): string {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const output: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const tag = heading[1].length === 2 ? "h2" : "h3";
      output.push(`<${tag}>${renderInline(heading[2].trim())}</${tag}>`);
      continue;
    }

    const quote = line.match(/^>\s*(.+)$/);
    if (quote) {
      closeList();
      output.push(`<blockquote>${renderInline(quote[1].trim())}</blockquote>`);
      continue;
    }

    if (/^---+$/.test(line)) {
      closeList();
      output.push("<hr>");
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    const nextListType = unordered ? "ul" : ordered ? "ol" : null;
    if (nextListType) {
      if (listType !== nextListType) {
        closeList();
        listType = nextListType;
        output.push(`<${listType}>`);
      }
      output.push(`<li>${renderInline((unordered?.[1] ?? ordered?.[1] ?? "").trim())}</li>`);
      continue;
    }

    closeList();
    output.push(`<p>${renderInline(line)}</p>`);
  }

  closeList();
  return output.join("");
}
