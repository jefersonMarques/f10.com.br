import assert from "node:assert/strict";
import test from "node:test";
import {
  getLiveChatDraft,
  subscribeLiveChatDraft,
  updateLiveChatDraft,
} from "../src/lib/server/support/liveChatDrafts.ts";

test("live drafts are isolated by session and disappear when cleared", () => {
  const first = "00000000-0000-4000-8000-000000000011";
  const second = "00000000-0000-4000-8000-000000000022";
  const events = [];
  const unsubscribe = subscribeLiveChatDraft(first, (body) => events.push(body));

  updateLiveChatDraft(first, "Mensagem em andamento");
  updateLiveChatDraft(second, "Outro atendimento");

  assert.equal(getLiveChatDraft(first), "Mensagem em andamento");
  assert.equal(getLiveChatDraft(second), "Outro atendimento");
  assert.deepEqual(events, ["", "Mensagem em andamento"]);

  updateLiveChatDraft(first, "");
  assert.equal(getLiveChatDraft(first), "");
  assert.deepEqual(events, ["", "Mensagem em andamento", ""]);

  unsubscribe();
  updateLiveChatDraft(first, "Nova tentativa");
  assert.equal(events.length, 3);

  updateLiveChatDraft(first, "");
  updateLiveChatDraft(second, "");
});

test("unchanged draft renewals do not produce duplicate notifications", () => {
  const sessionId = "00000000-0000-4000-8000-000000000033";
  const events = [];
  const unsubscribe = subscribeLiveChatDraft(sessionId, (body) => events.push(body));

  updateLiveChatDraft(sessionId, "Escrevendo");
  updateLiveChatDraft(sessionId, "Escrevendo");

  assert.deepEqual(events, ["", "Escrevendo"]);
  unsubscribe();
  updateLiveChatDraft(sessionId, "");
});

test("expired drafts are discarded and subscribers notified", () => {
  const sessionId = "00000000-0000-4000-8000-000000000044";
  const events = [];
  const previousNow = Date.now;
  let now = previousNow();

  Date.now = () => now;
  try {
    const unsubscribe = subscribeLiveChatDraft(sessionId, (body) => events.push(body));
    updateLiveChatDraft(sessionId, "Rascunho temporário");
    now += 8_001;

    assert.equal(getLiveChatDraft(sessionId), "");
    assert.deepEqual(events, ["", "Rascunho temporário", ""]);
    unsubscribe();
  } finally {
    Date.now = previousNow;
    updateLiveChatDraft(sessionId, "");
  }
});
