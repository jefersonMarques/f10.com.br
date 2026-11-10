import assert from "node:assert/strict";
import test from "node:test";
import {
  isChatAwaitingAgent,
  isChatOpen,
  selectConversationSession,
} from "../src/lib/support/chatInboxClassification.ts";

function createSession(overrides = {}) {
  return {
    sessionId: "chat-default",
    status: "open",
    closedAt: null,
    aiState: "human",
    lastMessageAuthorType: "customer",
    lastMessageBody: "Waiting for support",
    updatedAt: new Date("2026-11-10T12:00:00Z"),
    ...overrides,
  };
}

test("an escalated but closed session never appears as awaiting", () => {
  const session = createSession({
    closedAt: new Date("2026-11-10T12:01:00Z"),
    aiState: "escalated",
  });

  assert.equal(isChatOpen(session), false);
  assert.equal(isChatAwaitingAgent(session), false);
});

test("resolved and closed ticket statuses are finished even without a session closure", () => {
  for (const status of ["resolved", "closed"]) {
    const session = createSession({ status, aiState: "escalated" });
    assert.equal(isChatOpen(session), false);
    assert.equal(isChatAwaitingAgent(session), false);
  }
});

test("only open sessions needing agent action appear as awaiting", () => {
  assert.equal(isChatAwaitingAgent(createSession()), true);
  assert.equal(isChatAwaitingAgent(createSession({
    aiState: "escalated",
    lastMessageAuthorType: "system",
  })), true);
  assert.equal(isChatAwaitingAgent(createSession({
    status: "waiting_customer",
    aiState: "escalated",
  })), false);
  assert.equal(isChatAwaitingAgent(createSession({
    lastMessageAuthorType: "user",
  })), false);
});

test("an open session takes precedence over a newer finished session and retains its own last message", () => {
  const active = createSession({
    sessionId: "active",
    lastMessageBody: "Current open message",
    updatedAt: new Date("2026-11-09T12:00:00Z"),
  });
  const finished = createSession({
    sessionId: "finished",
    closedAt: new Date("2026-11-10T13:00:00Z"),
    lastMessageBody: "Finalized session message",
    aiState: "escalated",
    updatedAt: new Date("2026-11-10T13:00:00Z"),
  });

  const selected = selectConversationSession([finished, active]);
  assert.equal(selected?.sessionId, "active");
  assert.equal(selected?.lastMessageBody, "Current open message");
  assert.equal(isChatAwaitingAgent(selected), true);
});

test("a reopened conversation selects the most recently active session", () => {
  const old = createSession({
    sessionId: "old",
    closedAt: new Date("2026-11-09T10:00:00Z"),
    updatedAt: new Date("2026-11-09T10:00:00Z"),
  });
  const reopened = createSession({
    sessionId: "reopened",
    updatedAt: new Date("2026-11-10T11:00:00Z"),
  });

  assert.equal(selectConversationSession([old, reopened])?.sessionId, "reopened");
});

test("when all sessions are finished, select the most recent finished session", () => {
  const older = createSession({
    sessionId: "older",
    status: "resolved",
    updatedAt: new Date("2026-11-08T12:00:00Z"),
  });
  const newer = createSession({
    sessionId: "newer",
    closedAt: new Date("2026-11-10T12:00:00Z"),
  });

  const selected = selectConversationSession([older, newer]);
  assert.equal(selected?.sessionId, "newer");
  assert.equal(isChatOpen(selected), false);
  assert.equal(isChatAwaitingAgent(selected), false);
  assert.equal(selectConversationSession([]), undefined);
});
