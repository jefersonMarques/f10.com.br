export function parseTicketNumberSearch(value: string): string | null {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^\d{1,15}$/.test(normalized)) return null;

  const number = Number(normalized);
  return Number.isSafeInteger(number) && number > 0 ? String(number) : null;
}
