import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";

export const CUSTOMER_IMPORT_SOURCE = "f10_sheet";
export const CUSTOMER_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 2000;
const MAX_XML_BYTES = 20 * 1024 * 1024;

const HEADERS = [
  "ID",
  "Aluno",
  "Titular",
  "Status",
  "Grupo_ID",
  "Grupo",
  "Plano Contratado",
  "Aluno - Cidade",
  "Financeiro - Link Acesso Pagamento",
  "Telefone Aluno",
  "Celular Aluno",
  "Comercial Aluno",
  "Executivo(a) de Contas",
  "Motivo Cancelamento",
  "Data Cancelamento",
  "E-mail Aluno",
  "Telefone Titular",
  "Celular Titular",
  "Comercial Titular",
  "E-mail Titular",
] as const;

export type CustomerImportRecord = {
  sourceId: string;
  unitName: string;
  holderName: string;
  commercialStatus: string;
  sourceGroupId: string;
  groupName: string;
  plan: string;
  city: string;
  billingUrl: string;
  unitPhone: string;
  unitMobile: string;
  unitCommercialPhone: string;
  accountExecutive: string;
  cancellationReason: string;
  cancellationDate: string;
  unitEmail: string;
  holderPhone: string;
  holderMobile: string;
  holderCommercialPhone: string;
  holderEmail: string;
};

export type ParsedCustomerImport = {
  fileHash: string;
  rows: Array<{ lineNumber: number; record: CustomerImportRecord }>;
};

function xmlText(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readXmlRuns(xml: string): string {
  return Array.from(xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g))
    .map((match) => xmlText(match[1]))
    .join("");
}

function extractZipEntries(buffer: Buffer): Map<string, string> {
  let end = -1;
  for (let position = buffer.length - 22; position >= Math.max(0, buffer.length - 65557); position -= 1) {
    if (buffer.readUInt32LE(position) === 0x06054b50) {
      end = position;
      break;
    }
  }
  if (end < 0) throw new Error("Arquivo XLSX inválido.");

  const count = buffer.readUInt16LE(end + 10);
  let position = buffer.readUInt32LE(end + 16);
  if (count > 1000 || position >= buffer.length) throw new Error("Estrutura XLSX excede os limites.");

  const expected = new Set([
    "xl/sharedStrings.xml",
    "xl/worksheets/sheet1.xml",
  ]);
  const result = new Map<string, string>();

  for (let index = 0; index < count; index += 1) {
    if (position + 46 > buffer.length || buffer.readUInt32LE(position) !== 0x02014b50) {
      throw new Error("Diretório XLSX inválido.");
    }

    const method = buffer.readUInt16LE(position + 10);
    const compressedSize = buffer.readUInt32LE(position + 20);
    const uncompressedSize = buffer.readUInt32LE(position + 24);
    const nameLength = buffer.readUInt16LE(position + 28);
    const extraLength = buffer.readUInt16LE(position + 30);
    const commentLength = buffer.readUInt16LE(position + 32);
    const localOffset = buffer.readUInt32LE(position + 42);
    const name = buffer.toString("utf8", position + 46, position + 46 + nameLength);
    position += 46 + nameLength + extraLength + commentLength;

    if (!expected.has(name)) continue;
    if (uncompressedSize > MAX_XML_BYTES || compressedSize > CUSTOMER_IMPORT_MAX_BYTES) {
      throw new Error("Planilha XLSX excede os limites.");
    }
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error("Entrada XLSX inválida.");
    }

    const dataOffset = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) +
      buffer.readUInt16LE(localOffset + 28);
    if (dataOffset + compressedSize > buffer.length) throw new Error("Entrada XLSX truncada.");
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    const uncompressed = method === 0
      ? compressed
      : method === 8
        ? inflateRawSync(compressed, { maxOutputLength: MAX_XML_BYTES })
        : null;
    if (!uncompressed || uncompressed.length !== uncompressedSize) {
      throw new Error("Compactação XLSX não suportada.");
    }
    result.set(name, uncompressed.toString("utf8"));
  }

  if (!result.has("xl/worksheets/sheet1.xml")) {
    throw new Error("A primeira aba da planilha não foi encontrada.");
  }
  return result;
}

function columnIndex(reference: string): number {
  const column = reference.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? "";
  let index = 0;
  for (const character of column) index = index * 26 + character.charCodeAt(0) - 64;
  return index - 1;
}

function readXlsx(buffer: Buffer): string[][] {
  const entries = extractZipEntries(buffer);
  const shared = Array.from(
    (entries.get("xl/sharedStrings.xml") ?? "").matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g),
  ).map((match) => readXmlRuns(match[1]));
  const sheet = entries.get("xl/worksheets/sheet1.xml") ?? "";
  const rows: string[][] = [];

  for (const match of sheet.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
    if (rows.length >= MAX_ROWS + 1) throw new Error("Máximo de 2.000 linhas por arquivo.");
    const cells = Array<string>(HEADERS.length).fill("");
    for (const cell of match[1].matchAll(/<c\b([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const reference = cell[1].match(/\br="([A-Z]+[0-9]+)"/i)?.[1] ?? "";
      const index = columnIndex(reference);
      if (index < 0 || index >= HEADERS.length) continue;
      const type = cell[1].match(/\bt="([^"]+)"/)?.[1] ?? "";
      const raw = cell[2] ?? "";
      const value = raw.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1] ?? "";
      cells[index] = type === "s"
        ? shared[Number(value)] ?? ""
        : type === "inlineStr"
          ? readXmlRuns(raw)
          : xmlText(value);
    }
    rows.push(cells);
  }
  return rows;
}

function readDelimited(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
    ? ";"
    : ",";
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      current.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      current.push(cell);
      rows.push(current);
      if (rows.length > MAX_ROWS + 1) throw new Error("Máximo de 2.000 linhas por arquivo.");
      current = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) throw new Error("CSV contém aspas não fechadas.");
  if (cell || current.length) rows.push([...current, cell]);
  return rows;
}

function normalizedEmail(value: string): string {
  return value.trim().toLowerCase();
}

function toRecord(values: string[]): CustomerImportRecord {
  const read = (index: number): string => (values[index] ?? "").trim().slice(0, 2048);
  return {
    sourceId: read(0),
    unitName: read(1),
    holderName: read(2),
    commercialStatus: read(3),
    sourceGroupId: read(4),
    groupName: read(5),
    plan: read(6),
    city: read(7),
    billingUrl: read(8),
    unitPhone: read(9),
    unitMobile: read(10),
    unitCommercialPhone: read(11),
    accountExecutive: read(12),
    cancellationReason: read(13),
    cancellationDate: read(14),
    unitEmail: normalizedEmail(read(15)),
    holderPhone: read(16),
    holderMobile: read(17),
    holderCommercialPhone: read(18),
    holderEmail: normalizedEmail(read(19)),
  };
}

export function parseCustomerImportFile(name: string, bytes: Uint8Array): ParsedCustomerImport {
  if (!bytes.length || bytes.length > CUSTOMER_IMPORT_MAX_BYTES) {
    throw new Error("Arquivo vazio ou maior que 5 MB.");
  }
  const buffer = Buffer.from(bytes);
  const extension = name.toLowerCase().split(".").at(-1);
  if (extension !== "xlsx" && extension !== "csv") {
    throw new Error("Envie uma planilha XLSX ou CSV.");
  }

  const table = extension === "xlsx" ? readXlsx(buffer) : readDelimited(buffer.toString("utf8"));
  if (!table.length || !HEADERS.every((header, index) => table[0][index]?.trim() === header)) {
    throw new Error("Os cabeçalhos não correspondem à planilha Clientes F10.");
  }

  const rows: ParsedCustomerImport["rows"] = [];
  for (let index = 1; index < table.length; index += 1) {
    if (!table[index].some((value) => value?.trim())) continue;
    const record = toRecord(table[index]);
    if (!/^[\w.-]{1,80}$/.test(record.sourceId) || !record.unitName || !record.commercialStatus) {
      throw new Error("Revise o ID, nome e situação da linha " + (index + 1) + ".");
    }
    rows.push({ lineNumber: index + 1, record });
  }
  if (!rows.length) throw new Error("Nenhum cliente encontrado.");
  return { fileHash: createHash("sha256").update(buffer).digest("hex"), rows };
}
