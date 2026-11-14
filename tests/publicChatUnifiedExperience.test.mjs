import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("help center and customer portal mount one shared chat implementation", () => {
  const helpLayout = read("src/routes/ajuda-f10/+layout.svelte");
  const clientLayout = read("src/routes/cliente/chamados/+layout.svelte");
  const home = read("src/routes/ajuda-f10/+page.svelte");

  assert.match(helpLayout, /import SupportChatDialog from/);
  assert.match(clientLayout, /import SupportChatDialog from/);
  assert.match(helpLayout, /<SupportChatDialog/);
  assert.match(clientLayout, /<SupportChatDialog/);
  assert.doesNotMatch(helpLayout, /SupportAssistantDialog/);
  assert.doesNotMatch(clientLayout, /SupportAssistantDialog/);
  assert.doesNotMatch(home, /<SupportChatDialog/);
  assert.match(home, /f10:open-help-assistant/);
});

test("single human handoff CTA and legacy session migration are preserved", () => {
  const chat = read("src/lib/components/onboarding/SupportChatDialog.svelte");
  assert.equal((chat.match(/on:click=\{\(\) => void requestHumanSupport\(\)\}/g) ?? []).length, 1);
  assert.match(chat, /SUPPORT_ASSISTANT_GUEST_KEY/);
  assert.match(chat, /SUPPORT_CHAT_SESSION_KEY/);
  assert.match(chat, /Headset size=\{19\}/);
  assert.doesNotMatch(chat, /<Sparkles/);
  assert.match(chat, /on:paste=\{handleReplyPaste\}/);
});
