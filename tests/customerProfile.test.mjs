import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCustomerProfileName, needsCustomerNameConfirmation } from "../src/lib/support/customerProfile.ts";

test("placeholder names require confirmation, imported names remain intact", () => {
  assert.equal(needsCustomerNameConfirmation("Cliente F10", "ana@example.com"), true);
  assert.equal(needsCustomerNameConfirmation("ana", "ana@example.com"), true);
  assert.equal(needsCustomerNameConfirmation("Ana Silva", "ana@example.com"), false);
  assert.equal(needsCustomerNameConfirmation("ana", "ana@example.com", true), false);
});

test("customer names are normalized and invalid values rejected", () => {
  assert.equal(normalizeCustomerProfileName("  Ana   Silva  "), "Ana Silva");
  assert.equal(normalizeCustomerProfileName("João"), "João");
  assert.equal(normalizeCustomerProfileName("123"), null);
  assert.equal(normalizeCustomerProfileName("ana@example.com"), null);
  assert.equal(normalizeCustomerProfileName("A"), null);
});
