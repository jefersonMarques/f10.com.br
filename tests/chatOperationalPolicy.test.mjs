import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getChatEscalationLevel, getCustomerChatPresence } from "../src/lib/support/chatOperationalPolicy.ts";

test("waiting thresholds are inclusive and select the most urgent stage", () => {
  assert.equal(getChatEscalationLevel(45, 120, 300), "owner");
  assert.equal(getChatEscalationLevel(119, 120, 300), "owner");
  assert.equal(getChatEscalationLevel(120, 120, 300), "team");
  assert.equal(getChatEscalationLevel(299, 120, 300), "team");
  assert.equal(getChatEscalationLevel(300, 120, 300), "supervisor");
});

test("customer presence uses activity rather than claiming an exact connection state", () => {
  const now = Date.parse("2026-11-24T15:00:00Z");
  assert.equal(getCustomerChatPresence(null, now), "unknown");
  assert.equal(getCustomerChatPresence("invalid", now), "unknown");
  assert.equal(getCustomerChatPresence(new Date(now - 90_000), now), "recent");
  assert.equal(getCustomerChatPresence(new Date(now - 90_001), now), "away");
  assert.equal(getCustomerChatPresence(new Date(now - 600_001), now), "offline");
});

test("finishing a chat does not close its ticket", () => {
  const source = readFileSync("src/lib/server/support/chatLifecycleRepository.ts", "utf8");
  assert.doesNotMatch(source, /status:\s*"closed"/);
  assert.match(source, /closedBy: "agent"/);
  assert.match(source, /hasOpenChatForTicket/);
});
