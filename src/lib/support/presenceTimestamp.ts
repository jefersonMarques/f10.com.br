export function parsePresenceTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined) return null;

  const date = value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : null;

  return date && Number.isFinite(date.getTime()) ? date : null;
}
