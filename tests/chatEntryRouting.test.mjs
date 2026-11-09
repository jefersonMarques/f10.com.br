import test from "node:test";
import assert from "node:assert/strict";
import { isFinancialChatOption } from "../src/lib/support/chatEntryRouting.ts";

test("financial entry options are matched by label or configured queue code", () => {
  assert.equal(isFinancialChatOption({ label: "Financeiro" }), true);
  assert.equal(isFinancialChatOption({ label: "Cobrança e boletos" }), true);
  assert.equal(isFinancialChatOption({
    label: "Boletos e pagamentos",
    queueCode: "chat-atendimento-financeiro-1234",
  }), true);
  assert.equal(isFinancialChatOption({ label: "Suporte técnico", queueCode: "support" }), false);
  assert.equal(isFinancialChatOption({ label: "Vendas e implantação", queueCode: "sales" }), false);
});
