import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("public support chat uses one handoff action, headset, and minimal composer", () => {
  const source = readFileSync("src/lib/components/onboarding/SupportChatDialog.svelte", "utf8");
  const humanActions = source.match(/on:click=\{\(\) => void requestHumanSupport\(\)\}/g) ?? [];

  assert.equal(humanActions.length, 1);
  assert.match(source, /<Headset size=\{19\}/);
  assert.match(source, /<Headset size=\{14\}/);
  assert.match(source, /Falar com a equipe/);
  assert.doesNotMatch(source, /<Sparkles/);
  assert.doesNotMatch(source, /Texto visível à equipe · Enter envia/);
  assert.doesNotMatch(source, /Novo atendimento<\/button>/);
  assert.doesNotMatch(source, /O Assistente responde com base no conteúdo publicado pela F10/);
  assert.doesNotMatch(source, /Opções rápidas<\/p>/);
  assert.match(source, /on:paste=\{handleReplyPaste\}/);
});

test("the stored generic greeting is shortened without losing the conversation", () => {
  const source = readFileSync("src/lib/components/onboarding/SupportChatDialog.svelte", "utf8");
  assert.match(source, /guestMessages\[0\]\?\.role === "assistant"/);
  assert.match(source, /guestMessages\.slice\(1\)/);
  assert.match(source, /Olá! Como posso ajudar\?/);
});
