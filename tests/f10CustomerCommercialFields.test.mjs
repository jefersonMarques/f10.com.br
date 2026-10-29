import test from "node:test";
import assert from "node:assert/strict";
import { toF10CommercialRecord } from "../src/lib/server/support/f10CustomerCommercialFields.ts";

function record(overrides = {}) {
  return {
    sourceId: "10", unitName: "Eloyse Nathalia Nicolau Tuffi",
    holderName: "Evolutime - Capão Redondo", commercialStatus: "Cancelado",
    sourceGroupId: "149", groupName: "Evolutime",
    plan: "F10 Plano PREMIUM", city: "São Paulo",
    accountExecutive: "", cancellationReason: "", cancellationDate: "",
    billingUrl: "https://example.invalid/secret-payment", unitPhone: "",
    unitMobile: "", unitCommercialPhone: "", unitEmail: "private@example.com",
    holderPhone: "", holderMobile: "", holderCommercialPhone: "",
    holderEmail: "private-owner@example.com", ...overrides,
  };
}

test("uses the unit nickname from Titular when one person has multiple contracts", () => {
  const first = toF10CommercialRecord(record());
  const second = toF10CommercialRecord(record({ sourceId: "21", holderName: "Evolutime - Cotia" }));
  assert.equal(first.apelido, "Evolutime - Capão Redondo");
  assert.equal(second.apelido, "Evolutime - Cotia");
  assert.equal(first.groupName, "Evolutime");
  assert.equal(first.sourceGroupId, "149");
  assert.equal(first.unitName, second.unitName);
});

test("falls back to Aluno when Titular is empty without inferring legal name", () => {
  const profile = toF10CommercialRecord(record({
    sourceId: "815", unitName: "Cebrac Blumenau", holderName: "",
  }));
  assert.equal(profile.apelido, "Cebrac Blumenau");
  assert.equal(Object.hasOwn(profile, "razao_social"), false);
});

test("does not stage payment links, emails, or private contact details", () => {
  const profile = toF10CommercialRecord(record());
  for (const field of ["billingUrl", "unitEmail", "holderEmail", "unitPhone", "holderPhone"]) {
    assert.equal(Object.hasOwn(profile, field), false, field);
  }
});
