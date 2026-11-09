import test from "node:test";
import assert from "node:assert/strict";
import { isFinancialChatOption } from "../src/lib/support/chatEntryRouting.ts";

test("financial routing requires an active Financeiro team association", () => {
  assert.equal(isFinancialChatOption({ label: "Financeiro", teamName: "Financeiro" }), true);
  assert.equal(isFinancialChatOption({ label: "Cobrança e boletos", teamName: "Equipe Financeiro" }), true);
  assert.equal(isFinancialChatOption({
    label: "Boletos e pagamentos",
    queueCode: "chat-faturamento-1234",
    teamName: "Financeiro F10",
  }), true);
});

test("a financial label or queue code never overrides the assigned team", () => {
  assert.equal(isFinancialChatOption({ label: "Financeiro", teamName: "Suporte" }), false);
  assert.equal(isFinancialChatOption({ label: "Boletos", queueCode: "chat-financeiro-1234" }), false);
  assert.equal(isFinancialChatOption({ label: "Suporte técnico", teamName: "Suporte" }), false);
  assert.equal(isFinancialChatOption({ label: "Financeiro", teamName: null }), false);
});
