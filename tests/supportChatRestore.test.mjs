import test from "node:test";
import assert from "node:assert/strict";
import {
  hasRestorableSupportChat,
  readRestorableSupportGuestMessages,
  SUPPORT_ASSISTANT_GUEST_KEY,
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

test("recent assistant dialogue is restored in the same browser tab", () => {
  const messages = [
    {
      id: "assistant-1",
      role: "assistant",
      body: "Como posso ajudar?",
      createdAt: new Date(Date.now() - 120_000).toISOString(),
    },
    {
      id: "customer-2",
      role: "customer",
      body: "Preciso de atendimento.",
      createdAt: new Date(Date.now() - 60_000).toISOString(),
    },
  ];
  const data = JSON.stringify(messages);
  const guestStorage = {
    getItem(key) {
      return key === SUPPORT_ASSISTANT_GUEST_KEY ? data : null;
    },
    removeItem() {},
  };

  assert.deepEqual(
    readRestorableSupportGuestMessages(guestStorage, SUPPORT_ASSISTANT_GUEST_KEY)
      .map((message) => message.body),
    ["Como posso ajudar?", "Preciso de atendimento."],
  );
});

test("guest assistant messages expire after 24 hours of inactivity", () => {
  const expiredAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const values = new Map([
    [SUPPORT_ASSISTANT_GUEST_KEY, JSON.stringify([
      { id: "customer-1", role: "customer", body: "Oi", createdAt: expiredAt },
    ])],
  ]);
  const storage = {
    getItem(key) {
      return values.get(key) ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
  };

  assert.deepEqual(readRestorableSupportGuestMessages(storage, SUPPORT_ASSISTANT_GUEST_KEY), []);
  assert.equal(storage.getItem(SUPPORT_ASSISTANT_GUEST_KEY), null);
});

test("guest message action URLs cannot load unsafe routes", () => {
  const saved = [{
    id: "customer-1",
    role: "customer",
    body: "Ajuda",
    createdAt: new Date().toISOString(),
    actionUrl: "//untrusted.example",
    actionLabel: "Abrir",
  }];
  const storage = {
    getItem() {
      return JSON.stringify(saved);
    },
    removeItem() {},
  };

  const restored = readRestorableSupportGuestMessages(storage, SUPPORT_ASSISTANT_GUEST_KEY);
  assert.equal(restored[0]?.actionUrl, undefined);
});
