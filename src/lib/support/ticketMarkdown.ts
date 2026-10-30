function repairMultilineBold(content: string): string {
  return content.replace(/\*\*([\s\S]*?)\*\*/g, (original, inner: string) => {
    if (!inner.includes("\n")) return original;

    return inner.split("\n").map((line) => {
      const start = line.search(/\S/);
      if (start === -1) return line;

      const end = line.trimEnd().length;
      const prefix = line.slice(0, start);
      const suffix = line.slice(end);
      const formatted = line.slice(start, end);
      const text = formatted.startsWith("*") && !formatted.endsWith("*")
        ? formatted.slice(1)
        : formatted;

      return text ? prefix + "**" + text + "**" + suffix : line;
    }).join("\n");
  });
}

export function normalizeTicketMessageMarkdown(value: string): string {
  const normalized = value.replace(/\r\n?/g, "\n");
  const fencedBlocks = /(`{3,}[^\n]*\n[\s\S]*?\n`{3,}|~{3,}[^\n]*\n[\s\S]*?\n~{3,})/g;

  return normalized.split(fencedBlocks)
    .map((segment, index) => index % 2 === 0 ? repairMultilineBold(segment) : segment)
    .join("");
}
