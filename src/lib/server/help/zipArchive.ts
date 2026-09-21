import { inflateRawSync } from "node:zlib";

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const MAX_ENTRIES = 200;
const MAX_ARCHIVE_BYTES = 120 * 1024 * 1024;
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;

export type ZipArchiveEntry = {
  path: string;
  bytes: Uint8Array;
};

function normalizeArchivePath(value: string): string {
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!normalized || normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized) || normalized.includes("\0")) {
    throw new Error("TRAINING_ZIP_PATH_INVALID");
  }
  const segments = normalized.split("/");
  if (segments.some((segment) => segment === "..")) throw new Error("TRAINING_ZIP_PATH_INVALID");
  return segments.filter((segment) => segment && segment !== ".").join("/");
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimum = 22;
  const start = Math.max(0, bytes.byteLength - 65_557);
  for (let offset = bytes.byteLength - minimum; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  throw new Error("TRAINING_ZIP_INVALID");
}

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let value = 0; value < 256; value += 1) {
      let crc = value;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      crcTable[value] = crc >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff]!;
  return (crc ^ 0xffffffff) >>> 0;
}

export function readZipArchive(input: Uint8Array): Map<string, ZipArchiveEntry> {
  if (input.byteLength < 22 || input.byteLength > MAX_ARCHIVE_BYTES) {
    throw new Error("TRAINING_ZIP_SIZE_INVALID");
  }

  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const eocdOffset = findEndOfCentralDirectory(input);
  const diskNumber = view.getUint16(eocdOffset + 4, true);
  const centralDisk = view.getUint16(eocdOffset + 6, true);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralSize = view.getUint32(eocdOffset + 12, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);
  if (diskNumber !== 0 || centralDisk !== 0) throw new Error("TRAINING_ZIP_MULTIDISK_NOT_ALLOWED");
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error("TRAINING_ZIP64_NOT_ALLOWED");
  }
  if (entryCount < 1 || entryCount > MAX_ENTRIES) throw new Error("TRAINING_ZIP_ENTRY_LIMIT");
  if (centralOffset + centralSize > input.byteLength) throw new Error("TRAINING_ZIP_INVALID");

  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries = new Map<string, ZipArchiveEntry>();
  let offset = centralOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > input.byteLength || view.getUint32(offset, true) !== CENTRAL_SIGNATURE) {
      throw new Error("TRAINING_ZIP_INVALID");
    }
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const expectedCrc = view.getUint32(offset + 16, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff || localOffset === 0xffffffff) {
      throw new Error("TRAINING_ZIP64_NOT_ALLOWED");
    }
    if ((flags & 0x1) !== 0) throw new Error("TRAINING_ZIP_ENCRYPTED_NOT_ALLOWED");
    if (method !== 0 && method !== 8) throw new Error("TRAINING_ZIP_COMPRESSION_NOT_ALLOWED");
    if (uncompressedSize > MAX_FILE_BYTES) throw new Error("TRAINING_ZIP_FILE_TOO_LARGE");

    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > input.byteLength) throw new Error("TRAINING_ZIP_INVALID");
    let fileName: string;
    try {
      fileName = decoder.decode(input.subarray(nameStart, nameEnd));
    } catch {
      throw new Error("TRAINING_ZIP_FILENAME_INVALID");
    }
    offset = nameEnd + extraLength + commentLength;
    if (fileName.endsWith("/")) continue;
    const path = normalizeArchivePath(fileName);
    if (!path || entries.has(path)) throw new Error("TRAINING_ZIP_DUPLICATE_PATH");

    if (localOffset + 30 > input.byteLength || view.getUint32(localOffset, true) !== LOCAL_SIGNATURE) {
      throw new Error("TRAINING_ZIP_INVALID");
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > input.byteLength) throw new Error("TRAINING_ZIP_INVALID");

    const compressed = input.subarray(dataStart, dataEnd);
    let bytes: Uint8Array;
    try {
      bytes = method === 0
        ? new Uint8Array(compressed)
        : new Uint8Array(inflateRawSync(compressed, { maxOutputLength: MAX_FILE_BYTES }));
    } catch {
      throw new Error("TRAINING_ZIP_DECOMPRESSION_FAILED");
    }
    if (bytes.byteLength !== uncompressedSize || crc32(bytes) !== expectedCrc) {
      throw new Error("TRAINING_ZIP_CHECKSUM_INVALID");
    }
    totalUncompressed += bytes.byteLength;
    if (totalUncompressed > MAX_TOTAL_BYTES) throw new Error("TRAINING_ZIP_TOTAL_SIZE_INVALID");
    entries.set(path, { path, bytes });
  }

  return entries;
}
