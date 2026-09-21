const MIN_TRAINING_VIDEO_SECONDS = 30;
const MAX_TRAINING_VIDEO_SECONDS = 60;
const DURATION_TOLERANCE_SECONDS = 0.05;

function readUint32(bytes: Uint8Array, offset: number): number {
  if (offset < 0 || offset + 4 > bytes.byteLength) throw new Error("TRAINING_VIDEO_INVALID");
  return (
    bytes[offset]! * 0x1000000 +
    bytes[offset + 1]! * 0x10000 +
    bytes[offset + 2]! * 0x100 +
    bytes[offset + 3]!
  );
}

function readUint64(bytes: Uint8Array, offset: number): bigint {
  const high = BigInt(readUint32(bytes, offset));
  const low = BigInt(readUint32(bytes, offset + 4));
  return (high << 32n) | low;
}

function readType(bytes: Uint8Array, offset: number): string {
  if (offset < 0 || offset + 4 > bytes.byteLength) return "";
  return String.fromCharCode(
    bytes[offset]!,
    bytes[offset + 1]!,
    bytes[offset + 2]!,
    bytes[offset + 3]!,
  );
}

type Box = {
  type: string;
  start: number;
  payloadStart: number;
  end: number;
};

function readBox(bytes: Uint8Array, start: number, limit: number): Box | null {
  if (start + 8 > limit) return null;
  const size32 = readUint32(bytes, start);
  const type = readType(bytes, start + 4);
  let headerSize = 8;
  let size: number;

  if (size32 === 1) {
    if (start + 16 > limit) throw new Error("TRAINING_VIDEO_INVALID");
    const extended = readUint64(bytes, start + 8);
    if (extended > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("TRAINING_VIDEO_INVALID");
    size = Number(extended);
    headerSize = 16;
  } else if (size32 === 0) {
    size = limit - start;
  } else {
    size = size32;
  }

  if (size < headerSize || start + size > limit) throw new Error("TRAINING_VIDEO_INVALID");
  return { type, start, payloadStart: start + headerSize, end: start + size };
}

function findChildBox(bytes: Uint8Array, start: number, end: number, type: string): Box | null {
  let offset = start;
  while (offset + 8 <= end) {
    const box = readBox(bytes, offset, end);
    if (!box) break;
    if (box.type === type) return box;
    if (box.end <= offset) break;
    offset = box.end;
  }
  return null;
}

export function getMp4DurationSeconds(bytes: Uint8Array): number {
  const ftyp = readBox(bytes, 0, bytes.byteLength);
  if (!ftyp || ftyp.type !== "ftyp") throw new Error("TRAINING_VIDEO_INVALID");

  let offset = 0;
  let moov: Box | null = null;
  while (offset + 8 <= bytes.byteLength) {
    const box = readBox(bytes, offset, bytes.byteLength);
    if (!box) break;
    if (box.type === "moov") {
      moov = box;
      break;
    }
    if (box.end <= offset) break;
    offset = box.end;
  }
  if (!moov) throw new Error("TRAINING_VIDEO_INVALID");

  const mvhd = findChildBox(bytes, moov.payloadStart, moov.end, "mvhd");
  if (!mvhd || mvhd.payloadStart + 20 > mvhd.end) throw new Error("TRAINING_VIDEO_INVALID");

  const version = bytes[mvhd.payloadStart];
  let timescale: number;
  let duration: bigint;
  if (version === 0) {
    timescale = readUint32(bytes, mvhd.payloadStart + 12);
    duration = BigInt(readUint32(bytes, mvhd.payloadStart + 16));
  } else if (version === 1) {
    if (mvhd.payloadStart + 32 > mvhd.end) throw new Error("TRAINING_VIDEO_INVALID");
    timescale = readUint32(bytes, mvhd.payloadStart + 20);
    duration = readUint64(bytes, mvhd.payloadStart + 24);
  } else {
    throw new Error("TRAINING_VIDEO_INVALID");
  }

  if (!timescale || duration <= 0n) throw new Error("TRAINING_VIDEO_INVALID");
  const seconds = Number(duration) / timescale;
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("TRAINING_VIDEO_INVALID");
  return seconds;
}

export function validateTrainingVideo(bytes: Uint8Array, mimeType: string): number {
  if (mimeType.trim().toLowerCase() !== "video/mp4") throw new Error("TRAINING_VIDEO_FORMAT");
  const durationSeconds = getMp4DurationSeconds(bytes);
  if (durationSeconds < MIN_TRAINING_VIDEO_SECONDS - DURATION_TOLERANCE_SECONDS) {
    throw new Error("TRAINING_VIDEO_TOO_SHORT");
  }
  if (durationSeconds > MAX_TRAINING_VIDEO_SECONDS + DURATION_TOLERANCE_SECONDS) {
    throw new Error("TRAINING_VIDEO_TOO_LONG");
  }
  return durationSeconds;
}

export const TRAINING_VIDEO_MIN_SECONDS = MIN_TRAINING_VIDEO_SECONDS;
export const TRAINING_VIDEO_MAX_SECONDS = MAX_TRAINING_VIDEO_SECONDS;
