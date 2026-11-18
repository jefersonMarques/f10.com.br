import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyBrazilianDocument } from "../scripts/lib/brazilianDocumentValidation.mjs";
import {
  classifySchoolCandidates,
  normalizedSchoolName,
  schoolNameCandidates,
} from "../scripts/lib/schoolCandidateMatcher.mjs";

test("validates CPF and CNPJ check digits rather than document length alone", () => {
  assert.equal(classifyBrazilianDocument("529.982.247-25").kind, "cpf");
  assert.equal(classifyBrazilianDocument("11.222.333/0001-81").kind, "cnpj");
  assert.equal(classifyBrazilianDocument("529.982.247-26").kind, "invalid");
  assert.equal(classifyBrazilianDocument("11.222.333/0001-82").kind, "invalid");
  assert.equal(classifyBrazilianDocument("000.000.000-00").kind, "invalid");
  assert.equal(classifyBrazilianDocument("11.111.111/1111-11").kind, "invalid");
  assert.equal(classifyBrazilianDocument(null).kind, "missing");
  assert.equal(classifyBrazilianDocument("document 52998224725").kind, "invalid");
});

test("classifies the same school with multiple contracts as one school candidate", () => {
  const units = [
    {
      id: "unit-a",
      name: "Escola São Miguel",
      apelido: null,
      organizationName: "São Miguel",
      organizationId: "school-a",
    },
    {
      id: "unit-b",
      name: "Escola São Miguel",
      apelido: null,
      organizationName: "São Miguel",
      organizationId: "school-a",
    },
  ];
  const matches = schoolNameCandidates(units, "Escola Sao Miguel");
  assert.equal(matches.length, 2);
  assert.equal(classifySchoolCandidates(matches), "unique_name_candidate");
});

test("does not collapse distinct organizations with identical school names", () => {
  const units = [
    {
      name: "Escola Modelo",
      organizationName: "Escola Modelo",
      organizationId: "school-a",
    },
    {
      name: "Escola Modelo",
      organizationName: "Escola Modelo",
      organizationId: "school-b",
    },
  ];
  assert.equal(
    classifySchoolCandidates(schoolNameCandidates(units, "escola modelo")),
    "ambiguous_name_candidate",
  );
  assert.equal(classifySchoolCandidates([]), "unmatched");
  assert.equal(normalizedSchoolName("Escola São  Miguel"), "escola sao miguel");
});

test("auditor never grants contract rights or rewrites imported tickets", () => {
  const script = readFileSync(
    "scripts/audit-exact-school-identity-relationships.mjs", "utf8",
  );
  assert.match(script, /SET TRANSACTION READ ONLY/);
  assert.match(script, /statement_timeout/);
  assert.match(script, /definitiveUnitIdMatches: null/);
  assert.match(script, /customer_units has no stored legacy login unidade_id/);
  assert.match(script, /permissionsChanged: 0/);
  assert.match(script, /ticketsChanged: 0/);
  assert.doesNotMatch(
    script,
    /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP)\s+(?:INTO|TABLE|FROM|customer|ticket|f10_)/i,
  );
});
