import assert from "node:assert/strict";
import test from "node:test";
import {
  readChatInboxScope,
  withChatInboxScope,
} from "../src/lib/support/chatInboxScope.ts";

test("a selected awaiting filter survives a page reload", () => {
  const current = new URL("https://f10.com.br/app/chat");
  const selected = withChatInboxScope(current, "waiting");
  const reloaded = new URL(selected.href);

  assert.equal(selected.search, "?inbox=waiting");
  assert.equal(readChatInboxScope(reloaded), "waiting");
});

test("inbox filters survive navigation into a chat session", () => {
  const listUrl = withChatInboxScope(
    new URL("https://f10.com.br/app/chat"),
    "finished",
  );
  const conversationUrl = withChatInboxScope(
    new URL("/app/chat/123", listUrl),
    readChatInboxScope(listUrl),
  );

  assert.equal(readChatInboxScope(conversationUrl), "finished");
  assert.equal(conversationUrl.pathname, "/app/chat/123");
});

test("all removes only the inbox filter and preserves other parameters", () => {
  const original = new URL("https://f10.com.br/app/chat?inbox=waiting&view=compact");
  const reset = withChatInboxScope(original, "all");

  assert.equal(readChatInboxScope(reset), "all");
  assert.equal(reset.searchParams.get("view"), "compact");
  assert.equal(reset.searchParams.has("inbox"), false);
  assert.equal(readChatInboxScope(original), "waiting");
});

test("unknown scope values fall back to all", () => {
  const url = new URL("https://f10.com.br/app/chat?inbox=invalid");
  assert.equal(readChatInboxScope(url), "all");
});
