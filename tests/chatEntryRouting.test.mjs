import test from "node:test";
import assert from "node:assert/strict";
import {
  isFinancialChatOption,
  filterChatOptionsByDepartment,
  getFinanceEntryAction,
  isChatEntryVisible,
  canStartHumanChat,
} from "../src/lib/support/chatEntryRouting.ts";

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

test("configured finance options are hidden from support and available in finance", () => {
  const options = [
    { id: "support", label: "Suporte", teamName: "Suporte", initialHandling: "human" },
    { id: "human", label: "Financeiro", teamName: "Financeiro", initialHandling: "human" },
    { id: "pix", label: "Gerar PIX", teamName: "Financeiro", initialHandling: "ai" },
  ];
  assert.deepEqual(
    filterChatOptionsByDepartment(options, "support").map((option) => option.id),
    ["support"],
  );
  assert.deepEqual(
    filterChatOptionsByDepartment(options, "finance").map((option) => option.id),
    ["human", "pix"],
  );
});

test("finance entry action follows handling and explicit PIX intent", () => {
  assert.equal(getFinanceEntryAction({
    label: "Financeiro",
    teamName: "Financeiro",
    initialHandling: "human",
  }), "human");
  assert.equal(getFinanceEntryAction({
    label: "Gerar PIX",
    teamName: "Financeiro",
    initialHandling: "ai",
  }), "pix");
  assert.equal(getFinanceEntryAction({
    label: "Dúvida financeira",
    teamName: "Financeiro",
    initialHandling: "ai",
  }), null);
  assert.equal(getFinanceEntryAction({
    label: "Gerar PIX",
    teamName: "Helpdesk",
    initialHandling: "ai",
  }), null);
});

test("entry visibility defaults to business hours, respects explicit outside-hours flag and inactive entries", () => {
  const open = { isOpen: true, hoursConfigured: true };
  const closed = { isOpen: false, hoursConfigured: true };
  const unconfigured = { isOpen: null, hoursConfigured: false };
  const support = { label: "Suporte", initialHandling: "ai" };
  const enabled = { ...support, showOutsideHours: true };
  assert.equal(isChatEntryVisible(support, open), true);
  assert.equal(isChatEntryVisible(support, closed), false);
  assert.equal(isChatEntryVisible(enabled, closed), true);
  assert.equal(isChatEntryVisible({ ...enabled, active: false }, open), false);
  assert.equal(isChatEntryVisible(support, unconfigured), true);
  assert.equal(isChatEntryVisible(enabled, null), false);
  assert.equal(canStartHumanChat(enabled, closed), false);
  assert.equal(canStartHumanChat({ ...enabled, initialHandling: "human" }, closed), true);
  assert.equal(canStartHumanChat(support, open), true);
  assert.equal(canStartHumanChat({ ...enabled, label: "Gerar PIX", teamName: "Financeiro" }, closed), false);
});
