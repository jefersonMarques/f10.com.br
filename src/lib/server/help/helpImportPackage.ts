import { inflateRawSync } from "node:zlib";
import { UNCATEGORIZED_HELP_CATEGORY_SLUG } from "$lib/help/helpCategoryConstants";

const ZIP_LOCAL_FILE_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_FILE_SIGNATURE = 0x02014b50;
const ZIP_END_SIGNATURE = 0x06054b50;
const MAX_ZIP_COMMENT_BYTES = 0xffff;
const MAX_PACKAGE_ENTRIES = 500;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_JSON_BYTES = 5 * 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const PACKAGE_JSON_PATH = "f10-help-import.json";
const PACKAGE_ASSET_URL_PREFIX = "package:";

export const MAX_HELP_IMPORT_PACKAGE_BYTES = 80 * 1024 * 1024;

export type HelpImportPackageAsset = {
  path: string;
  fileName: string;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  bytes: Uint8Array;
};

export type HelpImportPackage = {
  jsonText: string;
  assets: Map<string, HelpImportPackageAsset>;
};

type ZipEntry = {
  path: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
  flags: number;
};

function normalizePackagePath(value: string): string | null {
  if (!value || value.includes("\\") || value.includes("\0") || value.startsWith("/")) {
    return null;
  }
  const segments = value.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  return segments.join("/");
}

function screenshotMimeType(path: string): HelpImportPackageAsset["mimeType"] | null {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return null;
}

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

function validateScreenshotBytes(mimeType: HelpImportPackageAsset["mimeType"], bytes: Uint8Array): boolean {
  if (mimeType === "image/png") {
    return hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (mimeType === "image/jpeg") return hasPrefix(bytes, [0xff, 0xd8, 0xff]);
  return (
    bytes.byteLength >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  );
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const minimumOffset = Math.max(0, buffer.length - (22 + MAX_ZIP_COMMENT_BYTES));
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === ZIP_END_SIGNATURE) return offset;
  }
  return -1;
}

function readZipEntries(buffer: Buffer): ZipEntry[] {
  const endOffset = findEndOfCentralDirectory(buffer);
  if (endOffset < 0) throw new Error("O arquivo ZIP não possui diretório central válido.");

  const totalEntries = buffer.readUInt16LE(endOffset + 10);
  const centralDirectorySize = buffer.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);
  if (
    totalEntries === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff
  ) {
    throw new Error("Pacotes ZIP64 não são suportados neste importador.");
  }
  if (totalEntries < 1 || totalEntries > MAX_PACKAGE_ENTRIES) {
    throw new Error(`O ZIP deve conter entre 1 e ${MAX_PACKAGE_ENTRIES} arquivos.`);
  }
  if (centralDirectoryOffset + centralDirectorySize > endOffset) {
    throw new Error("O diretório central do ZIP está corrompido.");
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries: ZipEntry[] = [];
  let cursor = centralDirectoryOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < totalEntries; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== ZIP_CENTRAL_FILE_SIGNATURE) {
      throw new Error("O diretório central do ZIP está incompleto.");
    }

    const flags = buffer.readUInt16LE(cursor + 8);
    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const headerEnd = cursor + 46 + fileNameLength + extraLength + commentLength;
    if (headerEnd > buffer.length) throw new Error("Uma entrada do ZIP está corrompida.");
    if ((flags & 0x1) !== 0) throw new Error("ZIP protegido por senha não é suportado.");
    if (compressionMethod !== 0 && compressionMethod !== 8) {
      throw new Error("O ZIP usa um método de compactação não suportado.");
    }

    let rawPath: string;
    try {
      rawPath = decoder.decode(buffer.subarray(cursor + 46, cursor + 46 + fileNameLength));
    } catch {
      throw new Error("O ZIP possui nome de arquivo com codificação inválida.");
    }

    cursor = headerEnd;
    if (rawPath.endsWith("/")) continue;
    const path = normalizePackagePath(rawPath);
    if (!path) throw new Error(`Caminho inválido dentro do ZIP: ${rawPath || "(vazio)"}.`);

    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error("O conteúdo descompactado do ZIP excede 100 MB.");
    }

    entries.push({
      path,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
      flags,
    });
  }

  return entries;
}

function extractEntry(buffer: Buffer, entry: ZipEntry, maxOutputLength: number): Uint8Array {
  if (entry.uncompressedSize > maxOutputLength) {
    throw new Error(`O arquivo ${entry.path} excede o tamanho permitido.`);
  }
  const offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== ZIP_LOCAL_FILE_SIGNATURE) {
    throw new Error(`O arquivo ${entry.path} possui cabeçalho local inválido.`);
  }
  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataEnd > buffer.length) throw new Error(`O arquivo ${entry.path} está incompleto.`);

  const compressed = buffer.subarray(dataStart, dataEnd);
  const output =
    entry.compressionMethod === 0
      ? Buffer.from(compressed)
      : inflateRawSync(compressed, { maxOutputLength });
  if (output.byteLength !== entry.uncompressedSize) {
    throw new Error(`O tamanho descompactado de ${entry.path} não confere.`);
  }
  return new Uint8Array(output);
}

export function parseHelpImportPackage(bytes: Uint8Array): HelpImportPackage {
  if (bytes.byteLength < 22 || bytes.byteLength > MAX_HELP_IMPORT_PACKAGE_BYTES) {
    throw new Error("O pacote ZIP é inválido ou excede 80 MB.");
  }

  const buffer = Buffer.from(bytes);
  const entries = readZipEntries(buffer);
  const seenPaths = new Set<string>();
  const assets = new Map<string, HelpImportPackageAsset>();
  let jsonText = "";

  for (const entry of entries) {
    if (seenPaths.has(entry.path)) throw new Error(`Arquivo duplicado dentro do ZIP: ${entry.path}.`);
    seenPaths.add(entry.path);

    if (entry.path === PACKAGE_JSON_PATH) {
      if (jsonText) throw new Error(`O ZIP deve conter apenas um ${PACKAGE_JSON_PATH}.`);
      const jsonBytes = extractEntry(buffer, entry, MAX_JSON_BYTES);
      try {
        jsonText = new TextDecoder("utf-8", { fatal: true }).decode(jsonBytes);
      } catch {
        throw new Error(`${PACKAGE_JSON_PATH} precisa estar em UTF-8.`);
      }
      continue;
    }

    if (!entry.path.startsWith("screenshots/")) {
      throw new Error(`Arquivo não permitido no ZIP: ${entry.path}.`);
    }
    const mimeType = screenshotMimeType(entry.path);
    if (!mimeType) {
      throw new Error(`Screenshot com formato não suportado: ${entry.path}. Use PNG, JPG/JPEG ou WebP.`);
    }
    const screenshotBytes = extractEntry(buffer, entry, MAX_SCREENSHOT_BYTES);
    if (!validateScreenshotBytes(mimeType, screenshotBytes)) {
      throw new Error(`O conteúdo de ${entry.path} não corresponde ao formato da imagem.`);
    }
    assets.set(entry.path, {
      path: entry.path,
      fileName: entry.path.split("/").at(-1) ?? "screenshot.png",
      mimeType,
      bytes: screenshotBytes,
    });
  }

  if (!jsonText) throw new Error(`O ZIP precisa conter ${PACKAGE_JSON_PATH} na raiz.`);
  return { jsonText, assets };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key].trim() : "";
}

export function isHelpImportPackageAssetUrl(value: string): boolean {
  return value.startsWith(PACKAGE_ASSET_URL_PREFIX);
}

export function getHelpImportPackageAssetPath(value: string): string | null {
  if (!isHelpImportPackageAssetUrl(value)) return null;
  return normalizePackagePath(value.slice(PACKAGE_ASSET_URL_PREFIX.length));
}

export function prepareHelpImportPackageJson(
  rawJson: string,
  assets: ReadonlyMap<string, HelpImportPackageAsset>,
): { jsonText: string; issues: string[]; referencedAssetCount: number } {
  const issues: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { jsonText: rawJson, issues: ["f10-help-import.json contém JSON inválido."], referencedAssetCount: 0 };
  }

  const root = asRecord(parsed);
  if (!root || !Array.isArray(root.contents)) {
    return {
      jsonText: rawJson,
      issues: ["f10-help-import.json precisa conter a lista contents."],
      referencedAssetCount: 0,
    };
  }

  const referenced = new Set<string>();
  for (const [contentIndex, rawContent] of root.contents.entries()) {
    const content = asRecord(rawContent);
    if (!content) continue;

    if (!Array.isArray(content.categories) || content.categories.length === 0) {
      content.categories = [{ slug: UNCATEGORIZED_HELP_CATEGORY_SLUG, destinationUrl: "" }];
    }

    if (!Array.isArray(content.steps)) continue;
    for (const [stepIndex, rawStep] of content.steps.entries()) {
      const step = asRecord(rawStep);
      if (!step || !Array.isArray(step.blocks)) continue;
      for (const [blockIndex, rawBlock] of step.blocks.entries()) {
        const block = asRecord(rawBlock);
        if (!block || readText(block, "type") !== "image") continue;

        const assetPathValue = readText(block, "assetPath");
        const urlValue = readText(block, "url");
        if (!assetPathValue) {
          if (!urlValue) {
            issues.push(
              `contents[${contentIndex}].steps[${stepIndex}].blocks[${blockIndex}]: imagem precisa de assetPath do ZIP ou URL real.`,
            );
          }
          continue;
        }
        if (urlValue) {
          issues.push(
            `contents[${contentIndex}].steps[${stepIndex}].blocks[${blockIndex}]: use assetPath ou url, nunca ambos.`,
          );
          continue;
        }

        const assetPath = normalizePackagePath(assetPathValue);
        if (!assetPath || !assetPath.startsWith("screenshots/")) {
          issues.push(
            `contents[${contentIndex}].steps[${stepIndex}].blocks[${blockIndex}].assetPath: caminho inválido.`,
          );
          continue;
        }
        if (referenced.has(assetPath)) {
          issues.push(`O screenshot ${assetPath} foi referenciado mais de uma vez. Use cada print em um único bloco.`);
          continue;
        }
        if (!assets.has(assetPath)) {
          issues.push(`O screenshot ${assetPath} está referenciado no JSON, mas não existe no ZIP.`);
          continue;
        }

        referenced.add(assetPath);
        block.url = `${PACKAGE_ASSET_URL_PREFIX}${assetPath}`;
        delete block.assetPath;
      }
    }
  }

  for (const assetPath of assets.keys()) {
    if (!referenced.has(assetPath)) {
      issues.push(`O ZIP contém screenshot não utilizado pelo JSON: ${assetPath}.`);
    }
  }

  return {
    jsonText: JSON.stringify(root),
    issues,
    referencedAssetCount: referenced.size,
  };
}
