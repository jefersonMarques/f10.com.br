import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQuickReply, renderQuickReply, readStoredQuickReplies } from "../src/lib/support/quickReplies.ts";

test("quick replies normalize commands and validate input", () => {
  assert.deepEqual(normalizeQuickReply({ command: "/PRINT", title: " Print ", body: "Envie uma imagem." }), { command: "print", title: "Print", body: "Envie uma imagem." });
  assert.equal(normalizeQuickReply({ command: "bad command", title: "Teste", body: "Texto" }), null);
  assert.equal(normalizeQuickReply({ command: "test", title: "Teste", body: "{{secret}}" }), null);
});

test("variables are inserted only when context is available", () => {
  assert.equal(renderQuickReply("Olá, {{customerName}}. Ticket {{ticketNumber}}", { customerName: "Maria", ticketNumber: 42 }), "Olá, Maria. Ticket 42");
  assert.equal(renderQuickReply("Ticket {{ticketNumber}}", {}), null);
  assert.equal(renderQuickReply("Olá!", {}), "Olá!");
});

test("malformed stored entries are discarded", () => {
  assert.deepEqual(readStoredQuickReplies([null, {}, { id: "1", command: "test", title: "Teste", body: "Texto" }]), [{ id: "1", command: "test", title: "Teste", body: "Texto" }]);
});
