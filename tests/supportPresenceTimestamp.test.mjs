import assert from "node:assert/strict";
import test from "node:test";
import { parsePresenceTimestamp } from "../src/lib/support/presenceTimestamp.ts";

test("presence heartbeat reads raw PostgreSQL timestamps as Date instances", () => {
  const value = "2026-11-16T12:30:00.000Z";
  assert.equal(parsePresenceTimestamp(value)?.toISOString(), value);
});

test("presence heartbeat preserves timestamps already decoded by the driver", () => {
  const date = new Date("2026-11-16T12:30:00.000Z");
  assert.strictEqual(parsePresenceTimestamp(date), date);
});

test("missing and invalid PostgreSQL timestamps are treated as stale", () => {
  assert.equal(parsePresenceTimestamp(null), null);
  assert.equal(parsePresenceTimestamp(undefined), null);
  assert.equal(parsePresenceTimestamp("invalid"), null);
  assert.equal(parsePresenceTimestamp({}), null);
  assert.equal(parsePresenceTimestamp(new Date(Number.NaN)), null);
});
