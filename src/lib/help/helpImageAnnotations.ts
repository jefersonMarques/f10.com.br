export const HELP_IMAGE_ANNOTATIONS_METADATA_KEY = "imageAnnotations";
export const MAX_HELP_IMAGE_ANNOTATIONS = 40;
export const MAX_HELP_IMAGE_ANNOTATION_TEXT = 240;

export type HelpImageAnnotationType = "numbered" | "highlight" | "arrow" | "text";

type HelpImageAnnotationBase = {
  id: string;
  type: HelpImageAnnotationType;
};

export type HelpImageNumberedAnnotation = HelpImageAnnotationBase & {
  type: "numbered";
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HelpImageHighlightAnnotation = HelpImageAnnotationBase & {
  type: "highlight";
  x: number;
  y: number;
  width: number;
  height: number;
};

export type HelpImageArrowAnnotation = HelpImageAnnotationBase & {
  type: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export type HelpImageTextAnnotation = HelpImageAnnotationBase & {
  type: "text";
  text: string;
  x: number;
  y: number;
  width: number;
};

export type HelpImageAnnotation =
  | HelpImageNumberedAnnotation
  | HelpImageHighlightAnnotation
  | HelpImageArrowAnnotation
  | HelpImageTextAnnotation;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function finiteUnit(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 100;
}

function validRect(x: number, y: number, width: number, height: number): boolean {
  return width > 0 && height > 0 && x + width <= 1.000001 && y + height <= 1.000001;
}

function parseAnnotation(value: unknown): HelpImageAnnotation | null {
  const record = asRecord(value);
  if (!record || !validId(record.id) || typeof record.type !== "string") return null;

  if (record.type === "numbered" || record.type === "highlight") {
    const x = finiteUnit(record.x);
    const y = finiteUnit(record.y);
    const width = finiteUnit(record.width);
    const height = finiteUnit(record.height);
    if (x === null || y === null || width === null || height === null || !validRect(x, y, width, height)) {
      return null;
    }

    if (record.type === "numbered") {
      const number = record.number;
      if (typeof number !== "number" || !Number.isInteger(number) || number < 1 || number > 99) {
        return null;
      }
      return { id: record.id, type: "numbered", number, x, y, width, height };
    }

    return { id: record.id, type: "highlight", x, y, width, height };
  }

  if (record.type === "arrow") {
    const startX = finiteUnit(record.startX);
    const startY = finiteUnit(record.startY);
    const endX = finiteUnit(record.endX);
    const endY = finiteUnit(record.endY);
    if (startX === null || startY === null || endX === null || endY === null) return null;
    if (Math.hypot(endX - startX, endY - startY) < 0.01) return null;
    return { id: record.id, type: "arrow", startX, startY, endX, endY };
  }

  if (record.type === "text") {
    const text = typeof record.text === "string" ? record.text.trim() : "";
    const x = finiteUnit(record.x);
    const y = finiteUnit(record.y);
    const width = finiteUnit(record.width);
    if (!text || text.length > MAX_HELP_IMAGE_ANNOTATION_TEXT || x === null || y === null || width === null) {
      return null;
    }
    if (width <= 0 || x + width > 1.000001) return null;
    return { id: record.id, type: "text", text, x, y, width };
  }

  return null;
}

export function parseHelpImageAnnotations(value: unknown): HelpImageAnnotation[] | null {
  if (!Array.isArray(value) || value.length > MAX_HELP_IMAGE_ANNOTATIONS) return null;
  const parsed = value.map(parseAnnotation);
  if (parsed.some((item) => !item)) return null;

  const annotations = parsed as HelpImageAnnotation[];
  const ids = new Set(annotations.map((annotation) => annotation.id));
  return ids.size === annotations.length ? annotations : null;
}

export function readHelpImageAnnotationsFromMetadata(
  metadata: Record<string, unknown> | null | undefined,
): HelpImageAnnotation[] {
  if (!metadata) return [];
  return parseHelpImageAnnotations(metadata[HELP_IMAGE_ANNOTATIONS_METADATA_KEY]) ?? [];
}

export function parseHelpImageAnnotationsJson(value: string): HelpImageAnnotation[] | null {
  try {
    return parseHelpImageAnnotations(JSON.parse(value));
  } catch {
    return null;
  }
}
