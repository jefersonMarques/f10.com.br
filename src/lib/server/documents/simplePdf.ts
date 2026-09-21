const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 48;
const START_Y = 790;
const LINE_HEIGHT = 14;
const MAX_LINES_PER_PAGE = 51;
const MAX_CHARS_PER_LINE = 88;

function normalizeText(value: string): string {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, "?");
}

function wrapLine(value: string): string[] {
  const source = normalizeText(value).replace(/\t/g, "  ");
  if (!source) return [""];
  const result: string[] = [];

  for (const paragraph of source.split(/\r?\n/)) {
    if (!paragraph) {
      result.push("");
      continue;
    }
    let remaining = paragraph;
    while (remaining.length > MAX_CHARS_PER_LINE) {
      const candidate = remaining.slice(0, MAX_CHARS_PER_LINE + 1);
      const breakAt = Math.max(candidate.lastIndexOf(" "), candidate.lastIndexOf("/"));
      const cutAt = breakAt >= 30 ? breakAt + 1 : MAX_CHARS_PER_LINE;
      result.push(remaining.slice(0, cutAt).trimEnd());
      remaining = remaining.slice(cutAt).trimStart();
    }
    result.push(remaining);
  }

  return result;
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createPageStream(lines: string[]): string {
  const commands = [
    "BT",
    "/F1 10 Tf",
    `${MARGIN_X} ${START_Y} Td`,
    `${LINE_HEIGHT} TL`,
  ];
  lines.forEach((line, index) => {
    if (index > 0) commands.push("T*");
    commands.push(`(${escapePdfText(line)}) Tj`);
  });
  commands.push("ET");
  return commands.join("\n");
}

function pdfBuffer(value: string): Buffer {
  return Buffer.from(value, "latin1");
}

export function createTextPdf(lines: string[]): Buffer {
  const wrapped = lines.flatMap(wrapLine);
  const pages: string[][] = [];
  for (let index = 0; index < Math.max(wrapped.length, 1); index += MAX_LINES_PER_PAGE) {
    pages.push(wrapped.slice(index, index + MAX_LINES_PER_PAGE));
  }

  const pageIds = pages.map((_, index) => 4 + index * 2);
  const objects = new Map<number, Buffer>();
  objects.set(1, pdfBuffer("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(
    2,
    pdfBuffer(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`),
  );
  objects.set(3, pdfBuffer("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));

  pages.forEach((pageLines, index) => {
    const pageId = pageIds[index]!;
    const contentId = pageId + 1;
    const stream = pdfBuffer(createPageStream(pageLines));
    objects.set(
      pageId,
      pdfBuffer(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`),
    );
    objects.set(
      contentId,
      Buffer.concat([
        pdfBuffer(`<< /Length ${stream.length} >>\nstream\n`),
        stream,
        pdfBuffer("\nendstream"),
      ]),
    );
  });

  const totalObjects = 3 + pages.length * 2;
  const chunks: Buffer[] = [pdfBuffer("%PDF-1.4\n%âãÏÓ\n")];
  const offsets = new Array<number>(totalObjects + 1).fill(0);
  let position = chunks[0]!.length;

  for (let id = 1; id <= totalObjects; id += 1) {
    const object = objects.get(id);
    if (!object) throw new Error("PDF_OBJECT_MISSING");
    offsets[id] = position;
    const chunk = Buffer.concat([pdfBuffer(`${id} 0 obj\n`), object, pdfBuffer("\nendobj\n")]);
    chunks.push(chunk);
    position += chunk.length;
  }

  const xrefPosition = position;
  const xref = [
    `xref\n0 ${totalObjects + 1}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF\n`,
  ].join("");
  chunks.push(pdfBuffer(xref));

  return Buffer.concat(chunks);
}
