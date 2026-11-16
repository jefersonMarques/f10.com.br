export type ChatClosureReason = "customer" | "agent" | "expired" | "unknown";

export type ChatPerformanceState =
  | "waiting_first"
  | "waiting_reply"
  | "active"
  | "abandoned"
  | "closed_unanswered"
  | "expired_unanswered"
  | "closed";

export type ChatMetricInput = {
  requestedAt: Date | null;
  firstResponseAt: Date | null;
  closedAt: Date | null;
  expiresAt: Date;
  pendingCustomerAt: Date | null;
  closeReason: string | null;
  now: Date;
  thresholdMinutes: number;
};

export type ChatMetricResult = {
  state: ChatPerformanceState;
  waitingMinutes: number | null;
  firstResponseMinutes: number | null;
  overdue: boolean;
  closureReason: ChatClosureReason | null;
  waitingSince: string | null;
};

export function parseChatTimestamp(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date
    ? value
    : typeof value === "string"
      ? new Date(value)
      : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

export function elapsedMinutes(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

export function percentileMinutes(values: readonly number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((first, second) => first - second);
  const index = Math.min(1, Math.max(0, ratio)) * (ordered.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const result = ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower);
  return Math.round(result * 10) / 10;
}

export function calculateChatPerformance(input: ChatMetricInput): ChatMetricResult {
  const {
    requestedAt, firstResponseAt, closedAt, expiresAt, pendingCustomerAt,
    closeReason, now, thresholdMinutes,
  } = input;

  const expired = !closedAt && expiresAt.getTime() <= now.getTime();
  const endAt = closedAt ?? (expired ? expiresAt : now);
  const closed = Boolean(closedAt) || expired;
  const reason: ChatClosureReason | null = !closed
    ? null
    : expired || closeReason === "expired"
      ? "expired"
      : closeReason === "customer" || closeReason === "agent"
        ? closeReason
        : "unknown";

  const firstResponseMinutes = requestedAt && firstResponseAt
    ? elapsedMinutes(requestedAt, firstResponseAt)
    : null;

  const waitingStart = firstResponseAt
    ? pendingCustomerAt
    : requestedAt;

  const waitingMinutes = waitingStart
    ? elapsedMinutes(waitingStart, endAt)
    : null;
  const overdue = waitingMinutes !== null && waitingMinutes >= thresholdMinutes;

  let state: ChatPerformanceState;

  if (closed && !firstResponseAt) {
    state = reason === "expired"
      ? "expired_unanswered"
      : reason === "customer" && overdue
        ? "abandoned"
        : "closed_unanswered";
  } else if (closed) {
    state = "closed";
  } else if (!firstResponseAt && requestedAt) {
    state = "waiting_first";
  } else if (firstResponseAt && pendingCustomerAt) {
    state = "waiting_reply";
  } else {
    state = "active";
  }

  return {
    state,
    waitingMinutes,
    firstResponseMinutes,
    overdue,
    closureReason: reason,
    waitingSince: !closed ? waitingStart?.toISOString() ?? null : null,
  };
}
