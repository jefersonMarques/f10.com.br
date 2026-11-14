import assert from "node:assert/strict";
import test from "node:test";
import {
  isExistingPixPayable,
  normalizePayerDocument,
  normalizePaymentInstallments,
  positivePaymentId,
  parseF10FinanceContracts,
} from "../src/lib/server/finance/financePaymentParsing.ts";

test("finance identifiers accept only positive safe integers", () => {
  assert.equal(positivePaymentId("1049994"), 1049994);
  assert.equal(positivePaymentId(0), null);
  assert.equal(positivePaymentId("1.2"), null);
  assert.equal(positivePaymentId("999999999999999999999"), null);
});

test("payer document normalization rejects invalid identifiers and birth formats", () => {
  assert.equal(normalizePayerDocument("12.345.678/0001-90", ""), "12345678000190");
  assert.equal(normalizePayerDocument("123.456.789-01", "01/01/2000"), "12345678901");
  assert.throws(() => normalizePayerDocument("123", ""), /FINANCE_DOCUMENT_INVALID/);
  assert.throws(() => normalizePayerDocument("12345678901", "2000-01-01"), /FINANCE_BIRTH_INVALID/);
});

test("only open and payable installments offer PIX", () => {
  const rows = normalizePaymentInstallments([{
    receber_id: 1049994,
    parcela: 94,
    calculo: "R$ 272,73",
    vencimento: "15/11/2026",
    pago: false,
    pagavel: true,
  }, {
    receber_id: 1049995,
    parcela: 95,
    valor: "R$ 100,00",
    pago: false,
    pagavel: false,
  }], false);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].payable, true);
  assert.equal(rows[0].amount, "R$ 272,73");
  assert.equal(rows[1].payable, false);
  assert.equal(normalizePaymentInstallments([{
    receber_id: 1049994, parcela: 94, pago: true, pagavel: true,
  }], true)[0].payable, false);
});

test("invalid installment payloads fail closed", () => {
  assert.throws(() => normalizePaymentInstallments({}, false), /FINANCE_RESPONSE_INVALID/);
  assert.throws(() => normalizePaymentInstallments([null], false), /FINANCE_RESPONSE_INVALID/);
});

test("PIX is never returned for another contract, paid or expired receivable", () => {
  const valid = {
    contrato_id: 118,
    receber_id: 1049994,
    pago: false,
    pix: true,
    expirado: false,
    qrcode_text: "00020126580014BR.GOV.BCB.PIX52040000",
  };
  assert.equal(isExistingPixPayable(valid, 118, 1049994), true);
  assert.equal(isExistingPixPayable(valid, 119, 1049994), false);
  assert.equal(isExistingPixPayable(valid, 118, 1049995), false);
  assert.equal(isExistingPixPayable({ ...valid, pago: true }, 118, 1049994), false);
  assert.equal(isExistingPixPayable({ ...valid, expirado: true }, 118, 1049994), false);
  assert.equal(isExistingPixPayable({ ...valid, qrcode_text: "" }, 118, 1049994), false);
});

test("finance contracts come from the payer-scoped F10 API identifiers", () => {
  const contracts = parseF10FinanceContracts([
    { contrato_id: 4821, numero_contrato: "F10-2026-34", pessoa_id: 123 },
    { contrato_id: "4822", numero_contrato: 202635, pessoa_id: 123 },
    { contrato_id: 4821, numero_contrato: "F10-2026-34", pessoa_id: 123 },
  ]);
  assert.deepEqual(contracts, [
    { id: 4821, number: "F10-2026-34" },
    { id: 4822, number: "202635" },
  ]);
});

test("empty authorized F10 contracts are distinct from unvalidated payers", () => {
  assert.deepEqual(parseF10FinanceContracts([]), []);
  assert.throws(() => parseF10FinanceContracts({ contracts: [] }), /FINANCE_RESPONSE_INVALID/);
  assert.throws(() => parseF10FinanceContracts([{ numero_contrato: "123" }]), /FINANCE_RESPONSE_INVALID/);
  assert.throws(() => parseF10FinanceContracts([null]), /FINANCE_RESPONSE_INVALID/);
  assert.throws(() => parseF10FinanceContracts([
    { contrato_id: 12, numero_contrato: "A" },
    { contrato_id: 12, numero_contrato: "B" },
  ]), /FINANCE_RESPONSE_INVALID/);
});

test("CPF requires payer birth validation, CNPJ does not", () => {
  assert.throws(() => normalizePayerDocument("12345678901", ""), /FINANCE_BIRTH_INVALID/);
  assert.equal(normalizePayerDocument("12345678000190", ""), "12345678000190");
});
