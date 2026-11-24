import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateChatPerformance,
  parseChatTimestamp,
  percentileMinutes,
} from "../src/lib/support/chatPerformanceMetrics.ts";

const time = (minutes) => new Date(Date.UTC(2026, 10, 16, 12, minutes));
const base = {
  requestedAt: time(0),
  firstResponseAt: null,
  closedAt: null,
  expiresAt: time(59),
  pendingCustomerAt: time(0),
  closeReason: null,
  now: time(15),
  thresholdMinutes: 10,
};

test("active unanswered queue chat becomes overdue but not abandonment", () => {
  const metric = calculateChatPerformance(base);
  assert.equal(metric.state, "waiting_first");
  assert.equal(metric.waitingMinutes, 15);
  assert.equal(metric.overdue, true);
  assert.equal(metric.closureReason, null);
});

test("only explicit customer closure after threshold counts as abandonment", () => {
  const abandoned = calculateChatPerformance({
    ...base, closedAt: time(12), closeReason: "customer",
  });
  assert.equal(abandoned.state, "abandoned");
  assert.equal(abandoned.closureReason, "customer");

  const early = calculateChatPerformance({
    ...base, closedAt: time(2), closeReason: "customer",
  });
  assert.equal(early.state, "closed_unanswered");

  const operator = calculateChatPerformance({
    ...base, closedAt: time(12), closeReason: "agent",
  });
  assert.equal(operator.state, "closed_unanswered");
});

test("expiration is not mistaken for confirmed customer abandonment", () => {
  const expired = calculateChatPerformance({
    ...base, now: time(65),
  });
  assert.equal(expired.state, "expired_unanswered");
  assert.equal(expired.closureReason, "expired");
  assert.equal(expired.waitingMinutes, 59);
});

test("after first human response waiting starts at unanswered customer message", () => {
  const metric = calculateChatPerformance({
    ...base, firstResponseAt: time(3), pendingCustomerAt: time(11),
  });
  assert.equal(metric.state, "waiting_reply");
  assert.equal(metric.firstResponseMinutes, 3);
  assert.equal(metric.waitingMinutes, 4);
  assert.equal(metric.overdue, false);
});

test("closed chat does not remain in the live waiting queue", () => {
  const metric = calculateChatPerformance({
    ...base, firstResponseAt: time(4), closedAt: time(12), closeReason: "agent",
  });
  assert.equal(metric.state, "closed");
  assert.equal(metric.waitingSince, null);
});

test("invalid and missing dates are handled conservatively", () => {
  assert.equal(parseChatTimestamp(null), null);
  assert.equal(parseChatTimestamp("invalid"), null);
  assert.equal(parseChatTimestamp({}), null);
  assert.equal(parseChatTimestamp("2026-11-16T12:00:00.000Z")?.toISOString(),
    "2026-11-16T12:00:00.000Z");
});

test("percentiles use correct interpolation without mutating inputs", () => {
  const samples = [10, 1, 20, 5];
  assert.equal(percentileMinutes(samples, 0.5), 7.5);
  assert.equal(percentileMinutes(samples, 0.9), 17);
  assert.deepEqual(samples, [10, 1, 20, 5]);
  assert.equal(percentileMinutes([], 0.9), null);
});

test("authenticated chats remain in the waiting queue beyond credential expiration", () => {
  const metric = calculateChatPerformance({ ...base, persistent: true, now: time(65) });
  assert.equal(metric.state, "waiting_first");
  assert.equal(metric.closureReason, null);
  assert.equal(metric.waitingMinutes, 65);
  assert.equal(metric.overdue, true);
});

test("persistent chat closes only after an explicit closure", () => {
  const metric = calculateChatPerformance({
    ...base, persistent: true, now: time(90), closedAt: time(75), closeReason: "agent",
  });
  assert.equal(metric.state, "closed_unanswered");
  assert.equal(metric.closureReason, "agent");
  assert.equal(metric.waitingMinutes, 75);
});
