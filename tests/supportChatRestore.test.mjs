import test from "node:test";
import assert from "node:assert/strict";
import {
  hasRestorableSupportChat,
  SUPPORT_CHAT_SESSION_KEY,
} from "../src/lib/support/supportChatRestore.ts";

function createStorage(value) {
  const values = new Map();

  if (value !== undefined) {
    values.set(SUPPORT_CHAT_SESSION_KEY, value);
  }

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("active support chat is restored after page reload", () => {
  const storage = createStorage(JSON.stringify({
    sessionId: "chat-123",
    token: "valid-session-token",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  }));

  assert.equal(hasRestorableSupportChat(storage), true);
  assert.notEqual(storage.getItem(SUPPORT_CHAT_SESSION_KEY), null);
});

test("expired support chat is discarded", () => {
  const storage = createStorage(JSON.stringify({
    sessionId: "chat-123",
    token: "expired-session-token",
    expiresAt: new Date(Date.now() - 60_000).toISOString(),
  }));

  assert.equal(hasRestorableSupportChat(storage), false);
  assert.equal(storage.getItem(SUPPORT_CHAT_SESSION_KEY), null);
});

test("invalid support chat data does not reopen the widget", () => {
  const storage = createStorage("{invalid json");

  assert.equal(hasRestorableSupportChat(storage), false);
  assert.equal(storage.getItem(SUPPORT_CHAT_SESSION_KEY), null);
});

test("restricted browser storage does not prevent page loading", () => {
  const storage = {
    getItem() {
      throw new Error("Storage access denied");
    },
  };

  assert.equal(hasRestorableSupportChat(storage), false);
});
