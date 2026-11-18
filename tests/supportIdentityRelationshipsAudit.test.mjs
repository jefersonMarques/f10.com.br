import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script = readFileSync("scripts/audit-support-identity-relationships.mjs", "utf8");

test("offers three independent, read-only relationship audits", () => {
  assert.match(script, /new Set\(\["login", "manual", "movidesk"\]\)/);
  assert.match(script, /SET TRANSACTION READ ONLY/);
  assert.match(script, /statement_timeout/);
  assert.doesNotMatch(script, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP)\s+(?:INTO|TABLE|FROM|customer|ticket|f10_)/i);
});

test("treats school groups as candidates rather than contract entitlements", () => {
  assert.match(script, /possibleGroupContracts/);
  assert.match(script, /assignedAndAuthorizedContracts/);
  assert.match(script, /assignedSchoolsNotInLoginGroup/);
  assert.match(script, /not proof of contract authorization/);
});

test("reports company/person document lengths without disclosing documents", () => {
  assert.match(script, /f10_customer_holder_profiles/);
  assert.match(script, /length\(digits\) = 11/);
  assert.match(script, /length\(digits\) = 14/);
  assert.doesNotMatch(script, /console\.log\([^)]*(?:email|document|cpf|cnpj)/i);
});

test("counts historical email evidence without changing imported tickets", () => {
  assert.match(script, /sourceAuthorEmail/);
  assert.match(script, /import_source = 'movidesk'/);
  assert.match(script, /multiple_contact_candidates/);
  assert.match(script, /Historical email evidence is unverified/);
});
