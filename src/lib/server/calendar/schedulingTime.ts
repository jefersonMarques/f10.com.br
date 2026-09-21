export type ZonedDateTimeParts = {
  date: string;
  time: string;
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

const WEEKDAY_INDEX: Record<string, ZonedDateTimeParts["weekday"]> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isValidTimeValue(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function addDateKeyDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function daysBetweenDateKeys(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  return Math.floor((end - start) / 86_400_000);
}

export function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function minutesToTime(minutes: number): string {
  const normalized = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function zonedParts(date: Date, timeZone: string): Record<string, string> {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function instantToZonedParts(date: Date, timeZone: string): ZonedDateTimeParts {
  const parts = zonedParts(date, timeZone);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
  };
}

export function dateKeyWeekday(dateKey: string): ZonedDateTimeParts["weekday"] {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as ZonedDateTimeParts["weekday"];
}

export function localDateTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  if (!isValidDateKey(dateKey) || !isValidTimeValue(time) || !isValidTimeZone(timeZone)) {
    throw new Error("SCHEDULING_INVALID_LOCAL_DATE_TIME");
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = targetAsUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedParts(new Date(guess), timeZone);
    const representedAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const next = targetAsUtc - (representedAsUtc - guess);
    if (Math.abs(next - guess) < 1000) {
      const result = new Date(next);
      const normalized = instantToZonedParts(result, timeZone);
      if (normalized.date !== dateKey || normalized.time !== time) {
        throw new Error("SCHEDULING_NONEXISTENT_LOCAL_TIME");
      }
      return result;
    }
    guess = next;
  }

  const result = new Date(guess);
  const normalized = instantToZonedParts(result, timeZone);
  if (normalized.date !== dateKey || normalized.time !== time) {
    throw new Error("SCHEDULING_NONEXISTENT_LOCAL_TIME");
  }
  return result;
}

export function endOfDateRange(dateKey: string, timeZone: string): Date {
  return localDateTimeToUtc(addDateKeyDays(dateKey, 1), "00:00", timeZone);
}
