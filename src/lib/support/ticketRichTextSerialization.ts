function serializeInlineLines(content: string, marker: string): string {
  return content.split("\n").map((line) => {
    const start = line.search(/\S/);
    if (start === -1) return line;

    const end = line.trimEnd().length;
    return line.slice(0, start)
      + marker
      + line.slice(start, end)
      + marker
      + line.slice(end);
  }).join("\n");
}

function serializeNode(node: Node): string {
  if (node.nodeType === 3) return (node.textContent ?? "").replace(/\u200b/g, "");
  if (node.nodeType !== 1) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();

  if (tag === "img") return "\n\n";
  if (tag === "br") return "\n";

  const content = Array.from(element.childNodes).map(serializeNode).join("");

  if (tag === "strong" || tag === "b") {
    return serializeInlineLines(content, "**");
  }
  if (tag === "em" || tag === "i") {
    return serializeInlineLines(content, "*");
  }
  if (tag === "code") {
    return serializeInlineLines(content.replace(/`/g, ""), "`");
  }
  if (tag === "div" || tag === "p") {
    return content + (content.endsWith("\n") ? "" : "\n");
  }

  return content;
}

export function serializeTicketRichText(editor: Node): string {
  return Array.from(editor.childNodes)
    .map(serializeNode)
    .join("")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trimEnd();
}
