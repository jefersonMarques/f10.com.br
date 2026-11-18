import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  summarizeApiObject,
  summarizeContractPage,
} from "../scripts/lib/f10ApiKeyEvidence.mjs";

test("describes allowlisted identifiers without exposing API record values", () => {
  const document = "11.222.333/0001-81";
  const sample = {
    contrato_id: 456789,
    pessoa_id: 99182,
    titular_id: 99183,
    unidade_id: 1,
    schema: "secret_customer_schema",
    cpf_cnpj: document,
    nome: "Private Name",
    token: "PRIVATE_ACCESS_TOKEN",
    senha: "PRIVATE_PASSWORD",
    email: "private@example.com",
    dados_financeiros: { sensitive: "PRIVATE_BANK_ACCOUNT" },
  };
  const result = summarizeApiObject(sample);
  const serialized = JSON.stringify(result);

  assert.equal(result.structureValid, true);
  assert.equal(result.documentKind, "cnpj");
  for (const item of ["PRIVATE_ACCESS_TOKEN", "PRIVATE_PASSWORD", "Private Name",
    "secret_customer_schema", "private@example.com", document, "PRIVATE_BANK_ACCOUNT",
    "456789", "99182"]) {
    assert.equal(serialized.includes(item), false);
  }
  assert.deepEqual(result.identifierFields, [
    { field: "contrato_id", type: "number" },
    { field: "pessoa_id", type: "number" },
    { field: "titular_id", type: "number" },
    { field: "unidade_id", type: "number" },
    { field: "schema", type: "string" },
    { field: "cpf_cnpj", type: "string" },
    { field: "nome", type: "string" },
  ]);
});

test("reports first page counts but never copies contracts", () => {
  const page = summarizeContractPage([
    { contrato_id: 10, pessoa_id: 20, conta_bancaria: "SECRET_BANK" },
    { contrato_id: 11, titular_id: 21, acesso: "SECRET_ACCESS" },
  ]);
  assert.equal(page.firstPageOnly, true);
  assert.equal(page.contractsOnFirstPage, 2);
  assert.deepEqual(page.fields, [
    { field: "contrato_id", records: 2 },
    { field: "pessoa_id", records: 1 },
    { field: "titular_id", records: 1 },
  ]);
  assert.doesNotMatch(JSON.stringify(page), /SECRET_BANK|SECRET_ACCESS/);
  assert.throws(() => summarizeContractPage({ results: [] }), /F10_CONTRACT_PAGE_INVALID/);
});

test("live API audit uses only existing GET endpoints and read-only database queries", () => {
  const script = readFileSync("scripts/inspect-f10-live-identity-keys.mjs", "utf8");
  assert.match(script, /SET TRANSACTION READ ONLY/);
  assert.match(script, /statement_timeout/);
  assert.match(script, /const API_BASE_URL = "https:\/\/api\.f10\.com\.br"/);
  assert.match(script, /method: "GET"/);
  assert.match(script, /officialLoginSchoolCrosswalkVerified: false/);
  assert.match(script, /permissionsChanged: 0/);
  assert.match(script, /ticketsChanged: 0/);
  assert.doesNotMatch(script, /\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP)\s+(?:INTO|TABLE|FROM|customer|ticket|f10_)/i);
});
