import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import { and, eq, inArray } from "drizzle-orm";
import { recordAuditEvent } from "$lib/server/auth/audit";
import { getDatabase } from "$lib/server/db";
import { helpContentVersions } from "$lib/server/db/schema";
import {
  helpAssets,
  helpContents,
  helpContentSteps,
  helpStepBlocks,
} from "$lib/server/db/structuredHelpSchema";
import { normalizeHelpSlug } from "$lib/server/help/helpArticleRepository";
import { deleteAssetObject, putAssetObject } from "$lib/server/storage/assetStorage";

const MAX_ZIP_BYTES = 40 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
const MAX_ENTRY_BYTES = 30 * 1024 * 1024;
const MAX_ENTRIES = 1_000;
const MAX_CONTENTS = 250;
const MAX_STEPS = 80;
const MAX_BLOCKS = 80;

const MIME_BY_EXTENSION: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain",
};

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

type ZipEntry = { name: string; bytes: Uint8Array };
type PackageBlock =
  | { type: "text"; text: string }
  | { type: "notice"; text: string; variant: string }
  | { type: "link"; url: string; label: string }
  | { type: "video"; url: string; altText: string; transcript: string; aiSummary: string }
  | { type: "image"; url?: string; file?: string; altText: string; aiSummary: string }
  | { type: "file"; url?: string; file?: string; label: string; aiSummary: string };

type PackageStep = { title: string; description: string; aiKnowledge: string; blocks: PackageBlock[] };
type PackageContent = {
  externalId: string;
  title: string;
  slug: string;
  summary: string;
  category: string;
  aiGeneralKnowledge: string;
  steps: PackageStep[];
};
type PackageManifest = {
  format: "f10-help-import";
  version: 1;
  source: string;
  contents: PackageContent[];
};

export type HelpPackageValidation = {
  valid: boolean;
  source: string;
  contentCount: number;
  stepCount: number;
  blockCount: number;
  assetCount: number;
  issues: string[];
  manifest: PackageManifest | null;
  entries: Map<string, Uint8Array>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
function readText(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key].trim() : "";
}
function isHttpUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; }
  catch { return false; }
}
function safeZipPath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) throw new Error("ZIP_UNSAFE_PATH");
  const parts = normalized.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) throw new Error("ZIP_UNSAFE_PATH");
  return parts.join("/");
}
function zipBaseName(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  return normalized.split("/").pop()?.trim().toLowerCase() ?? "";
}
function resolveZipEntryReference(
  reference: string,
  entries: Map<string, Uint8Array>,
): { file: string | null; issue: "invalid" | "missing" | "ambiguous" | null } {
  let safeReference = "";
  try { safeReference = safeZipPath(reference); }
  catch { return { file: null, issue: "invalid" }; }

  if (entries.has(safeReference)) return { file: safeReference, issue: null };

  const baseName = zipBaseName(safeReference);
  const matches = Array.from(entries.keys()).filter(
    (entryName) => zipBaseName(entryName) === baseName,
  );
  if (matches.length === 1) return { file: matches[0], issue: null };
  if (matches.length > 1) return { file: null, issue: "ambiguous" };
  return { file: null, issue: "missing" };
}
function findEocd(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimum = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return -1;
}
function extractZip(bytes: Uint8Array): Map<string, Uint8Array> {
  if (bytes.byteLength > MAX_ZIP_BYTES) throw new Error("ZIP_TOO_LARGE");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEocd(bytes);
  if (eocd < 0) throw new Error("ZIP_INVALID");
  const entriesCount = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (entriesCount > MAX_ENTRIES) throw new Error("ZIP_TOO_MANY_ENTRIES");

  const result = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  let cursor = centralOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < entriesCount; index += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== 0x02014b50) throw new Error("ZIP_INVALID_CENTRAL_DIRECTORY");
    const flags = view.getUint16(cursor + 8, true);
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const rawName = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;

    if (rawName.endsWith("/")) continue;
    if ((flags & 0x1) !== 0) throw new Error("ZIP_ENCRYPTED_NOT_ALLOWED");
    if (method !== 0 && method !== 8) throw new Error("ZIP_COMPRESSION_NOT_SUPPORTED");
    if (uncompressedSize > MAX_ENTRY_BYTES) throw new Error("ZIP_ENTRY_TOO_LARGE");
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) throw new Error("ZIP_UNCOMPRESSED_TOO_LARGE");
    if (compressedSize > 0 && uncompressedSize / compressedSize > 200) throw new Error("ZIP_COMPRESSION_RATIO_TOO_HIGH");

    const name = safeZipPath(rawName);
    if (result.has(name)) throw new Error("ZIP_DUPLICATE_ENTRY");
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) throw new Error("ZIP_INVALID_LOCAL_HEADER");
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    if (compressed.byteLength !== compressedSize) throw new Error("ZIP_TRUNCATED");
    const extracted = method === 0 ? compressed : new Uint8Array(inflateRawSync(compressed));
    if (extracted.byteLength !== uncompressedSize) throw new Error("ZIP_SIZE_MISMATCH");
    result.set(name, extracted);
  }
  return result;
}

function parseBlock(
  value: unknown,
  path: string,
  entries: Map<string, Uint8Array>,
  issues: string[],
): PackageBlock | null {
  const record = asRecord(value);
  if (!record) { issues.push(`${path}: bloco inválido.`); return null; }
  const type = readText(record, "type");

  if (type === "text") {
    const text = readText(record, "text");
    if (!text || text.length > 30_000) { issues.push(`${path}: texto inválido.`); return null; }
    return { type, text };
  }
  if (type === "notice") {
    const text = readText(record, "text");
    const variant = readText(record, "variant") || "info";
    if (!text || !["info", "warning", "success", "danger"].includes(variant)) { issues.push(`${path}: aviso inválido.`); return null; }
    return { type, text, variant };
  }
  if (type === "link") {
    const url = readText(record, "url"); const label = readText(record, "label");
    if (!isHttpUrl(url) || !label || label.length > 240) { issues.push(`${path}: link inválido.`); return null; }
    return { type, url, label };
  }
  if (type === "video") {
    const url = readText(record, "url");
    if (!isHttpUrl(url)) { issues.push(`${path}: vídeo precisa de URL http/https.`); return null; }
    const transcript = readText(record, "transcript"); const aiSummary = readText(record, "aiSummary");
    if (transcript.length > 100_000 || aiSummary.length > 20_000) { issues.push(`${path}: conhecimento do vídeo excede o limite.`); return null; }
    return { type, url, altText: readText(record, "altText").slice(0, 500), transcript, aiSummary };
  }
  if (type === "image") {
    const url = readText(record, "url");
    const explicitFile = readText(record, "file");
    const remoteUrl = isHttpUrl(url) ? url : "";
    const localReference = explicitFile || (url && !remoteUrl ? url : "");

    if (remoteUrl && explicitFile) {
      issues.push(`${path}: informe URL ou arquivo local, não os dois.`);
      return null;
    }
    if (!remoteUrl && !localReference) {
      issues.push(`${path}: informe URL ou nome do arquivo da imagem.`);
      return null;
    }

    const aiSummary = readText(record, "aiSummary");
    if (aiSummary.length > 20_000) { issues.push(`${path}: aiSummary excede o limite.`); return null; }
    const altText = readText(record, "altText").slice(0, 500);
    if (remoteUrl) return { type, url: remoteUrl, altText, aiSummary };

    const resolved = resolveZipEntryReference(localReference, entries);
    if (!resolved.file) {
      const detail = resolved.issue === "ambiguous"
        ? `há mais de um arquivo chamado ${zipBaseName(localReference)} no ZIP; informe o caminho completo.`
        : resolved.issue === "invalid"
          ? "nome/caminho de imagem inválido."
          : `imagem ${localReference} não encontrada no ZIP.`;
      issues.push(`${path}: ${detail}`);
      return null;
    }

    const extension = resolved.file.split(".").pop()?.toLowerCase() ?? "";
    if (!IMAGE_EXTENSIONS.has(extension)) { issues.push(`${path}: use uma imagem válida.`); return null; }
    return { type, file: resolved.file, altText, aiSummary };
  }
  if (type === "file") {
    const url = readText(record, "url");
    let file = readText(record, "file");
    if (Boolean(url) === Boolean(file)) { issues.push(`${path}: informe exatamente um de url ou file.`); return null; }
    if (url && !isHttpUrl(url)) { issues.push(`${path}: URL inválida.`); return null; }
    if (file) {
      const resolved = resolveZipEntryReference(file, entries);
      if (!resolved.file) {
        issues.push(`${path}: arquivo ${file} não existe de forma única no ZIP.`);
        return null;
      }
      file = resolved.file;
      const extension = file.split(".").pop()?.toLowerCase() ?? "";
      if (!MIME_BY_EXTENSION[extension]) { issues.push(`${path}: extensão .${extension} não permitida.`); return null; }
      if (IMAGE_EXTENSIONS.has(extension)) { issues.push(`${path}: use type=image para imagens.`); return null; }
    }
    const aiSummary = readText(record, "aiSummary");
    if (aiSummary.length > 20_000) { issues.push(`${path}: aiSummary excede o limite.`); return null; }
    const label = readText(record, "label");
    if (!label || label.length > 240) { issues.push(`${path}: label do arquivo é obrigatório.`); return null; }
    return { type, url: url || undefined, file: file || undefined, label, aiSummary };
  }

  issues.push(`${path}: tipo ${type || "vazio"} não suportado.`);
  return null;
}

export function validateHelpImportPackage(zipBytes: Uint8Array): HelpPackageValidation {
  const issues: string[] = [];
  let entries = new Map<string, Uint8Array>();
  try { entries = extractZip(zipBytes); }
  catch (cause) {
    return { valid: false, source: "", contentCount: 0, stepCount: 0, blockCount: 0, assetCount: 0, issues: [cause instanceof Error ? cause.message : "ZIP_INVALID"], manifest: null, entries };
  }

  const jsonEntries = Array.from(entries.keys()).filter((name) => name.toLowerCase().endsWith(".json"));
  const manifestName = entries.has("manifest.json")
    ? "manifest.json"
    : jsonEntries.length === 1
      ? jsonEntries[0]
      : null;
  if (!manifestName) {
    return {
      valid: false,
      source: "",
      contentCount: 0,
      stepCount: 0,
      blockCount: 0,
      assetCount: 0,
      issues: [jsonEntries.length > 1
        ? "Há mais de um JSON no ZIP. Renomeie o arquivo principal para manifest.json."
        : "Nenhum JSON de importação foi encontrado no ZIP."],
      manifest: null,
      entries,
    };
  }
  const manifestBytes = entries.get(manifestName)!;

  let root: Record<string, unknown> | null = null;
  try { root = asRecord(JSON.parse(new TextDecoder().decode(manifestBytes))); }
  catch { issues.push(`${manifestName} contém JSON inválido.`); }
  if (!root) return { valid: false, source: "", contentCount: 0, stepCount: 0, blockCount: 0, assetCount: 0, issues, manifest: null, entries };

  const source = readText(root, "source");
  if (readText(root, "format") !== "f10-help-import") issues.push('format deve ser "f10-help-import".');
  if (root.version !== 1) issues.push("version deve ser 1.");
  if (!source || source.length > 80) issues.push("source inválido.");
  const rawContents = root.contents;
  if (!Array.isArray(rawContents) || rawContents.length < 1 || rawContents.length > MAX_CONTENTS) issues.push("contents inválido.");

  const contents: PackageContent[] = [];
  const externalIds = new Set<string>(); const slugs = new Set<string>();
  let stepCount = 0; let blockCount = 0; let assetCount = 0;

  for (const [contentIndex, rawContent] of (Array.isArray(rawContents) ? rawContents : []).entries()) {
    const record = asRecord(rawContent); const path = `contents[${contentIndex}]`;
    if (!record) { issues.push(`${path}: conteúdo inválido.`); continue; }
    const externalId = readText(record, "externalId"); const title = readText(record, "title"); const slug = normalizeHelpSlug(readText(record, "slug") || title);
    if (!externalId || externalId.length > 240 || externalIds.has(externalId)) issues.push(`${path}: externalId ausente/duplicado.`);
    if (title.length < 4 || title.length > 160) issues.push(`${path}: título inválido.`);
    if (!slug || slugs.has(slug)) issues.push(`${path}: slug inválido/duplicado.`);
    externalIds.add(externalId); slugs.add(slug);
    const summary = readText(record, "summary"); const category = readText(record, "category"); const aiGeneralKnowledge = readText(record, "aiGeneralKnowledge");
    if (summary.length > 320 || category.length > 120 || aiGeneralKnowledge.length > 40_000) issues.push(`${path}: resumo, categoria ou conhecimento geral excede o limite.`);

    const rawSteps = record.steps;
    if (!Array.isArray(rawSteps) || rawSteps.length < 1 || rawSteps.length > MAX_STEPS) { issues.push(`${path}: steps inválido.`); continue; }
    const steps: PackageStep[] = [];
    for (const [stepIndex, rawStep] of rawSteps.entries()) {
      const stepRecord = asRecord(rawStep); const stepPath = `${path}.steps[${stepIndex}]`;
      if (!stepRecord) { issues.push(`${stepPath}: passo inválido.`); continue; }
      const stepTitle = readText(stepRecord, "title"); const description = readText(stepRecord, "description"); const aiKnowledge = readText(stepRecord, "aiKnowledge");
      if (!stepTitle || stepTitle.length > 180 || description.length > 10_000 || aiKnowledge.length > 30_000) issues.push(`${stepPath}: dados do passo inválidos.`);
      const rawBlocks = stepRecord.blocks;
      if (!Array.isArray(rawBlocks) || rawBlocks.length < 1 || rawBlocks.length > MAX_BLOCKS) { issues.push(`${stepPath}: blocks inválido.`); continue; }
      const blocks = rawBlocks.map((block, blockIndex) => parseBlock(block, `${stepPath}.blocks[${blockIndex}]`, entries, issues)).filter((block): block is PackageBlock => Boolean(block));
      blockCount += blocks.length;
      assetCount += blocks.filter((block) => block.type === "image" || block.type === "file" || block.type === "video").length;
      steps.push({ title: stepTitle, description, aiKnowledge, blocks });
    }
    stepCount += steps.length;
    contents.push({ externalId, title, slug, summary, category, aiGeneralKnowledge, steps });
  }

  const manifest: PackageManifest | null = issues.length === 0
    ? { format: "f10-help-import", version: 1, source, contents }
    : null;
  return { valid: Boolean(manifest), source, contentCount: contents.length, stepCount, blockCount, assetCount, issues: issues.slice(0, 100), manifest, entries };
}

function digest(bytes: Uint8Array): string { return createHash("sha256").update(bytes).digest("hex"); }
function fileInfo(path: string) {
  const rawExtension = path.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = MIME_BY_EXTENSION[rawExtension];
  if (!mimeType) throw new Error("IMPORT_ASSET_EXTENSION_NOT_ALLOWED");
  return { extension: rawExtension === "jpeg" ? "jpg" : rawExtension, mimeType, assetType: mimeType.startsWith("image/") ? "image" as const : "file" as const };
}

export async function importStructuredHelpPackage(actorUserId: string, validation: HelpPackageValidation) {
  if (!validation.valid || !validation.manifest) throw new Error("IMPORT_PACKAGE_INVALID");
  const manifest = validation.manifest; const db = getDatabase();
  const slugs = manifest.contents.map((content) => content.slug); const externalIds = manifest.contents.map((content) => content.externalId);
  const [existingSlugs, existingIds] = await Promise.all([
    db.select({ slug: helpContents.slug }).from(helpContents).where(inArray(helpContents.slug, slugs)),
    db.select({ id: helpContents.importExternalId }).from(helpContents).where(and(eq(helpContents.importSource, manifest.source), inArray(helpContents.importExternalId, externalIds))),
  ]);
  if (existingSlugs.length) throw new Error(`IMPORT_SLUG_CONFLICT:${existingSlugs.map((row) => row.slug).join(",")}`);
  if (existingIds.length) throw new Error(`IMPORT_EXTERNAL_ID_CONFLICT:${existingIds.map((row) => row.id).filter(Boolean).join(",")}`);

  const localPaths = Array.from(new Set(manifest.contents.flatMap((content) => content.steps.flatMap((step) => step.blocks.flatMap((block) => "file" in block && block.file ? [block.file] : [])))));
  const prepared = new Map<string, { storageKey: string; checksum: string; size: number; mimeType: string; assetType: "image" | "file"; originalName: string }>();
  const uploadedKeys: string[] = [];

  try {
    for (const path of localPaths) {
      const bytes = validation.entries.get(path); if (!bytes) throw new Error(`IMPORT_ASSET_MISSING:${path}`);
      const info = fileInfo(path); const checksum = digest(bytes);
      const storageKey = `help-assets/${checksum.slice(0, 2)}/${checksum.slice(2, 4)}/${checksum}.${info.extension}`;
      const [existing] = await db.select({ storageKey: helpAssets.storageKey }).from(helpAssets).where(eq(helpAssets.checksumSha256, checksum)).limit(1);
      if (!existing?.storageKey) { await putAssetObject(storageKey, bytes, info.mimeType); uploadedKeys.push(storageKey); }
      prepared.set(path, { storageKey: existing?.storageKey ?? storageKey, checksum, size: bytes.byteLength, mimeType: info.mimeType, assetType: info.assetType, originalName: path.split("/").pop() ?? path });
    }

    const imported = await db.transaction(async (tx) => {
      const result: Array<{ id: string; title: string; externalId: string }> = [];
      for (const content of manifest.contents) {
        const [createdContent] = await tx.insert(helpContents).values({ slug: content.slug, title: content.title, summary: content.summary, category: content.category, aiGeneralKnowledge: content.aiGeneralKnowledge, status: "draft", importSource: manifest.source, importExternalId: content.externalId, createdBy: actorUserId, updatedBy: actorUserId }).returning({ id: helpContents.id });
        if (!createdContent) throw new Error("IMPORT_CONTENT_NOT_CREATED");

        for (const [stepIndex, step] of content.steps.entries()) {
          const [createdStep] = await tx.insert(helpContentSteps).values({ contentId: createdContent.id, title: step.title, description: step.description, aiKnowledge: step.aiKnowledge, sortOrder: (stepIndex + 1) * 10 }).returning({ id: helpContentSteps.id });
          if (!createdStep) throw new Error("IMPORT_STEP_NOT_CREATED");

          for (const [blockIndex, block] of step.blocks.entries()) {
            let assetId: string | null = null;
            if (block.type === "image" || block.type === "file" || block.type === "video") {
              if ((block.type === "image" || block.type === "file") && block.file) {
                const asset = prepared.get(block.file); if (!asset) throw new Error("IMPORT_ASSET_NOT_PREPARED");
                const [createdAsset] = await tx.insert(helpAssets).values({ contentId: createdContent.id, assetType: asset.assetType, storageKey: asset.storageKey, originalName: asset.originalName, mimeType: asset.mimeType, sizeBytes: asset.size, checksumSha256: asset.checksum, altText: block.type === "image" ? block.altText : "", aiSummary: block.aiSummary, metadata: { importedFrom: manifest.source, packagePath: block.file }, createdBy: actorUserId }).returning({ id: helpAssets.id });
                assetId = createdAsset?.id ?? null;
              } else {
                const sourceUrl = "url" in block ? block.url : undefined;
                const [createdAsset] = await tx.insert(helpAssets).values({ contentId: createdContent.id, assetType: block.type, sourceUrl: sourceUrl ?? null, altText: block.type === "image" || block.type === "video" ? block.altText : "", transcript: block.type === "video" ? block.transcript : "", aiSummary: block.aiSummary, metadata: { importedFrom: manifest.source }, createdBy: actorUserId }).returning({ id: helpAssets.id });
                assetId = createdAsset?.id ?? null;
              }
              if (!assetId) throw new Error("IMPORT_ASSET_NOT_CREATED");
            }

            await tx.insert(helpStepBlocks).values({
              stepId: createdStep.id,
              blockType: block.type,
              textContent: block.type === "text" || block.type === "notice" ? block.text : "",
              assetId,
              linkUrl: block.type === "link" ? block.url : null,
              linkLabel: block.type === "link" ? block.label : block.type === "file" ? block.label : null,
              noticeVariant: block.type === "notice" ? block.variant : null,
              metadata: { importedFrom: manifest.source },
              sortOrder: (blockIndex + 1) * 10,
            });
          }
        }

        await tx.insert(helpContentVersions).values({
          entityType: "content",
          entityId: createdContent.id,
          version: 1,
          snapshot: { import: { source: manifest.source, externalId: content.externalId }, title: content.title, slug: content.slug, summary: content.summary, category: content.category, aiGeneralKnowledge: content.aiGeneralKnowledge, status: "draft", steps: content.steps },
          createdBy: actorUserId,
        });
        result.push({ id: createdContent.id, title: content.title, externalId: content.externalId });
      }
      return result;
    });

    await recordAuditEvent({ actorUserId, action: "help.content.package.imported", entityType: "help_content_import", metadata: { source: manifest.source, contentCount: imported.length, assetCount: validation.assetCount } });
    return { imported, source: manifest.source, contentCount: imported.length, stepCount: validation.stepCount, blockCount: validation.blockCount, assetCount: validation.assetCount };
  } catch (cause) {
    await Promise.all(uploadedKeys.map((key) => deleteAssetObject(key).catch(() => undefined)));
    throw cause;
  }
}
