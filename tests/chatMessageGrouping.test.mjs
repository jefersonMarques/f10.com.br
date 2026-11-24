import assert from "node:assert/strict";
import test from "node:test";
import { isSameChatMessageGroup } from "../src/lib/support/chatMessageGrouping.ts";

const baseMessage = {
  authorType: "user",
  authorUserId: "operator-1",
  authorUserName: "Support agent",
  customerName: null,
  visibility: "public",
  channel: "web_chat",
  sourceSessionId: "session-1",
  sourceTicketId: "ticket-1",
  createdAt: "2026-11-24T13:30:00.000Z",
};

function message(overrides = {}) {
  return { ...baseMessage, ...overrides };
}

test("consecutive messages from the same sender form one visual group", () => {
  const first = message();
  const next = message({ createdAt: "2026-11-24T13:33:00.000Z" });

  assert.equal(isSameChatMessageGroup(first, next), true);
});

test("grouping respects sender, conversation, channel and time boundaries", () => {
  const first = message();
  const next = message({ createdAt: "2026-11-24T13:33:00.000Z" });

  for (const override of [
    { authorType: "customer" },
    { authorUserId: "operator-2" },
    { authorUserName: "Another agent" },
    { sourceSessionId: "session-2" },
    { sourceTicketId: "ticket-2" },
    { channel: "email" },
    { visibility: "internal" },
    { createdAt: "2026-11-24T13:36:00.000Z" },
    { createdAt: "2026-11-24T13:29:00.000Z" },
  ]) {
    assert.equal(isSameChatMessageGroup(first, { ...next, ...override }), false);
  }
});

test("system messages, internal notes and invalid dates never group", () => {
  assert.equal(isSameChatMessageGroup(message({ authorType: "system" }), message({ authorType: "system" })), false);
  assert.equal(isSameChatMessageGroup(message({ visibility: "internal" }), message({ visibility: "internal" })), false);
  assert.equal(isSameChatMessageGroup(message(), message({ createdAt: "not-a-date" })), false);
  assert.equal(isSameChatMessageGroup(undefined, message()), false);
});

test("messages from different Sao Paulo calendar days remain separate", () => {
  const beforeMidnight = message({ createdAt: "2026-11-24T02:59:00.000Z" });
  const afterMidnight = message({ createdAt: "2026-11-24T03:01:00.000Z" });

  assert.equal(isSameChatMessageGroup(beforeMidnight, afterMidnight), false);
});
