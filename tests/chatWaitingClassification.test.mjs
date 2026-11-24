import assert from "node:assert/strict";
import test from "node:test";
import { isChatAwaitingAgent } from "../src/lib/support/chatInboxClassification.ts";

test("system notices and assignment do not end a customer's wait", () => {
  assert.equal(isChatAwaitingAgent({
    status: "open", aiState: "human", lastMessageAuthorType: "system", waitingSinceMs: 123,
  }), true);
});

test("server waiting state takes precedence over old last-message heuristics", () => {
  assert.equal(isChatAwaitingAgent({
    status: "open", aiState: "escalated", lastMessageAuthorType: "customer", waitingSinceMs: null,
  }), false);
});

test("closed sessions are not waiting", () => {
  assert.equal(isChatAwaitingAgent({ status: "closed", waitingSinceMs: 123 }), false);
});
