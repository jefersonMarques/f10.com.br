import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCustomerSheetDate, toF10CommercialRecord,
} from "../src/lib/server/support/f10CustomerCommercialFields.ts";

function record(overrides = {}) {
  return {
    sourceId: "10", unitName: "Eloyse Nathalia Nicolau Tuffi",
    holderName: "Evolutime - Capão Redondo", commercialStatus: "Cancelado",
    sourceGroupId: "149", groupName: "Evolutime",
    plan: "F10 Plano PREMIUM", city: "São Paulo",
    accountExecutive: "", cancellationReason: "Solicitado", cancellationDate: "45200",
    billingUrl: "https://example.invalid/secret-payment", unitPhone: "+55 11 1234",
    unitMobile: "", unitCommercialPhone: "", unitEmail: "private@example.com",
    holderPhone: "", holderMobile: "", holderCommercialPhone: "",
    holderEmail: "private-owner@example.com", ...overrides,
  };
}

test("preserves one nickname per contract even for the same person", () => {
  const first = toF10CommercialRecord(record());
  const second = toF10CommercialRecord(record({ sourceId: "21", holderName: "Evolutime - Cotia" }));
  assert.equal(first.apelido, "Evolutime - Capão Redondo");
  assert.equal(second.apelido, "Evolutime - Cotia");
  assert.equal(first.groupName, second.groupName);
  assert.equal(first.sourceId, "10");
  assert.equal(second.sourceId, "21");
});

test("preserves contact and commercial data from the trusted spreadsheet", () => {
  const profile = toF10CommercialRecord(record({
    sourceId: "815", unitName: "Cebrac Blumenau", holderName: "",
  }));
  assert.equal(profile.apelido, "Cebrac Blumenau");
  assert.equal(profile.unitEmail, "private@example.com");
  assert.equal(profile.holderEmail, "private-owner@example.com");
  assert.equal(profile.unitPhone, "+55 11 1234");
  assert.equal(profile.plan, "F10 Plano PREMIUM");
  assert.equal(profile.cancellationReason, "Solicitado");
  assert.equal(Object.hasOwn(profile, "razao_social"), false);
});

test("converts Excel serial dates and rejects unsafe billing links", () => {
  assert.equal(normalizeCustomerSheetDate("45200"), "2023-10-01");
  assert.equal(normalizeCustomerSheetDate("2026-05-07"), "2026-05-07");
  assert.equal(normalizeCustomerSheetDate(""), null);
  assert.equal(normalizeCustomerSheetDate("abc"), null);
  assert.equal(toF10CommercialRecord(record({ billingUrl: "javascript:alert(1)" })).billingUrl, "");
});
